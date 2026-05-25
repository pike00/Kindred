import { test, expect } from "./fixtures"
import {
  getToken,
  createReminder,
  deleteReminder,
  updateReminder,
  listReminders,
} from "./helpers/api.js"

// `/reminders` shows a DataTable of reminders. Each row has a row-actions menu
// with "Snooze 1 hour" and "Delete". There is no edit dialog in the UI, no
// "mark as done" button, and no overdue/upcoming/done filter tabs. The
// AddReminderDialog asks for title, description, and remind_at.

let token: string
const createdIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.afterAll(async ({ request }) => {
  for (const id of createdIds) {
    await deleteReminder(request, token, id).catch(() => {})
  }
})

async function openReminders(page: import("@playwright/test").Page) {
  await page.goto("/reminders", { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", { name: /^reminders$/i }),
  ).toBeVisible({ timeout: 30_000 })
}

function plusHours(h: number): string {
  return new Date(Date.now() + h * 3600_000).toISOString()
}

// Far-future ISO string anchored years ahead of every other test reminder so
// our just-created row sorts to the top of the `remind_at desc` list and
// lands on page 1 of the DataTable.
function farFuture(yearsAhead = 5): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + yearsAhead)
  return d.toISOString()
}

test.describe("Reminders", () => {
  test("page renders heading", async ({ page }) => {
    await openReminders(page)
    await expect(
      page.getByRole("heading", { name: /^reminders$/i }),
    ).toBeVisible()
  })

  test("add reminder dialog opens with documented fields", async ({
    page,
    request,
  }) => {
    // Need an existing reminder so the header "Add Reminder" button is
    // visible (otherwise the empty state shows a different button label).
    const r = await createReminder(request, token, {
      title: `SeedReminder ${Date.now()}`,
      remind_at: farFuture(),
    })
    createdIds.push(r.id)

    await openReminders(page)
    await page.getByRole("button", { name: /^add reminder$/i }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: /add new reminder/i }),
    ).toBeVisible()
    await expect(dialog.getByLabel(/^title \*/i)).toBeVisible()
    await expect(dialog.getByLabel(/^description$/i)).toBeVisible()
    await expect(dialog.getByLabel(/^date & time \*/i)).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: /^create reminder$/i }),
    ).toBeVisible()
  })

  test("create reminder via UI surfaces in list", async ({ page, request }) => {
    // Seed at least one to make the header button visible.
    const seed = await createReminder(request, token, {
      title: `Seed ${Date.now()}`,
      remind_at: farFuture(),
    })
    createdIds.push(seed.id)

    const title = `UIReminder ${Date.now()}`
    await openReminders(page)
    await page.getByRole("button", { name: /^add reminder$/i }).click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/^title \*/i).fill(title)
    await dialog.getByLabel(/^description$/i).fill("Created via Playwright")

    // datetime-local: 5 years from now so the row sorts to the top of the
    // remind_at-desc list and shows up on page 1.
    const d = new Date()
    d.setFullYear(d.getFullYear() + 5)
    const pad = (n: number) => String(n).padStart(2, "0")
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    await dialog.getByLabel(/^date & time \*/i).fill(local)

    await dialog.getByRole("button", { name: /^create reminder$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })

    // Track
    const after = await listReminders(request, token)
    for (const r of after) {
      // listReminders only returns id+is_done, so we re-fetch full row to match.
    }
    const baseUrl = (process.env.E2E_BASE_URL ?? "http://localhost:5173").replace(
      ":5173",
      ":8001",
    )
    const res = await request.get(`${baseUrl}/api/v1/reminders/?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const list = await res.json()
    for (const r of list.data ?? []) {
      if (r.title === title) createdIds.push(r.id)
    }
  })

  test("snooze action stamps snoozed_until via UI", async ({
    page,
    request,
  }) => {
    const title = `SnoozeMe ${Date.now()}`
    const r = await createReminder(request, token, {
      title,
      remind_at: farFuture(8),
    })
    createdIds.push(r.id)

    await openReminders(page)
    const row = page.getByRole("row").filter({ hasText: title }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    await row.getByRole("button", { name: /open actions menu/i }).click()
    await page.getByRole("menuitem", { name: /snooze.*1 hour/i }).click()

    // brief wait for mutation
    await page.waitForTimeout(800)

    // Verify via API: snoozed_until should now be set on this reminder.
    const baseUrl = (process.env.E2E_BASE_URL ?? "http://localhost:5173").replace(
      ":5173",
      ":8001",
    )
    const res = await request.get(`${baseUrl}/api/v1/reminders/?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const list = await res.json()
    const found = (list.data ?? []).find((x: { id: string }) => x.id === r.id)
    expect(found).toBeTruthy()
    expect(found.snoozed_until).toBeTruthy()
  })

  test("API-updated reminder title reflects in list (no edit UI)", async ({
    page,
    request,
  }) => {
    const original = `OriginalRem ${Date.now()}`
    const r = await createReminder(request, token, {
      title: original,
      remind_at: farFuture(6),
    })
    createdIds.push(r.id)

    await openReminders(page)
    await expect(page.getByText(original)).toBeVisible({ timeout: 10_000 })

    const updated = `UpdatedRem ${Date.now()}`
    await updateReminder(request, token, r.id, { title: updated })

    await page.reload()
    await expect(
      page.getByRole("heading", { name: /^reminders$/i }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(updated)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(original)).toHaveCount(0)
  })

  test("delete via row actions removes reminder from list", async ({
    page,
    request,
  }) => {
    const title = `DeleteRem ${Date.now()}`
    const r = await createReminder(request, token, {
      title,
      remind_at: farFuture(7),
    })
    // do not push — we delete via UI

    await openReminders(page)
    const row = page.getByRole("row").filter({ hasText: title }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    await row.getByRole("button", { name: /open actions menu/i }).click()
    await page.getByRole("menuitem", { name: /^delete$/i }).click()

    await expect(page.getByText(title)).toHaveCount(0, { timeout: 10_000 })
    await deleteReminder(request, token, r.id).catch(() => {})
  })

  test("scheduled column shows formatted date+time", async ({
    page,
    request,
  }) => {
    const title = `ScheduledRem ${Date.now()}`
    const future = new Date()
    future.setFullYear(future.getFullYear() + 5)
    future.setHours(10, 30, 0, 0)
    const r = await createReminder(request, token, {
      title,
      remind_at: future.toISOString(),
    })
    createdIds.push(r.id)

    await openReminders(page)
    const row = page.getByRole("row").filter({ hasText: title }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    // Time format like "10:30 AM" or "10:30"
    await expect(row.getByText(/\d{1,2}:\d{2}/)).toBeVisible()
  })
})
