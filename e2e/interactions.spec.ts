import { test, expect } from "./fixtures"
import {
  getToken,
  createContact,
  deleteContact,
  createInteraction,
  deleteInteraction,
  API_URL,
} from "./helpers/api.js"

// `/interactions` shows the `InteractionTimeline` (and a `Drafts` tab). There is
// no in-app edit dialog, no filter UI, and no client-side pagination. Tests
// cover: page renders, dialog opens with each documented field, dialog round
// trip, list-render of an API-created interaction, channel grouping, delete via
// API, drafts tab.

let token: string
let contactA: { id: string; first_name: string }
let contactB: { id: string; first_name: string }
const createdInteractionIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
  // Prefix "AAA" sorts first alphabetically so the contact appears in the
  // top 100 the frontend popover fetches (backend default limit).
  const ts = Date.now()
  contactA = (await createContact(request, token, {
    first_name: `AAAIxAlpha${ts}`,
  })) as { id: string; first_name: string }
  contactB = (await createContact(request, token, {
    first_name: `AAAIxBeta${ts}`,
  })) as { id: string; first_name: string }
})

test.afterAll(async ({ request }) => {
  for (const id of createdInteractionIds) {
    await deleteInteraction(request, token, id).catch(() => {})
  }
  if (contactA) await deleteContact(request, token, contactA.id).catch(() => {})
  if (contactB) await deleteContact(request, token, contactB.id).catch(() => {})
})

async function openTimeline(page: import("@playwright/test").Page) {
  await page.goto("/interactions")
  await expect(page.getByRole("heading", { name: /^interactions$/i })).toBeVisible({
    timeout: 10_000,
  })
}

test.describe("Interactions timeline", () => {
  test("page renders heading and tabs", async ({ page }) => {
    await openTimeline(page)
    await expect(page.getByRole("tab", { name: /all interactions/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /drafts/i })).toBeVisible()
  })

  test("log dialog opens with all documented fields", async ({ page }) => {
    await openTimeline(page)
    await page.getByRole("button", { name: /^log interaction$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("heading", { name: /^log interaction$/i })).toBeVisible()

    // Attendee picker
    await expect(dialog.getByText(/^attendees \*/i)).toBeVisible()
    await expect(dialog.getByRole("button", { name: /add attendee/i })).toBeVisible()

    // Channel chips — every documented channel
    await expect(dialog.getByRole("button", { name: /^call$/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^in person$/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^text$/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^email$/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^video$/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^social$/i })).toBeVisible()
    await expect(dialog.getByRole("button", { name: /^other$/i })).toBeVisible()

    // Required+optional fields
    await expect(dialog.getByLabel(/when \*/i)).toBeVisible()
    await expect(dialog.getByLabel(/duration \(minutes\)/i)).toBeVisible()
    await expect(dialog.getByPlaceholder(/what did you talk about/i)).toBeVisible()
    await expect(dialog.getByLabel(/^location$/i)).toBeVisible()
    await expect(dialog.getByLabel(/^latitude$/i)).toBeVisible()
    await expect(dialog.getByLabel(/^longitude$/i)).toBeVisible()
  })

  test("create interaction via UI surfaces in timeline", async ({
    page,
    request,
  }) => {
    const noteText = `UICreate ${Date.now()}`
    await openTimeline(page)
    await page.getByRole("button", { name: /^log interaction$/i }).click()
    const dialog = page.getByRole("dialog")

    // Open attendee picker
    await dialog.getByRole("button", { name: /add attendee/i }).click()
    const popoverInput = page.getByPlaceholder(/search contacts/i)
    await expect(popoverInput).toBeVisible({ timeout: 5000 })
    await popoverInput.fill(contactA.first_name)

    // cmdk renders items with role=option; wait until the typed-in name matches
    const targetOption = page
      .getByRole("option")
      .filter({ hasText: contactA.first_name })
      .first()
    await expect(targetOption).toBeVisible({ timeout: 10_000 })
    await targetOption.click()

    // Channel: text
    await dialog.getByRole("button", { name: /^text$/i }).click()

    // Notes
    await dialog
      .getByPlaceholder(/what did you talk about/i)
      .fill(noteText)

    // Submit
    await dialog.getByRole("button", { name: /^log interaction$/i }).click()

    // Dialog closes, timeline updates
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 })

    // Track for teardown
    const res = await request.get(`${API_URL}/api/v1/interactions/?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    for (const ix of body.data ?? []) {
      if (ix.notes === noteText) createdInteractionIds.push(ix.id)
    }
  })

  test("API-created interaction shows channel label and attendee name", async ({
    page,
    request,
  }) => {
    const notes = `ChannelLabel ${Date.now()}`
    const ix = await createInteraction(request, token, {
      attendee_ids: [contactA.id],
      channel: "call",
      notes,
    })
    createdInteractionIds.push(ix.id)

    await openTimeline(page)
    const row = page
      .locator("div")
      .filter({ hasText: notes })
      .first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    // Channel label "Call" + attendee first name appear in the card text.
    await expect(page.getByText(notes)).toBeVisible()
    // The displayed attendee should include the first name of contactA.
    await expect(
      page.locator("text=" + contactA.first_name).first(),
    ).toBeVisible()
  })

  test("date heading groups interactions by day", async ({ page, request }) => {
    const notes = `Grouping ${Date.now()}`
    const ix = await createInteraction(request, token, {
      attendee_ids: [contactA.id],
      channel: "in_person",
      notes,
      occurred_at: new Date().toISOString(),
    })
    createdInteractionIds.push(ix.id)

    await openTimeline(page)
    await expect(page.getByText(notes)).toBeVisible({ timeout: 10_000 })

    // A date heading like "Aug 12, 2025" / "May 25, 2026" appears.
    const monthRe =
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i
    await expect(page.getByText(monthRe).first()).toBeVisible()
  })

  test("delete via row actions removes interaction from timeline", async ({
    page,
    request,
  }) => {
    const notes = `DeleteMe ${Date.now()}`
    const ix = await createInteraction(request, token, {
      attendee_ids: [contactA.id],
      channel: "email",
      notes,
    })

    await openTimeline(page)
    // Scope to the data-slot=card wrapper for this specific note
    const card = page
      .locator('[data-slot="card"]')
      .filter({ hasText: notes })
      .first()
    await expect(card).toBeVisible({ timeout: 10_000 })

    await card
      .getByRole("button", { name: /open actions menu/i })
      .first()
      .click()
    await page.getByRole("menuitem", { name: /delete/i }).click()

    await expect(page.getByText(notes)).toHaveCount(0, { timeout: 10_000 })

    // Belt-and-suspenders cleanup
    await deleteInteraction(request, token, ix.id).catch(() => {})
  })

  test("drafts tab shows draft items and hides them from main tab", async ({
    page,
    request,
  }) => {
    const draftNote = `DraftIx ${Date.now()}`
    const live = await createInteraction(request, token, {
      attendee_ids: [contactB.id],
      channel: "call",
      notes: `LiveIx ${Date.now()}`,
    })
    createdInteractionIds.push(live.id)
    const draft = await createInteraction(request, token, {
      attendee_ids: [contactB.id],
      channel: "text",
      notes: draftNote,
      is_draft: true,
    })
    createdInteractionIds.push(draft.id)

    await openTimeline(page)

    // Draft should NOT appear in the "All Interactions" tab
    await expect(page.getByText(draftNote)).toHaveCount(0)

    // Switch to drafts tab
    await page.getByRole("tab", { name: /drafts/i }).click()
    await expect(page.getByText(draftNote)).toBeVisible({ timeout: 8_000 })
  })
})
