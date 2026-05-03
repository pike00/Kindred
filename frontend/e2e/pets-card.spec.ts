import { test, expect } from "@playwright/test";
import {
  getAuthToken,
  createContact,
  cleanupContacts,
  loginViaUI,
  testId,
  clickAddInCard,
  clickDialogSave,
  fillFieldByLabel,
  clickRowAction,
} from "./helpers";

test.describe("PetsCard", () => {
  let token: string;
  let contactId: string;
  const firstName = `E2EPet${testId()}`;
  const lastName = "Test";

  test.beforeAll(async () => {
    token = await getAuthToken();
    await cleanupContacts(token);
    const contact = await createContact(token, firstName, lastName);
    contactId = contact.id;
  });

  test.afterAll(async () => {
    await cleanupContacts(token);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto(`/contacts/${contactId}`);
    await page.waitForLoadState("networkidle");
  });

  test("add pet", async ({ page }) => {
    // Click Add in Pets card
    await clickAddInCard(page, "Pets");

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill pet fields
    await fillFieldByLabel(page, "Name", "Biscuit");
    await fillFieldByLabel(page, "Species", "Dog");
    await fillFieldByLabel(page, "Breed", "Border Collie");
    await fillFieldByLabel(page, "Notes", "Loves playing fetch");

    // Save
    await clickDialogSave(page);

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify pet appears in the card
    await expect(page.getByText("Biscuit")).toBeVisible();
    await expect(page.getByText("Border Collie")).toBeVisible();
  });

  test("edit pet", async ({ page }) => {
    // Click edit on the pet row
    await clickRowAction(page, "Pets", "Edit");

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Update name
    const nameInput = dialog.getByLabel("Name");
    await nameInput.clear();
    await nameInput.fill("Biscuit Jr.");

    // Save
    await clickDialogSave(page);

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify updated name appears
    await expect(page.getByText("Biscuit Jr.")).toBeVisible();
  });

  test("delete pet", async ({ page }) => {
    // Click delete on the pet row
    await clickRowAction(page, "Pets", "Delete");

    // Handle confirmation
    await page.waitForTimeout(500);
    if (await page.getByText("Delete this pet?").isVisible()) {
      await page.getByRole("button", { name: /confirm|yes|delete/i }).click();
    }

    // Wait for deletion
    await page.waitForTimeout(2000);

    // Verify pet is removed
    await expect(page.getByText("Biscuit Jr.")).not.toBeVisible();
  });
});
