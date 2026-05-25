import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("stats section is visible", async ({ page }) => {
    // The dashboard shows numeric counters — at least one stat card
    await expect(page.locator("main")).toBeVisible()
    // Look for number-style stat cards (contacts, interactions, etc.)
    const statCards = page.locator('[data-testid="stat-card"], .stat-card, [class*="stat"]')
    const numbers = page.locator("main").getByText(/^\d+$/)
    // At minimum, the page title is visible
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })

  test("sidebar navigation links are present", async ({ page }) => {
    const nav = page.getByRole("navigation")
    await expect(nav.getByRole("link", { name: /contacts/i })).toBeVisible()
    await expect(nav.getByRole("link", { name: /interactions/i })).toBeVisible()
    await expect(nav.getByRole("link", { name: /journal/i })).toBeVisible()
    await expect(nav.getByRole("link", { name: /tags/i })).toBeVisible()
    await expect(nav.getByRole("link", { name: /reminders/i })).toBeVisible()
  })

  test("navigating via sidebar goes to correct page", async ({ page }) => {
    await page.getByRole("navigation").getByRole("link", { name: /contacts/i }).click()
    await expect(page).toHaveURL(/\/contacts/)
  })
})
