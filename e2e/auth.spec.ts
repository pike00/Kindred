import type { Locator, Page } from "@playwright/test"
import { test, expect } from "./fixtures"

// Most auth tests run WITHOUT stored credentials.
const authTest = test.extend({
  storageState: { cookies: [], origins: [] },
})

// The deployed dev SPA can take 5–15s to hydrate on a cold route load,
// especially when several specs hit it in parallel. Bump the per-test
// timeout so a single slow render doesn't trip the default 30s.
test.beforeEach(({}, info) => info.setTimeout(60_000))
authTest.beforeEach(({}, info) => info.setTimeout(60_000))

// Retries are opt-in through E2E_RETRIES so the pre-push gate cannot hide a
// first-attempt regression. Set it explicitly when diagnosing cold-start
// flakes in a local run.
const e2eRetries = Math.max(0, Number.parseInt(process.env.E2E_RETRIES ?? "0", 10) || 0)
test.describe.configure({ retries: e2eRetries })
authTest.describe.configure({ retries: e2eRetries })

/**
 * Auth-form pages are SPA-hydrated. Before issuing any `.fill()` or
 * `.click()`, wait for an anchor element to be visible — the page's primary
 * submit button — so the form is guaranteed mounted. Default Playwright
 * timeouts assume snappy local dev, which isn't the case here.
 */
async function gotoAndWait(page: Page, path: string, anchor: Locator) {
  await page.goto(path)
  try {
    await expect(anchor).toBeVisible({ timeout: 15_000 })
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(anchor).toBeVisible({ timeout: 45_000 })
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

authTest.describe("Login page", () => {
  authTest("renders heading and form fields", async ({ page }) => {
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await expect(
      page.getByRole("heading", { name: /login to your account/i }),
    ).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /^log in$/i }),
    ).toBeVisible()
  })

  authTest("email input is type=email", async ({ page }) => {
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await expect(page.getByTestId("email-input")).toHaveAttribute(
      "type",
      "email",
    )
  })

  authTest("password input is masked (type=password)", async ({ page }) => {
    await gotoAndWait(page, "/login", page.getByTestId("password-input"))
    // PasswordInput renders a real <input type="password">. There's also a
    // visibility toggle button; the input itself must be masked by default.
    await expect(page.getByTestId("password-input")).toHaveAttribute(
      "type",
      "password",
    )
  })

  authTest("valid credentials redirect to dashboard", async ({
    page,
  }, testInfo) => {
    // Vite dev server occasionally drops a code-split chunk during a route
    // transition. The successful login navigates from /login → / which
    // pulls _layout.tsx and dashboard chunks. Opt out for that reason.
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await page
      .getByTestId("email-input")
      .fill(process.env.E2E_TEST_EMAIL ?? "admin@example.com")
    await page
      .getByTestId("password-input")
      .fill(process.env.E2E_TEST_PASSWORD ?? "changethis")
    await page.getByRole("button", { name: /^log in$/i }).click()
    // After login the SPA navigates to "/" which is the dashboard route.
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
    // access_token must land in localStorage
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    expect(token).toBeTruthy()
  })

  authTest("invalid credentials show error toast", async ({ page }) => {
    // A bad-creds login returns 400. The fixture's FATAL_PATTERNS regex
    // doesn't match "Failed to load resource", so no opt-out is needed.
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await page.getByTestId("email-input").fill("nobody@example.com")
    await page.getByTestId("password-input").fill("definitely-wrong-pw")
    await page.getByRole("button", { name: /^log in$/i }).click()
    // The sonner toast contents are "Something went wrong!Incorrect email
    // or password". Anchor on the API-derived text — it's the part most
    // likely to remain stable.
    await expect(
      page.locator("[data-sonner-toast]").filter({
        hasText: /incorrect email or password/i,
      }),
    ).toBeVisible({ timeout: 8000 })
    // Still on /login — no redirect away from the page.
    await expect(page).toHaveURL(/\/login/)
    // No token written.
    const token = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    expect(token).toBeNull()
  })

  authTest("empty form keeps user on /login", async ({ page }) => {
    const email = page.getByTestId("email-input")
    const btn = page.getByRole("button", { name: /^log in$/i })
    await gotoAndWait(page, "/login", email)
    await expect(btn).toBeVisible()
    await btn.click()
    // Either HTML5 :invalid blocks submission entirely, or zod surfaces a
    // FormMessage. In both cases the URL stays at /login.
    await expect(page).toHaveURL(/\/login/)
    // Token must NOT have been written.
    const token = await page.evaluate(() => localStorage.getItem("access_token"))
    expect(token).toBeNull()
  })

  authTest("malformed email is rejected", async ({ page }) => {
    const email = page.getByTestId("email-input")
    await gotoAndWait(page, "/login", email)
    await email.fill("not-an-email")
    await page.getByTestId("password-input").fill("validpassword123")
    await page.getByRole("button", { name: /^log in$/i }).click()
    // HTML5 validity OR a zod FormMessage rejection — URL doesn't change.
    await expect(page).toHaveURL(/\/login/)
    const validity = await email.evaluate(
      (el: HTMLInputElement) => el.validity.valid,
    )
    // Either browser-level invalid (validity=false) or zod-level rejection
    // (still on login with no token).
    if (validity) {
      const token = await page.evaluate(() =>
        localStorage.getItem("access_token"),
      )
      expect(token).toBeNull()
    } else {
      expect(validity).toBe(false)
    }
  })

  authTest("'Forgot your password?' navigates to /recover-password", async ({
    page,
  }, testInfo) => {
    // Vite dev server occasionally fails to serve a code-split chunk during
    // a route transition, surfacing "Failed to fetch dynamically imported
    // module" as a pageerror. This is dev-infra noise, not an app bug, and
    // is recoverable on the next nav. Opt out of the guard for nav tests.
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await page.getByRole("link", { name: /forgot your password/i }).click()
    await expect(page).toHaveURL(/\/recover-password/)
    await expect(
      page.getByRole("heading", { name: /password recovery/i }),
    ).toBeVisible({ timeout: 15000 })
  })

  authTest("'Sign up' navigates to /signup", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await page.getByRole("link", { name: /^sign up$/i }).click()
    await expect(page).toHaveURL(/\/signup/)
    await expect(
      page.getByRole("heading", { name: /create an account/i }),
    ).toBeVisible({ timeout: 15000 })
  })
})

// ─── Signup ───────────────────────────────────────────────────────────────────

authTest.describe("Signup page", () => {
  authTest("renders heading and all four fields", async ({ page }) => {
    await gotoAndWait(page, "/signup", page.getByTestId("full-name-input"))
    await expect(
      page.getByRole("heading", { name: /create an account/i }),
    ).toBeVisible()
    await expect(page.getByTestId("full-name-input")).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByTestId("confirm-password-input")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /^sign up$/i }),
    ).toBeVisible()
  })

  authTest("mismatched passwords surface a validation error", async ({
    page,
  }) => {
    await gotoAndWait(page, "/signup", page.getByTestId("full-name-input"))
    await page.getByTestId("full-name-input").fill("Test User")
    await page
      .getByTestId("email-input")
      .fill(`mismatch+${Date.now()}@example.com`)
    await page.getByTestId("password-input").fill("password123")
    await page.getByTestId("confirm-password-input").fill("different456")
    await page.getByRole("button", { name: /^sign up$/i }).click()
    await expect(page.getByText(/passwords don't match/i)).toBeVisible({
      timeout: 5000,
    })
    // URL must not change
    await expect(page).toHaveURL(/\/signup/)
  })

  authTest("short password surfaces a validation error", async ({ page }) => {
    await gotoAndWait(page, "/signup", page.getByTestId("full-name-input"))
    await page.getByTestId("full-name-input").fill("Test User")
    await page
      .getByTestId("email-input")
      .fill(`short+${Date.now()}@example.com`)
    await page.getByTestId("password-input").fill("short")
    await page.getByTestId("confirm-password-input").fill("short")
    await page.getByRole("button", { name: /^sign up$/i }).click()
    await expect(
      page.getByText(/at least 8 characters/i).first(),
    ).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/signup/)
  })

  authTest("'Log in' link goes back to /login", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoAndWait(page, "/signup", page.getByTestId("full-name-input"))
    await page.getByRole("link", { name: /^log in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Recover password ────────────────────────────────────────────────────────

authTest.describe("Recover password page", () => {
  authTest("renders heading, email field, continue button", async ({
    page,
  }) => {
    await gotoAndWait(
      page,
      "/recover-password",
      page.getByTestId("email-input"),
    )
    await expect(
      page.getByRole("heading", { name: /password recovery/i }),
    ).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /continue/i }),
    ).toBeVisible()
  })

  authTest("submitting a valid email fires the API and surfaces a toast", async ({
    page,
  }) => {
    await gotoAndWait(page, "/recover-password", page.getByTestId("email-input"))
    const respPromise = page.waitForResponse(
      (r) => r.url().includes("/password-recovery"),
      { timeout: 15000 },
    )
    await page
      .getByTestId("email-input")
      .fill(process.env.E2E_TEST_EMAIL ?? "admin@example.com")
    await page.getByRole("button", { name: /continue/i }).click()
    // The endpoint may 2xx (success toast) or 500 (no SMTP configured in
    // dev → error toast). Either way the request must fire and a toast
    // must appear.
    const resp = await respPromise
    expect([200, 204, 500].includes(resp.status())).toBe(true)
    await expect(
      page.locator("[data-sonner-toast]").first(),
    ).toBeVisible({ timeout: 8000 })
    await expect(page).toHaveURL(/\/recover-password/)
  })

  authTest("empty submit stays on the page", async ({ page }) => {
    await gotoAndWait(page, "/recover-password", page.getByTestId("email-input"))
    const btn = page.getByRole("button", { name: /continue/i })
    await expect(btn).toBeVisible({ timeout: 10000 })
    await btn.click()
    await expect(page).toHaveURL(/\/recover-password/)
  })

  authTest("'Log in' link returns to /login", async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoAndWait(
      page,
      "/recover-password",
      page.getByTestId("email-input"),
    )
    await page.getByRole("link", { name: /^log in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── Reset password ──────────────────────────────────────────────────────────

authTest.describe("Reset password page", () => {
  authTest(
    "renders password fields with a token in the URL",
    async ({ page }) => {
      // No token → route redirects to /login before mounting.
      await gotoAndWait(
        page,
        "/reset-password?token=fake-token-for-e2e",
        page.getByTestId("new-password-input"),
      )
      await expect(
        page.getByRole("heading", { name: /reset password/i }),
      ).toBeVisible()
      await expect(page.getByTestId("new-password-input")).toBeVisible()
      await expect(page.getByTestId("confirm-password-input")).toBeVisible()
      await expect(
        page.getByRole("button", { name: /reset password/i }),
      ).toBeVisible()
    },
  )

  authTest("redirects to /login when no token is present", async ({ page }) => {
    await page.goto("/reset-password")
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })

  authTest("mismatched passwords show validation error", async ({ page }) => {
    await gotoAndWait(
      page,
      "/reset-password?token=fake-token-for-e2e",
      page.getByTestId("new-password-input"),
    )
    await page.getByTestId("new-password-input").fill("password123")
    await page.getByTestId("confirm-password-input").fill("different456")
    await page.getByRole("button", { name: /reset password/i }).click()
    await expect(page.getByText(/passwords don't match/i)).toBeVisible({
      timeout: 5000,
    })
  })

  authTest("short password shows validation error", async ({ page }) => {
    await gotoAndWait(
      page,
      "/reset-password?token=fake-token-for-e2e",
      page.getByTestId("new-password-input"),
    )
    await page.getByTestId("new-password-input").fill("short")
    await page.getByTestId("confirm-password-input").fill("short")
    await page.getByRole("button", { name: /reset password/i }).click()
    await expect(
      page.getByText(/at least 8 characters/i).first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

// ─── Unauthenticated guard ───────────────────────────────────────────────────

authTest.describe("Unauthenticated route guard", () => {
  async function gotoUnauthenticated(
    page: import("@playwright/test").Page,
    path: string,
  ) {
    await page.addInitScript(() => localStorage.removeItem("access_token"))
    // Establish the unauthenticated shell first. This avoids the dashboard's
    // protected loader racing the route guard when testing `/` directly.
    await gotoAndWait(page, "/login", page.getByTestId("email-input"))
    await page.goto(path)
    try {
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    } catch {
      await page.reload({ waitUntil: "domcontentloaded" })
      await expect(page).toHaveURL(/\/login/, { timeout: 30_000 })
    }
  }

  // These tests start at a protected route, which forces a Vite chunk load
  // for _layout.tsx before the route-guard redirect fires. That chunk load
  // can fail under dev-server load — not an app bug, just dev infra noise.
  authTest("hitting /contacts without auth redirects to /login", async ({
    page,
  }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoUnauthenticated(page, "/contacts")
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })

  authTest("hitting / without auth redirects to /login", async ({
    page,
  }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoUnauthenticated(page, "/")
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })

  authTest("hitting /settings without auth redirects to /login", async ({
    page,
  }, testInfo) => {
    testInfo.annotations.push({ type: "allow-page-errors" })
    await gotoUnauthenticated(page, "/settings")
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 })
  })
})

// ─── Logout (requires an authenticated session) ──────────────────────────────

test.describe("Logout", () => {
  test("opening user menu then clicking 'Log Out' clears token and redirects to /login", async ({
    page,
  }, testInfo) => {
    // Logout navigates / → /login, which can hit the same Vite dev-server
    // dynamic-import flake described elsewhere in this file.
    testInfo.annotations.push({ type: "allow-page-errors" })
    // The menu is global; use the lightweight tags route instead of the
    // dashboard's multi-query loader.
    // Wait for the sidebar to hydrate before opening the menu. The first
    // cold route load can resolve before the layout's dynamic chunk mounts.
    await gotoAndWait(page, "/tags", page.getByTestId("user-menu"))

    // Confirm we ARE logged in — token present.
    const tokenBefore = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    expect(tokenBefore).toBeTruthy()

    // The user menu lives in the sidebar footer with a stable data-testid.
    await page.getByTestId("user-menu").click()
    await page.getByRole("menuitem", { name: /log out/i }).click()

    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    const tokenAfter = await page.evaluate(() =>
      localStorage.getItem("access_token"),
    )
    expect(tokenAfter).toBeNull()
  })
})
