import { test, expect } from "./fixtures"
import {
  getToken,
  createJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
  API_URL,
} from "./helpers/api.js"

// `/journal` shows a DataTable of entries via JournalList. The model uses
// `body` + `entry_date` + optional `mood`. There is no edit UI (only delete
// via row-actions menu). The MentionTextarea inside AddJournalDialog supports
// "@" mentions but there is no markdown preview tab.

let token: string
const createdIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.afterAll(async ({ request }) => {
  for (const id of createdIds) {
    await deleteJournalEntry(request, token, id).catch(() => {})
  }
})

async function openJournal(page: import("@playwright/test").Page) {
  await page.goto("/journal")
  await expect(page.getByRole("heading", { name: /^journal$/i })).toBeVisible({
    timeout: 20_000,
  })
}

test.describe("Journal", () => {
  test("page renders heading", async ({ page }) => {
    await openJournal(page)
    await expect(
      page.getByRole("heading", { name: /^journal$/i }),
    ).toBeVisible()
  })

  test("new entry dialog opens with all documented fields", async ({
    page,
    request,
  }) => {
    // Need at least one entry for the "New Entry" button to be in the header
    // (the empty-state shows a different button).
    const seedBody = `JournalSeed ${Date.now()}`
    const seed = await createJournalEntry(request, token, { body: seedBody })
    createdIds.push(seed.id)

    await openJournal(page)
    await page.getByRole("button", { name: /^new entry$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: /write journal entry/i }),
    ).toBeVisible()

    await expect(dialog.getByLabel(/^date \*/i)).toBeVisible()
    await expect(dialog.getByLabel(/^entry \*/i)).toBeVisible()
    await expect(dialog.getByLabel(/^mood$/i)).toBeVisible()
    await expect(
      dialog.getByPlaceholder(/what's on your mind/i),
    ).toBeVisible()
  })

  test("create entry via UI surfaces in list", async ({ page, request }) => {
    const body = `UIJournal ${Date.now()}`
    // Ensure there's at least one entry first (otherwise the header dialog
    // trigger is hidden behind the empty-state).
    const seed = await createJournalEntry(request, token, {
      body: `Seed ${Date.now()}`,
    })
    createdIds.push(seed.id)

    await openJournal(page)
    await page.getByRole("button", { name: /^new entry$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByPlaceholder(/what's on your mind/i).fill(body)
    await dialog.getByLabel(/^mood$/i).fill("curious")
    await dialog.getByRole("button", { name: /^save entry$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await expect(page.getByText(body)).toBeVisible({ timeout: 10_000 })

    // Track for teardown
    const res = await request.get(`${API_URL}/api/v1/journal/?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const list = await res.json()
    for (const j of list.data ?? []) {
      if (j.body === body) createdIds.push(j.id)
    }
  })

  test("API-updated entry body reflects in list (no edit UI)", async ({
    page,
    request,
  }) => {
    // The app has no edit dialog — only create + delete in the UI. We exercise
    // the update *path* via the API and verify the timeline re-renders with
    // the new content.
    const original = `OriginalBody ${Date.now()}`
    const entry = await createJournalEntry(request, token, { body: original })
    createdIds.push(entry.id)

    await openJournal(page)
    await expect(page.getByText(original)).toBeVisible({ timeout: 10_000 })

    const updated = `UpdatedBody ${Date.now()}`
    await updateJournalEntry(request, token, entry.id, { body: updated })

    await page.reload()
    await expect(
      page.getByRole("heading", { name: /^journal$/i }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(updated)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(original)).toHaveCount(0)
  })

  test("delete via row actions removes entry from list", async ({
    page,
    request,
  }) => {
    const body = `DeleteJournal ${Date.now()}`
    const entry = await createJournalEntry(request, token, { body })
    // do not push to createdIds — we'll delete via UI

    await openJournal(page)
    await expect(page.getByText(body)).toBeVisible({ timeout: 10_000 })

    const row = page.getByRole("row").filter({ hasText: body }).first()
    await row.getByRole("button", { name: /open actions menu/i }).click()
    await page.getByRole("menuitem", { name: /delete/i }).click()

    await expect(page.getByText(body)).toHaveCount(0, { timeout: 10_000 })

    // Belt-and-suspenders
    await deleteJournalEntry(request, token, entry.id).catch(() => {})
  })

  test("mood column shown when entry has mood set", async ({ page, request }) => {
    const body = `MoodEntry ${Date.now()}`
    const mood = "reflective"
    const entry = await createJournalEntry(request, token, { body, mood })
    createdIds.push(entry.id)

    await openJournal(page)
    const row = page.getByRole("row").filter({ hasText: body }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    await expect(row.getByText(new RegExp(`mood:.*${mood}`, "i"))).toBeVisible()
  })
})
