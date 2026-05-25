import { test, expect } from "@playwright/test"

test.describe("Admin", () => {
  test("admin panel loads", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
  })

  test("admin shows user management content", async ({ page }) => {
    await page.goto("/admin")
    // Admin page shows user list or user management heading
    await expect(
      page.getByRole("heading", { name: /users|admin|management/i }).or(
        page.getByText(/users|email|superuser/i).first()
      )
    ).toBeVisible({ timeout: 5000 })
  })

  test("import/export page loads", async ({ page }) => {
    await page.goto("/admin/import-export")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
    await expect(
      page.getByText(/import|export|vcard|csv/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test("webhooks page loads", async ({ page }) => {
    await page.goto("/admin/webhooks")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
    await expect(
      page.getByText(/webhook/i).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test("vcard conflicts page loads", async ({ page }) => {
    await page.goto("/admin/vcard-conflicts")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
  })
})
