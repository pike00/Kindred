import { test, expect } from "./fixtures"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("greeting heading is visible", async ({ page }) => {
    // Dashboard suspends on multiple queries; wait for the page to settle.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /good (morning|afternoon|evening)/i,
      }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("stats row lists contacts/losing-touch/reminders/entries", async ({
    page,
  }) => {
    const main = page.locator("main.flex-1")
    await expect(main.getByText(/contacts/i).first()).toBeVisible()
    await expect(main.getByText(/losing touch/i).first()).toBeVisible()
    await expect(main.getByText(/reminders/i).first()).toBeVisible()
    await expect(main.getByText(/entries/i).first()).toBeVisible()
  })

  test("losing-touch section header is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /losing touch/i }).first(),
    ).toBeVisible()
  })

  test("recent-interactions section header is visible", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /recent interactions/i }),
    ).toBeVisible()
  })

  test("sidebar exposes every primary nav link", async ({ page }) => {
    const sidebar = page.locator('[data-slot="sidebar"]').first()
    for (const label of [
      /dashboard/i,
      /contacts/i,
      /interactions/i,
      /tags/i,
      /graph/i,
      /reminders/i,
      /calendar/i,
      /gift kanban/i,
      /journal/i,
    ]) {
      await expect(
        sidebar.getByRole("link", { name: label }).first(),
      ).toBeVisible()
    }
  })

  test("sidebar user menu links to settings and logout", async ({ page }) => {
    // The User block lives in the sidebar footer; clicking the trigger opens
    // a dropdown menu with "User Settings" and "Log out" items.
    const sidebar = page.locator('[data-slot="sidebar"]').first()
    await sidebar
      .getByRole("button", { name: /admin@example\.com|account|user/i })
      .first()
      .click()
    await expect(page.getByRole("menuitem", { name: /settings/i })).toBeVisible()
    await expect(page.getByRole("menuitem", { name: /log out|sign out/i })).toBeVisible()
  })

  test("clicking a sidebar link navigates to that route", async ({ page }) => {
    await page
      .locator('[data-slot="sidebar"]')
      .first()
      .getByRole("link", { name: /contacts/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/contacts/)
  })

  test("header shows the command-palette search trigger", async ({ page }) => {
    const trigger = page.getByRole("button", { name: /open command palette/i })
    await expect(trigger).toBeVisible()
    await expect(trigger).toContainText(/k/i)
  })
})
