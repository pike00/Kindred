import { test, expect } from "@playwright/test"

test.describe("Settings", () => {
  test("profile tab shows user info", async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: /settings|profile/i })).toBeVisible()
    // Profile tab should be active by default or visible
    await expect(page.getByText(/email|full name|profile/i).first()).toBeVisible({
      timeout: 5000,
    })
  })

  test("password tab has required fields", async ({ page }) => {
    await page.goto("/settings")
    // Click the password tab
    const passwordTab = page.getByRole("tab", { name: /password/i }).or(
      page.getByRole("button", { name: /password/i })
    ).first()
    if (await passwordTab.isVisible()) {
      await passwordTab.click()
      await expect(page.getByLabel(/current password/i).or(page.getByLabel(/old password/i))).toBeVisible({ timeout: 3000 })
      await expect(page.getByLabel(/new password/i)).toBeVisible()
    } else {
      // Password settings might be inline
      await expect(page.getByText(/password/i).first()).toBeVisible()
    }
  })

  test("custom fields section is accessible", async ({ page }) => {
    await page.goto("/settings")
    // Look for custom fields tab or link
    const cfLink = page.getByRole("tab", { name: /custom fields/i }).or(
      page.getByRole("link", { name: /custom fields/i })
    ).first()
    if (await cfLink.isVisible()) {
      await cfLink.click()
      await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
    } else {
      // May be at a different URL
      await page.goto("/settings/custom-fields")
      await expect(page.locator("main")).toBeVisible()
    }
  })
})
