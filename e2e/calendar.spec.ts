import { test, expect } from "@playwright/test"

test.describe("Calendar", () => {
  test("route renders without error", async ({ page }) => {
    await page.goto("/calendar")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
  })

  test("month grid is visible", async ({ page }) => {
    await page.goto("/calendar")
    // Calendar should show month name and day grid
    const monthNames = /january|february|march|april|may|june|july|august|september|october|november|december/i
    await expect(page.getByText(monthNames)).toBeVisible({ timeout: 5000 })
  })

  test("previous/next navigation changes the displayed month", async ({ page }) => {
    await page.goto("/calendar")
    const monthNames = /january|february|march|april|may|june|july|august|september|october|november|december/i
    await expect(page.getByText(monthNames)).toBeVisible({ timeout: 5000 })

    const initialMonth = await page.getByText(monthNames).first().textContent()

    // Click next month button
    const nextBtn = page.getByRole("button", { name: /next|forward|>/i }).or(
      page.locator('[aria-label*="next" i], [aria-label*="forward" i]')
    ).first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      const newMonth = await page.getByText(monthNames).first().textContent()
      // Month should have changed
      expect(newMonth).not.toBe(initialMonth)
    }
  })
})
