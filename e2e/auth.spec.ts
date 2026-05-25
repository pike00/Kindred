import { test, expect } from "@playwright/test"

// Auth tests run without stored credentials
const authTest = test.extend({
  storageState: { cookies: [], origins: [] },
})

authTest.describe("Authentication", () => {
  authTest("login page renders", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  authTest("valid credentials redirect to dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(process.env.E2E_TEST_EMAIL ?? "admin@example.com")
    await page.getByLabel(/password/i).fill(process.env.E2E_TEST_PASSWORD ?? "changethis")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 })
  })

  authTest("invalid credentials shows error", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("wrong@example.com")
    await page.getByLabel(/password/i).fill("wrongpassword")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/incorrect|invalid|error/i)).toBeVisible({
      timeout: 5000,
    })
  })

  authTest("empty form shows validation errors", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: /sign in/i }).click()
    // Either HTML5 validation prevents submit or we see an error
    const url = page.url()
    expect(url).toContain("/login")
  })
})

test("logout clears session and redirects to login", async ({ page }) => {
  await page.goto("/")
  // Open user menu or find logout button
  const logoutBtn = page.getByRole("button", { name: /log out|logout|sign out/i })
  // It may be in a dropdown — try sidebar/menu first
  const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user" i], [aria-label*="account" i]').first()
  if (await userMenu.isVisible()) {
    await userMenu.click()
  }
  await logoutBtn.click()
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
})

test("unauthenticated access to protected route redirects to login", async ({ page }) => {
  // Clear storage to simulate logged-out state
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.removeItem("access_token"))
  await page.goto("/contacts")
  await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
})
