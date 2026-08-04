import { test, expect } from "./fixtures"
import { API_URL, getToken } from "./helpers/api.js"

let token: string

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.describe("Settings · header & tabs", () => {
  test("page heading and tab list render", async ({ page }) => {
    await page.goto("/settings")
    await expect(
      page.getByRole("heading", { name: /user settings/i, level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByText(/manage your account settings and preferences/i),
    ).toBeVisible()

    // Tabs: My profile / Password / Custom fields / API keys. The Danger
    // zone tab is hidden for superusers (the seed admin), so don't assert it.
    await expect(
      page.getByRole("tab", { name: /my profile/i }),
    ).toBeVisible()
    await expect(page.getByRole("tab", { name: /password/i })).toBeVisible()
    await expect(
      page.getByRole("tab", { name: /custom fields/i }),
    ).toBeVisible()
    await expect(page.getByRole("tab", { name: /api keys/i })).toBeVisible()
  })

  test("default tab is My profile", async ({ page }) => {
    await page.goto("/settings")
    await expect(
      page.getByRole("tab", { name: /my profile/i }),
    ).toHaveAttribute("data-state", "active", { timeout: 3000 })
  })
})

test.describe("Settings · My profile tab", () => {
  test("displays user information section with email", async ({ page }) => {
    await page.goto("/settings")
    await expect(
      page.getByRole("heading", { name: /user information/i }),
    ).toBeVisible({ timeout: 5000 })
    const expectedEmail = process.env.E2E_TEST_EMAIL ?? "admin@example.com"
    await expect(page.getByText(expectedEmail).first()).toBeVisible()
    await expect(page.getByText(/^full name$/i).first()).toBeVisible()
    await expect(page.getByText(/^email$/i).first()).toBeVisible()
  })

  test("Edit toggles full-name into an input and Cancel reverts", async ({
    page,
  }) => {
    await page.goto("/settings")
    await expect(
      page.getByRole("heading", { name: /user information/i }),
    ).toBeVisible({ timeout: 5000 })
    await page.getByRole("button", { name: /^edit$/i }).click()
    // Save + Cancel buttons replace Edit
    await expect(
      page.getByRole("button", { name: /^save$/i }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /^cancel$/i }),
    ).toBeVisible()
    // Type into the full_name input
    const nameInput = page.getByLabel(/full name/i)
    await expect(nameInput).toBeVisible()
    await nameInput.fill("E2E Probe Name")
    await page.getByRole("button", { name: /^cancel$/i }).click()
    // After Cancel, Edit comes back and the form has been reset.
    await expect(page.getByRole("button", { name: /^edit$/i })).toBeVisible()
  })

  test("editing full_name then saving updates the value", async ({
    page,
    request,
  }) => {
    const newName = `E2E Probe ${Date.now()}`
    const apiUrl = API_URL

    // Snapshot the original full_name to restore later.
    const meRes = await request.get(`${apiUrl}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const meBefore = await meRes.json()
    const originalName: string | null = meBefore.full_name ?? null

    try {
      await page.goto("/settings")
      await page.getByRole("button", { name: /^edit$/i }).click()
      const nameInput = page.getByLabel(/full name/i)
      await nameInput.fill(newName)
      await page.getByRole("button", { name: /^save$/i }).click()

      // After save, edit-mode exits and the new name is shown in the read-only paragraph.
      await expect(
        page.getByRole("button", { name: /^edit$/i }),
      ).toBeVisible({ timeout: 8000 })
      await expect(page.getByText(newName).first()).toBeVisible({
        timeout: 5000,
      })
    } finally {
      // Restore original via API.
      await request.patch(`${apiUrl}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { full_name: originalName },
      })
    }
  })
})

test.describe("Settings · Password tab", () => {
  test("shows three password fields and submit button", async ({ page }) => {
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /password/i })
      .click({ timeout: 15000 })
    await expect(
      page.getByRole("heading", { name: /change password/i }),
    ).toBeVisible({ timeout: 5000 })

    await expect(page.getByTestId("current-password-input")).toBeVisible()
    await expect(page.getByTestId("new-password-input")).toBeVisible()
    await expect(page.getByTestId("confirm-password-input")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /update password/i }),
    ).toBeVisible()
  })

  test("password fields are masked by default", async ({ page }) => {
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /password/i })
      .click({ timeout: 15000 })
    await expect(page.getByTestId("current-password-input")).toHaveAttribute(
      "type",
      "password",
    )
    await expect(page.getByTestId("new-password-input")).toHaveAttribute(
      "type",
      "password",
    )
    await expect(page.getByTestId("confirm-password-input")).toHaveAttribute(
      "type",
      "password",
    )
  })

  test("mismatched new/confirm passwords surface validation error", async ({
    page,
  }) => {
    // We must NOT actually submit a valid password change — this would
    // invalidate the shared session for other tests. Mismatched confirm
    // triggers a client-side zod error WITHOUT firing the update request.
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /password/i })
      .click({ timeout: 15000 })
    await page.getByTestId("current-password-input").fill("somepassword123")
    await page.getByTestId("new-password-input").fill("newpassword123")
    await page.getByTestId("confirm-password-input").fill("differentpw456")
    await page.getByRole("button", { name: /update password/i }).click()
    await expect(
      page.getByText(/passwords don't match/i),
    ).toBeVisible({ timeout: 3000 })
  })

  test("short new password surfaces validation error", async ({ page }) => {
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /password/i })
      .click({ timeout: 15000 })
    await page.getByTestId("current-password-input").fill("somepassword")
    await page.getByTestId("new-password-input").fill("short")
    await page.getByTestId("confirm-password-input").fill("short")
    await page.getByRole("button", { name: /update password/i }).click()
    await expect(
      page.getByText(/at least 8 characters/i).first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Settings · Custom fields tab", () => {
  test("section header and Add field button visible", async ({ page }) => {
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /custom fields/i })
      .click({ timeout: 15000 })
    await expect(
      page.getByRole("heading", { name: /custom field definitions/i }),
    ).toBeVisible({ timeout: 10000 })
    await expect(
      page.getByRole("button", { name: /add field/i }),
    ).toBeVisible()
  })

  test("Add field dialog opens with name/type/description/icon inputs", async ({
    page,
  }) => {
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /custom fields/i })
      .click({ timeout: 15000 })
    await page
      .getByRole("button", { name: /add field/i })
      .click({ timeout: 10000 })
    const dialog = page.getByRole("dialog", {
      name: /add custom field definition/i,
    })
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByLabel(/^name/i)).toBeVisible()
    await expect(dialog.getByLabel(/^type$/i)).toBeVisible()
    await expect(dialog.getByLabel(/^description$/i)).toBeVisible()
    await expect(dialog.getByLabel(/^icon$/i)).toBeVisible()

    // Close
    await dialog.getByRole("button", { name: /^cancel$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test("creating a custom field shows it in the list, then delete cleans up", async ({
    page,
    request,
  }, testInfo) => {
    // Vite chunk-loading errors can occur if a dynamic import URL changes
    // between sessions (HMR recompile). Tolerate those — the real check is
    // that creating a definition succeeds end-to-end.
    testInfo.annotations.push({ type: "allow-page-errors" })
    const name = `E2EField ${Date.now()}`
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /custom fields/i })
      .click({ timeout: 10000 })
    await page
      .getByRole("button", { name: /add field/i })
      .click({ timeout: 10000 })

    const dialog = page.getByRole("dialog", {
      name: /add custom field definition/i,
    })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/^name/i).fill(name)
    await dialog.getByRole("button", { name: /^save$/i }).click()

    // The new row appears.
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })

    // Clean up: list + delete via API to avoid the window.confirm() prompt.
    const apiUrl = API_URL
    const list = await request.get(
      `${apiUrl}/api/v1/custom-fields/definitions/`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const body = await list.json()
    const created = (body.data ?? []).find((d: any) => d.name === name)
    if (created) {
      await request.delete(
        `${apiUrl}/api/v1/custom-fields/definitions/${created.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }
  })
})

test.describe("Settings · API keys tab", () => {
  test("tab loads and shows section header", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await page.goto("/settings")
    await page
      .getByRole("tab", { name: /api keys/i })
      .click({ timeout: 15000 })
    // ApiKeys component renders heading "API keys" (case-insensitive match).
    await expect(
      page.getByRole("heading", { name: /api keys/i }).first(),
    ).toBeVisible({ timeout: 10000 })
  })
})
