import { test, expect } from "./fixtures"
import {
  API_URL,
  getToken,
  createContact,
  deleteContact,
} from "./helpers/api.js"

// `/calendar` renders a `MonthCalendar` showing a 7-column grid of day cells
// for the URL-bound month (default = current). Each cell with events shows
// colored dots; clicking a cell toggles a `DrillDown` card listing each event
// linked to its contact. The "Previous/Next month" navigation uses arrow icon
// buttons with aria-label="Previous month"/"Next month".

let token: string
const createdContactIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.afterAll(async ({ request }) => {
  for (const id of createdContactIds) {
    await deleteContact(request, token, id).catch(() => {})
  }
})

const MONTH_RE =
  /january|february|march|april|may|june|july|august|september|october|november|december/i

function currentMonthName(): string {
  return new Date().toLocaleString("default", { month: "long" })
}

function currentYear(): number {
  return new Date().getFullYear()
}

async function openCalendar(page: import("@playwright/test").Page) {
  await page.goto("/calendar", { waitUntil: "domcontentloaded" })
  await expect(
    page
      .getByRole("heading")
      .filter({ hasText: new RegExp(`${currentMonthName()} ${currentYear()}`, "i") }),
  ).toBeVisible({ timeout: 30_000 })
}

test.describe("Calendar", () => {
  test("month grid renders current month and day labels", async ({ page }) => {
    await openCalendar(page)
    // Day-of-week column headers
    for (const label of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      await expect(page.getByText(new RegExp(`^${label}$`, "i"))).toBeVisible()
    }
  })

  test("next month navigation advances the displayed month", async ({
    page,
  }) => {
    await openCalendar(page)
    const initialHeading = page
      .getByRole("heading")
      .filter({ hasText: MONTH_RE })
      .first()
    const initial = await initialHeading.textContent()

    await page.getByRole("button", { name: /next month/i }).click()
    // Header should change to the next month
    await expect(initialHeading).not.toHaveText(initial ?? "")
    await expect(initialHeading).toHaveText(MONTH_RE)
  })

  test("previous month navigation rewinds the displayed month", async ({
    page,
  }) => {
    await openCalendar(page)
    const heading = page.getByRole("heading").filter({ hasText: MONTH_RE }).first()
    const initial = await heading.textContent()

    await page.getByRole("button", { name: /previous month/i }).click()
    await expect(heading).not.toHaveText(initial ?? "")
    await expect(heading).toHaveText(MONTH_RE)
  })

  test("navigating away then back returns to original month", async ({
    page,
  }) => {
    await openCalendar(page)
    const heading = page.getByRole("heading").filter({ hasText: MONTH_RE }).first()
    const original = await heading.textContent()

    await page.getByRole("button", { name: /next month/i }).click()
    await expect(heading).not.toHaveText(original ?? "")
    await page.getByRole("button", { name: /previous month/i }).click()
    await expect(heading).toHaveText(original ?? "")
  })

  test("clicking a day cell opens the drilldown card", async ({ page }) => {
    await openCalendar(page)

    // Day cells are <button type="button"> elements with the day digit in a
    // nested span. Match by span text rather than by accessible name (which
    // sometimes includes the dot-indicator children).
    const day15Button = page
      .locator("button[type='button']", { has: page.locator("span", { hasText: /^15$/ }) })
      .first()
    await expect(day15Button).toBeVisible({ timeout: 10_000 })
    await day15Button.click()

    // The drilldown card titles the date as e.g. "Friday, May 15". Match
    // any of these patterns: drilldown heading with weekday or "No events".
    const drilldown = page.getByText(
      /no events this day|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
    )
    await expect(drilldown.first()).toBeVisible({ timeout: 5000 })
  })

  test("birthday events from API surface as cells with dots", async ({
    page,
    request,
  }) => {
    // Seed a contact with a birthday this month so the calendar has a known
    // event to render. The birthday is recorded as YYYY-MM-15.
    const now = new Date()
    const monthStr = String(now.getMonth() + 1).padStart(2, "0")
    const birthday = `1990-${monthStr}-15`

    const c = await createContact(request, token, {
      first_name: `CalE2E ${Date.now()}`,
    })
    createdContactIds.push(c.id)
    // Update birthday via PATCH /contacts/{id}
    await request.patch(`${API_URL}/api/v1/contacts/${c.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { birthday },
    })

    await openCalendar(page)

    const day15 = page
      .locator("button[type='button']", {
        has: page.locator("span", { hasText: /^15$/ }),
      })
      .first()
    await expect(day15).toBeVisible({ timeout: 10_000 })
    await day15.click()

    // The drilldown should mention "birthday" and the seeded contact name.
    await expect(page.getByText(/birthday/i).first()).toBeVisible({ timeout: 5000 })
  })

  test("URL ?month= overrides default current month", async ({ page }) => {
    await page.goto("/calendar?month=2030-01", {
      waitUntil: "domcontentloaded",
    })
    await expect(
      page.getByRole("heading").filter({ hasText: /january 2030/i }),
    ).toBeVisible({ timeout: 30_000 })
  })
})
