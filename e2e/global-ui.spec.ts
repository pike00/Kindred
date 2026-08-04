import { test, expect } from "./fixtures"

// The deployed dev SPA can take 5–15s to hydrate on a cold route load,
// especially when several specs hit it in parallel. Vite JIT-compiles
// chunks on demand which dominates first-test latency. Bump per-test
// timeout and allow one retry to absorb cold-cache cases.
test.beforeEach(({}, info) => info.setTimeout(60_000))
test.describe.configure({ retries: 2 })

// All tests in this file run against a logged-in session (default storage state).
// The dashboard at "/" is a safe page to assert global UI surface area against.
test.beforeEach(async ({ page }, testInfo) => {
  // The Vite dev server JIT-compiles chunks on first request and tests
  // navigate to chunks the server hasn't built before. The page-error
  // guard would fire on the transient "Failed to fetch dynamically
  // imported module" errors that result — opt out at the file level
  // because every test here exercises the layout shell that pulls those
  // chunks. Real React errors are still caught by the fixture's
  // FATAL_PATTERNS regex (it matches "uncaught error" / "rejection" /
  // "maximum update depth"), so this doesn't silence true app bugs.
  testInfo.annotations.push({ type: "allow-page-errors" })

  // The TanStack Router / Query devtools render a floating logo at
  // bottom-right that overlaps with the QuickLog FAB and the voice
  // recorder button, intercepting their clicks. They're development-only
  // tooling — suppress for the duration of the test.
  await page.addInitScript(() => {
    const injectCss = () => {
      if (!document.documentElement) return false
      if (document.querySelector("style[data-injected-by='e2e']")) return true
      const style = document.createElement("style")
      style.dataset.injectedBy = "e2e"
      style.textContent = `
        .tsqd-parent-container,
        [data-tanstack-router-devtools-button],
        [data-tanstack-query-devtools-button] { display: none !important; }
      `
      document.documentElement.appendChild(style)
      return true
    }
    if (!injectCss()) {
      document.addEventListener("DOMContentLoaded", () => injectCss())
    }
  })
  // Use /tags instead of "/" — the dashboard's index route fans out 6+
  // independent API queries on mount (contacts, reminders,
  // interactions, saved-filters, contact losing-touch, environment), and
  // running ~20 tests serially against the dev backend saturates its 15-
  // connection SQLAlchemy pool. /tags renders the same global UI surface
  // (sidebar, header bell, QuickLog FAB, voice recorder, theme dropdown,
  // shortcut overlay) with far fewer API calls.
  await page.goto("/tags")
  // Anchor on the sidebar trigger button — it's rendered as soon as the
  // _layout route mounts, so this guard is cheap.
  await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible({
    timeout: 20_000,
  })
})

// ─── Sidebar ──────────────────────────────────────────────────────────────────

test.describe("Sidebar", () => {
  test("trigger toggles the sidebar between expanded and collapsed", async ({
    page,
  }) => {
    const sidebar = page.locator('[data-slot="sidebar"]').first()
    const trigger = page.locator('[data-sidebar="trigger"]').first()

    // Wait for sidebar to mount and read initial state.
    await expect(sidebar).toBeVisible()
    const initial = await sidebar.getAttribute("data-state")
    expect(["expanded", "collapsed"]).toContain(initial)

    await trigger.click()
    // After one click, state should flip.
    await expect
      .poll(async () => sidebar.getAttribute("data-state"), { timeout: 3000 })
      .not.toBe(initial)

    const flipped = await sidebar.getAttribute("data-state")
    await trigger.click()
    // And flip back.
    await expect
      .poll(async () => sidebar.getAttribute("data-state"), { timeout: 3000 })
      .not.toBe(flipped)
  })

  test("renders the main navigation links", async ({ page }) => {
    // Scope to the [data-slot="sidebar"] container so we don't pick up
    // breadcrumbs, footer links, or anything else outside the sidebar.
    const sidebar = page.locator('[data-slot="sidebar"]')
    await expect(
      sidebar.getByRole("link", { name: /^dashboard$/i }),
    ).toBeVisible()
    await expect(
      sidebar.getByRole("link", { name: /^contacts$/i }),
    ).toBeVisible()
    await expect(
      sidebar.getByRole("link", { name: /^interactions$/i }),
    ).toBeVisible()
    await expect(
      sidebar.getByRole("link", { name: /^reminders$/i }),
    ).toBeVisible()
    await expect(sidebar.getByRole("link", { name: /^tags$/i })).toBeVisible()
  })
})

// ─── Theme ────────────────────────────────────────────────────────────────────

test.describe("Theme toggle", () => {
  test("flipping dark/light updates the <html> class", async ({ page }) => {
    // The appearance trigger has data-testid="theme-button" on the
    // Appearance sidebar item.
    const themeBtn = page.getByTestId("theme-button").first()
    await expect(themeBtn).toBeVisible()

    // ── Open → choose Dark ────────────────────────────────────────────
    await themeBtn.click()
    const darkItem = page.getByTestId("dark-mode")
    await expect(darkItem).toBeVisible({ timeout: 5000 })
    await darkItem.click()
    await expect.poll(
      async () =>
        page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        ),
      { timeout: 3000 },
    ).toBe(true)
    // Wait for the Radix menu to fully close before we touch the trigger
    // again. Clicking while a menu is still mounting/unmounting gets
    // absorbed by Radix's portal outside-click handler.
    await expect(darkItem).not.toBeVisible({ timeout: 3000 })
    await expect(themeBtn).toHaveAttribute("data-state", "closed")

    // ── Open → choose Light ───────────────────────────────────────────
    await themeBtn.click()
    const lightItem = page.getByTestId("light-mode")
    await expect(lightItem).toBeVisible({ timeout: 5000 })
    await lightItem.click()
    await expect.poll(
      async () =>
        page.evaluate(() =>
          document.documentElement.classList.contains("light"),
        ),
      { timeout: 3000 },
    ).toBe(true)
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    )
    expect(isDark).toBe(false)
  })

  test("theme choice persists across reload (localStorage)", async ({
    page,
  }) => {
    const themeBtn = page.getByTestId("theme-button").first()
    await themeBtn.click()
    await page.getByTestId("dark-mode").click()
    await expect.poll(
      async () =>
        page.evaluate(() =>
          document.documentElement.classList.contains("dark"),
        ),
      { timeout: 3000 },
    ).toBe(true)

    await page.reload()
    await expect(page.getByTestId("user-menu")).toBeVisible({ timeout: 15000 })
    const stillDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    )
    expect(stillDark).toBe(true)
  })
})

// ─── Reminder bell ────────────────────────────────────────────────────────────

test.describe("Reminder bell", () => {
  test("renders in the header with an accessible name", async ({ page }) => {
    const bell = page.getByRole("button", { name: /reminders, \d+ due/i })
    await expect(bell).toBeVisible()
  })

  test("clicking opens a popover with the 'Due reminders' header", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /reminders, \d+ due/i }).click()
    await expect(
      page.getByRole("heading", { name: /due reminders/i }),
    ).toBeVisible()
    // Either an empty-state line or a list; both forms include "due".
    await expect(page.getByText(/due reminders/i).first()).toBeVisible()
    // "View all reminders" link is always rendered.
    await expect(
      page.getByRole("link", { name: /view all reminders/i }),
    ).toBeVisible()
  })
})

// ─── QuickLog FAB ─────────────────────────────────────────────────────────────

test.describe("QuickLog FAB", () => {
  test("is visible in the bottom-right corner", async ({ page }) => {
    const fab = page.getByRole("button", { name: /quick log interaction/i })
    await expect(fab).toBeVisible()
  })

  test("clicking opens the Quick Log popover with form controls", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /quick log interaction/i }).click()
    await expect(page.getByRole("heading", { name: /^quick log$/i })).toBeVisible(
      { timeout: 5000 },
    )
    // Contact picker and channel picker should render.
    await expect(page.getByTestId("contact-picker-button")).toBeVisible()
    await expect(page.getByPlaceholder(/quick note/i)).toBeVisible()
    // The submit button is distinct from the FAB trigger ("Quick log
    // interaction") — use exact-match on its text.
    await expect(
      page.getByRole("button", { name: "Log Interaction", exact: true }),
    ).toBeVisible()
  })

  test("submit button is disabled until a contact is chosen", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /quick log interaction/i }).click()
    const submit = page.getByRole("button", {
      name: "Log Interaction",
      exact: true,
    })
    await expect(submit).toBeVisible()
    await expect(submit).toBeDisabled()
  })

  test("close (X) button dismisses the popover", async ({ page }) => {
    await page.getByRole("button", { name: /quick log interaction/i }).click()
    await expect(page.getByRole("heading", { name: /quick log/i })).toBeVisible()
    await page.getByRole("button", { name: /^close$/i }).click()
    await expect(
      page.getByRole("heading", { name: /quick log/i }),
    ).not.toBeVisible()
  })
})

// ─── Voice recorder ───────────────────────────────────────────────────────────

test.describe("Voice recorder button", () => {
  test("is visible with the 'Hold to record voice' aria-label", async ({
    page,
  }) => {
    // Idle state — accessible name comes from the aria-label.
    const btn = page.getByRole("button", { name: /hold to record voice/i })
    await expect(btn).toBeVisible()
  })

  // Note: we cannot exercise the recording flow itself because mic access
  // requires real `navigator.mediaDevices.getUserMedia` permission, which
  // Playwright cannot grant cleanly in headless mode. The error toast path
  // would require a microphone setup we don't have here.
})

// ─── Keyboard shortcut overlay ────────────────────────────────────────────────

test.describe("Keyboard shortcut overlay", () => {
  test("Meta+/ opens the overlay", async ({ page }) => {
    await page.locator("body").click()
    await page.keyboard.press("Meta+/")
    await expect(
      page.getByRole("dialog").filter({ hasText: /keyboard shortcuts/i }),
    ).toBeVisible({ timeout: 5000 })
  })

  test("Control+/ opens the overlay", async ({ page }) => {
    await page.locator("body").click()
    await page.keyboard.press("Control+/")
    await expect(
      page.getByRole("dialog").filter({ hasText: /keyboard shortcuts/i }),
    ).toBeVisible({ timeout: 5000 })
  })

  test("Escape closes the overlay once open", async ({ page }) => {
    await page.locator("body").click()
    await page.keyboard.press("Meta+/")
    const overlay = page
      .getByRole("dialog")
      .filter({ hasText: /keyboard shortcuts/i })
    await expect(overlay).toBeVisible({ timeout: 5000 })
    await page.keyboard.press("Escape")
    await expect(overlay).not.toBeVisible()
  })

  test("shows shortcut groups when open", async ({ page }) => {
    await page.locator("body").click()
    await page.keyboard.press("Meta+/")
    await expect(
      page.getByRole("dialog").filter({ hasText: /keyboard shortcuts/i }),
    ).toBeVisible({ timeout: 5000 })
    // The Layout registers Navigation + Actions groups via useRegisterShortcuts.
    await expect(
      page.getByRole("heading", { name: /^navigation$/i }),
    ).toBeVisible()
  })

  test("pressing '?' opens the overlay", async ({ page }) => {
    // We now bypass tinykeys for `?` and match on event.key directly because
    // typing `?` on a US keyboard sets shiftKey=true, which tinykeys rejects.
    await page.locator("body").click()
    await page.keyboard.press("Shift+Slash")
    await expect(
      page.getByRole("dialog").filter({ hasText: /keyboard shortcuts/i }),
    ).toBeVisible({ timeout: 5000 })
  })
})

// ─── Chord shortcuts (g <key>) ────────────────────────────────────────────────

test.describe("Chord navigation shortcuts", () => {
  // Helper: press a two-key chord with `g` on body.
  async function chord(page: import("@playwright/test").Page, second: string) {
    // Ensure focus is on body, not inside an input that might swallow keys.
    await page.locator("body").click()
    await page.keyboard.press("g")
    // tinykeys requires the second key within 1500ms.
    await page.keyboard.press(second)
  }

  test("g c → /contacts", async ({ page }) => {
    await chord(page, "c")
    await expect(page).toHaveURL(/\/contacts$/, { timeout: 5000 })
  })

  test("g i → /interactions", async ({ page }) => {
    await chord(page, "i")
    await expect(page).toHaveURL(/\/interactions$/, { timeout: 5000 })
  })

  test("g t → /tags", async ({ page }) => {
    await chord(page, "t")
    await expect(page).toHaveURL(/\/tags$/, { timeout: 5000 })
  })

  test("g r → /reminders", async ({ page }) => {
    await chord(page, "r")
    await expect(page).toHaveURL(/\/reminders$/, { timeout: 5000 })
  })

  test("g s → /settings", async ({ page }) => {
    await chord(page, "s")
    await expect(page).toHaveURL(/\/settings$/, { timeout: 5000 })
  })

  test("Meta+Shift+n → /contacts (New Contact)", async ({ page }) => {
    await page.locator("body").click()
    await page.keyboard.press("Meta+Shift+n")
    await expect(page).toHaveURL(/\/contacts$/, { timeout: 5000 })
  })
})
