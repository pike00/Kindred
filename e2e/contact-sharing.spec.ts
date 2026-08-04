import { expect, test } from "./fixtures";
import {
	API_URL,
	createContact,
	createInteraction,
	deleteContact,
	deleteInteraction,
	getToken,
} from "./helpers/api.js";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

function authHeaders(token: string) {
	return { Authorization: `Bearer ${token}` };
}

function storageStateForToken(token: string) {
	return {
		cookies: [],
		origins: [
			{
				origin: BASE_URL,
				localStorage: [{ name: "access_token", value: token }],
			},
		],
	};
}

async function signupUser(
	request: import("@playwright/test").APIRequestContext,
	email: string,
	password: string,
) {
	const res = await request.post(`${API_URL}/api/v1/users/signup`, {
		data: {
			email,
			password,
			full_name: "Contact Share Recipient",
		},
	});
	if (!res.ok()) {
		throw new Error(`signupUser failed ${res.status()}: ${await res.text()}`);
	}
	return res.json() as Promise<{ id: string; email: string }>;
}

test.describe("Contact sharing", () => {
	test("owner can grant, recipient can use shared access, and revocation removes visibility without deleting rows", async ({
		page,
		browser,
		request,
	}) => {
		const ownerToken = await getToken(request);
		const ts = Date.now();
		const recipientEmail = `contact-share-recipient+${ts}@example.com`;
		const recipientPassword = `SharePass${ts}`;

		const recipientUser = await signupUser(
			request,
			recipientEmail,
			recipientPassword,
		);
		// Re-login with recipient credentials because the shared helper is pinned
		// to the seeded admin account.
		const recipientLogin = await request.post(
			`${API_URL}/api/v1/login/access-token`,
			{
				form: {
					username: recipientEmail,
					password: recipientPassword,
				},
			},
		);
		if (!recipientLogin.ok()) {
			throw new Error(
				`recipient login failed ${recipientLogin.status()}: ${await recipientLogin.text()}`,
			);
		}
		const { access_token: recipientAccessToken } =
			(await recipientLogin.json()) as {
				access_token: string;
			};

		const ownerContact = (await createContact(request, ownerToken, {
			first_name: `AAASharedExisting${ts}`,
			last_name: "Owner",
		})) as { id: string; first_name: string; last_name?: string };
		const futureContactName = `AAASharedFuture${ts}`;
		const privateAttendee = (await createContact(request, ownerToken, {
			first_name: `AAAPrivateAttendee${ts}`,
			last_name: "Hidden",
		})) as { id: string; first_name: string };
		const mixedInteractionNote = `Mixed attendee contact-share ${ts}`;

		const mixedInteraction = (await createInteraction(request, ownerToken, {
			attendee_ids: [ownerContact.id, privateAttendee.id],
			channel: "call",
			notes: mixedInteractionNote,
		})) as { id: string };

		let futureContactId: string | null = null;
		const recipientContext = await browser.newContext({
			baseURL: BASE_URL,
			storageState: storageStateForToken(recipientAccessToken),
		});
		const recipientPage = await recipientContext.newPage();

		try {
			await page.goto("/settings");
			await page.getByRole("tab", { name: /^sharing$/i }).click();
			await expect(
				page.getByRole("heading", { name: /contact sharing/i }),
			).toBeVisible({ timeout: 10_000 });
			await page.getByRole("button", { name: /share all contacts/i }).click();

			const dialog = page.getByRole("dialog", { name: /share all contacts/i });
			await expect(dialog).toBeVisible();
			await dialog.getByLabel(/recipient email/i).fill(recipientEmail);
			await dialog
				.getByText(/I understand this grants read and write access/i)
				.click();
			await dialog
				.getByRole("button", { name: /^share all contacts$/i })
				.click();

			const activeShareRow = page.getByTestId(
				`contact-share-row-${recipientUser.id}`,
			);
			await expect(activeShareRow).toBeVisible({ timeout: 10_000 });
			await expect(
				activeShareRow.getByRole("button", { name: /revoke access/i }),
			).toBeVisible();

			await recipientPage.goto("/contacts");
			await expect(
				recipientPage.getByRole("heading", { name: /^contacts$/i }),
			).toBeVisible({ timeout: 10_000 });
			await expect(
				recipientPage.getByText(ownerContact.first_name),
			).toBeVisible({
				timeout: 10_000,
			});

			await recipientPage.goto("/interactions");
			await expect(
				recipientPage.getByRole("heading", { name: /^interactions$/i }),
			).toBeVisible({ timeout: 10_000 });
			const mixedCard = recipientPage
				.locator('[data-slot="card"]')
				.filter({ hasText: mixedInteractionNote })
				.first();
			await expect(mixedCard).toBeVisible({ timeout: 10_000 });
			await expect(mixedCard.getByText(ownerContact.first_name)).toBeVisible();
			await expect(mixedCard.getByText(privateAttendee.first_name)).toHaveCount(
				0,
			);

			const recipientInteractionsRes = await request.get(
				`${API_URL}/api/v1/interactions/?limit=100`,
				{ headers: authHeaders(recipientAccessToken) },
			);
			expect(recipientInteractionsRes.ok()).toBeTruthy();
			const recipientInteractions = (await recipientInteractionsRes.json()) as {
				data: Array<{
					id: string;
					notes?: string | null;
					attendees?: Array<{ id: string; first_name: string }>;
				}>;
			};
			const mixedInteractionForRecipient = recipientInteractions.data.find(
				(item) => item.id === mixedInteraction.id,
			);
			expect(mixedInteractionForRecipient?.attendees?.map((a) => a.id)).toEqual(
				[ownerContact.id],
			);

			const futureContact = (await createContact(request, ownerToken, {
				first_name: futureContactName,
				last_name: "Owner",
			})) as { id: string; first_name: string };
			futureContactId = futureContact.id;

			await recipientPage.goto("/contacts");
			await expect(recipientPage.getByText(futureContactName)).toBeVisible({
				timeout: 10_000,
			});

			const editedFirstName = `AAASharedEdited${ts}`;
			await recipientPage.goto(`/contacts/${ownerContact.id}`);
			await expect(
				recipientPage.getByRole("heading", {
					name: new RegExp(ownerContact.first_name, "i"),
					level: 1,
				}),
			).toBeVisible({ timeout: 10_000 });
			await recipientPage
				.getByRole("button", { name: /^edit$/i, exact: false })
				.first()
				.click();
			const editDialog = recipientPage.getByRole("dialog", {
				name: /edit contact/i,
			});
			await expect(editDialog).toBeVisible();
			await editDialog.getByLabel(/first name/i).fill(editedFirstName);
			await editDialog.getByRole("button", { name: /update contact/i }).click();
			await expect(editDialog).not.toBeVisible({ timeout: 10_000 });
			await expect(
				recipientPage.getByRole("heading", {
					name: new RegExp(editedFirstName, "i"),
					level: 1,
				}),
			).toBeVisible({ timeout: 10_000 });

			await page.goto(`/contacts/${ownerContact.id}`);
			await expect(
				page.getByRole("heading", {
					name: new RegExp(editedFirstName, "i"),
					level: 1,
				}),
			).toBeVisible({ timeout: 10_000 });

			await page.goto("/settings");
			await page.getByRole("tab", { name: /^sharing$/i }).click();
			const shareRow = page.getByTestId(
				`contact-share-row-${recipientUser.id}`,
			);
			await expect(page.getByText(recipientEmail)).toBeVisible();
			await shareRow.getByRole("button", { name: /revoke access/i }).click();
			const revokeDialog = page.getByRole("alertdialog");
			await expect(revokeDialog).toBeVisible();
			await revokeDialog
				.getByRole("button", { name: /revoke access/i })
				.click();
			await expect(page.getByText(recipientEmail)).toHaveCount(0, {
				timeout: 10_000,
			});

			const ownerContactRes = await request.get(
				`${API_URL}/api/v1/contacts/${ownerContact.id}`,
				{ headers: authHeaders(ownerToken) },
			);
			expect(ownerContactRes.ok()).toBeTruthy();
			const ownerFutureRes = await request.get(
				`${API_URL}/api/v1/contacts/${futureContact.id}`,
				{ headers: authHeaders(ownerToken) },
			);
			expect(ownerFutureRes.ok()).toBeTruthy();
			const ownerInteractionsRes = await request.get(
				`${API_URL}/api/v1/interactions/?limit=100`,
				{ headers: authHeaders(ownerToken) },
			);
			expect(ownerInteractionsRes.ok()).toBeTruthy();
			const ownerInteractions = (await ownerInteractionsRes.json()) as {
				data: Array<{
					id: string;
					notes?: string | null;
					attendees?: Array<{ id: string }>;
				}>;
			};
			const ownerMixedInteraction = ownerInteractions.data.find(
				(item) => item.id === mixedInteraction.id,
			);
			expect(ownerMixedInteraction).toBeDefined();
			expect(
				ownerMixedInteraction?.attendees?.map((attendee) => attendee.id),
			).toEqual(expect.arrayContaining([ownerContact.id, privateAttendee.id]));

			const recipientSharedAfterRevoke = await request.get(
				`${API_URL}/api/v1/contacts/${ownerContact.id}`,
				{ headers: authHeaders(recipientAccessToken) },
			);
			expect(recipientSharedAfterRevoke.status()).toBe(404);
			const recipientFutureAfterRevoke = await request.get(
				`${API_URL}/api/v1/contacts/${futureContact.id}`,
				{ headers: authHeaders(recipientAccessToken) },
			);
			expect(recipientFutureAfterRevoke.status()).toBe(404);

			const recipientInteractionsAfterRevokeRes = await request.get(
				`${API_URL}/api/v1/interactions/?limit=100`,
				{ headers: authHeaders(recipientAccessToken) },
			);
			expect(recipientInteractionsAfterRevokeRes.ok()).toBeTruthy();
			const recipientInteractionsAfterRevoke =
				(await recipientInteractionsAfterRevokeRes.json()) as {
					data: Array<{ id: string; notes?: string | null }>;
				};
			expect(
				recipientInteractionsAfterRevoke.data.some(
					(item) => item.id === mixedInteraction.id,
				),
			).toBe(false);

			await recipientPage.goto("/contacts");
			await expect(recipientPage.getByText(editedFirstName)).toHaveCount(0);
			await expect(recipientPage.getByText(futureContactName)).toHaveCount(0);

			await recipientPage.goto("/interactions");
			await expect(recipientPage.getByText(mixedInteractionNote)).toHaveCount(
				0,
			);
		} finally {
			await recipientContext
				.close()
				.catch((error) =>
					console.warn("Failed to close recipient context", error),
				);
			if (futureContactId) {
				await deleteContact(request, ownerToken, futureContactId).catch(
					(error) => console.warn("Failed to clean up future contact", error),
				);
			}
			await deleteInteraction(request, ownerToken, mixedInteraction.id).catch(
				(error) => console.warn("Failed to clean up mixed interaction", error),
			);
			await deleteContact(request, ownerToken, privateAttendee.id).catch(
				(error) => console.warn("Failed to clean up private attendee", error),
			);
			await deleteContact(request, ownerToken, ownerContact.id).catch((error) =>
				console.warn("Failed to clean up owner contact", error),
			);
			await request
				.delete(`${API_URL}/api/v1/users/${recipientUser.id}`, {
					headers: authHeaders(ownerToken),
				})
				.catch((error) =>
					console.warn("Failed to clean up recipient user", error),
				);
		}
	});
});
