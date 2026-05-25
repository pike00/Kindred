import { test, expect } from "./fixtures"
import type { Page } from "@playwright/test"
import {
  createContact,
  createInteraction,
  createTag,
  deleteContact,
  deleteInteraction,
  deleteTag,
  getToken,
} from "./helpers/api.js"

// ─── Shared fixture: one contact per file ────────────────────────────────────
//
// We re-use a single contact across most of the tests to keep the suite fast
// (each navigation to /contacts/{id} fires ~10 queries). Tests that need a
// "clean" contact create their own.

let token: string
let contactId: string
const createdContactIds: string[] = []
const createdInteractionIds: string[] = []
const createdTagIds: string[] = []

async function retryAsync<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw lastErr
}

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
  // Wrap creates in retries — the public deploy occasionally returns
  // empty-body 2xx during CF/Traefik failovers; the helper's res.json()
  // throws on that and we want the suite to still run.
  const a = await retryAsync(() =>
    createContact(request, token, {
      first_name: "AAADetailSpec",
      last_name: "Primary",
    }),
  )
  contactId = a.id
  createdContactIds.push(a.id)

  const b = await retryAsync(() =>
    createContact(request, token, {
      first_name: "AAADetailSpec",
      last_name: "Secondary",
    }),
  )
  createdContactIds.push(b.id)
})

test.afterAll(async ({ request }) => {
  // Serialize cleanup deletes to avoid exhausting the backend's connection
  // pool (default pool size 5 + 10 overflow). Concurrent Promise.all of
  // many deletes can trigger sqlalchemy.exc.TimeoutError and kill the
  // backend mid-suite. Best-effort: failures are swallowed.
  const cleanup = async () => {
    for (const id of createdInteractionIds) {
      await deleteInteraction(request, token, id).catch(() => {})
    }
    for (const id of createdTagIds) {
      await deleteTag(request, token, id).catch(() => {})
    }
    for (const id of createdContactIds) {
      await deleteContact(request, token, id).catch(() => {})
    }
  }
  await Promise.race([
    cleanup(),
    new Promise((resolve) => setTimeout(resolve, 50_000)),
  ])
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * The shadcn Card component renders `CardTitle` as a `<div>` (not an `<h2>`),
 * so `getByRole("heading", ...)` doesn't find them. Use this for section
 * headings inside cards.
 */
function cardTitle(page: Page, match: string | RegExp) {
  return page.locator('[data-slot="card-title"]', {
    hasText: match instanceof RegExp ? match : new RegExp(match, "i"),
  })
}

function cardByTitle(page: Page, match: string | RegExp) {
  return page.locator('[data-slot="card"]', {
    has: cardTitle(page, match),
  })
}

// ─── Page load + header ──────────────────────────────────────────────────────

test.describe("Contact detail header", () => {
  test("page loads and shows the contact's name", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(
      page.getByRole("heading", { name: /AAADetailSpec Primary/i, level: 1 }),
    ).toBeVisible({ timeout: 10000 })
  })

  test("Download PDF button is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(
      page.getByRole("button", { name: /download pdf/i }),
    ).toBeVisible()
  })

  test("Edit button opens the edit-contact dialog", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    // Use the contact name heading as an anchor — we know the page rendered
    // before searching for the Edit button. The Edit button is alongside
    // the Download PDF button in the header.
    await expect(
      page.getByRole("heading", { name: /AAADetailSpec Primary/i, level: 1 }),
    ).toBeVisible({ timeout: 10000 })
    await page
      .getByRole("button", { name: /^edit$/i, exact: false })
      .first()
      .click()
    const dialog = page.getByRole("dialog", { name: /edit contact/i })
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.getByLabel(/first name/i)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })

  test("Log Interaction button opens the add-interaction dialog", async ({
    page,
  }) => {
    await page.goto(`/contacts/${contactId}`)
    await page
      .getByRole("button", { name: "Log Interaction", exact: true })
      .click()
    const dialog = page.getByRole("dialog", { name: /log interaction/i })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/attendees/i)).toBeVisible()
    await expect(dialog.getByText(/channel/i).first()).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()
  })
})

// ─── Timeline card (covers the Interactions surface) ─────────────────────────

test.describe("Timeline card", () => {
  test("Timeline section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /timeline/i)).toBeVisible({ timeout: 10000 })
  })

  test("logged interactions show up on the timeline", async ({
    page,
    request,
  }) => {
    // Use a fresh contact so the timeline starts empty and the new
    // interaction is the only thing rendered there.
    const c = await createContact(request, token, {
      first_name: `AAATimelineContact${Date.now()}`,
    })
    createdContactIds.push(c.id)

    const notes = `e2e timeline interaction ${Date.now()}`
    const it = await createInteraction(request, token, {
      ...({
        attendee_ids: [c.id],
        channel: "call",
        occurred_at: new Date().toISOString(),
        notes,
      } as any),
    })
    if (it?.id) createdInteractionIds.push(it.id)

    await page.goto(`/contacts/${c.id}`)
    await expect(cardTitle(page, /timeline/i)).toBeVisible({ timeout: 10000 })
    // The notes string appears in the timeline row body. .first() because
    // the unified timeline surfaces the same text in two locations.
    await expect(page.getByText(notes).first()).toBeVisible({
      timeout: 15000,
    })
  })
})

// ─── Notes card ──────────────────────────────────────────────────────────────

test.describe("Notes card", () => {
  test("Notes section is visible with quick-capture", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /\bNotes\b/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByPlaceholder(/jot a quick note/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /save note/i })).toBeVisible()
  })

  test("create + delete a note via the UI", async ({ page }) => {
    const noteBody = `e2e note ${Date.now()}`
    await page.goto(`/contacts/${contactId}`)
    await page.getByPlaceholder(/jot a quick note/i).fill(noteBody)
    await page.getByRole("button", { name: /save note/i }).click()

    // Note appears in BOTH the Notes card and the Timeline card — scope to
    // the Notes card so we're asserting on the right slot.
    const notesCard = cardByTitle(page, /\bNotes\b/i)
    await expect(notesCard.getByText(noteBody)).toBeVisible({ timeout: 10000 })

    // Accept the window.confirm() that the row's Delete action triggers.
    page.on("dialog", (d) => d.accept())

    const noteRow = notesCard
      .locator('div[class*="group"]')
      .filter({ hasText: noteBody })
      .first()
    const actionsBtn = noteRow.getByRole("button", {
      name: /open actions menu/i,
    })
    await expect(actionsBtn).toBeVisible({ timeout: 5000 })
    await actionsBtn.click()
    const deleteItem = page.getByRole("menuitem", { name: /delete/i })
    await expect(deleteItem).toBeVisible({ timeout: 5000 })
    await deleteItem.click()
    await expect(notesCard.getByText(noteBody)).not.toBeVisible({
      timeout: 10000,
    })
  })

  test("edit a note via the UI", async ({ page }) => {
    const original = `e2e edit me ${Date.now()}`
    const updated = `e2e edited ${Date.now()}`
    await page.goto(`/contacts/${contactId}`)
    await page.getByPlaceholder(/jot a quick note/i).fill(original)
    await page.getByRole("button", { name: /save note/i }).click()

    const notesCard = cardByTitle(page, /\bNotes\b/i)
    await expect(notesCard.getByText(original)).toBeVisible({ timeout: 10000 })

    const noteRow = notesCard
      .locator('div[class*="group"]')
      .filter({ hasText: original })
      .first()
    await noteRow.getByRole("button", { name: /open actions menu/i }).click()
    await page.getByRole("menuitem", { name: /edit/i }).click()

    const dialog = page.getByRole("dialog", { name: /edit note/i })
    await expect(dialog).toBeVisible()
    const textbox = dialog.getByRole("textbox")
    await textbox.fill(updated)
    await dialog.getByRole("button", { name: /^save$/i }).click()
    await expect(notesCard.getByText(updated)).toBeVisible({ timeout: 10000 })

    // Clean up
    page.on("dialog", (d) => d.accept())
    const updatedRow = notesCard
      .locator('div[class*="group"]')
      .filter({ hasText: updated })
      .first()
    await updatedRow.getByRole("button", { name: /open actions menu/i }).click()
    await page.getByRole("menuitem", { name: /delete/i }).click()
  })
})

// ─── Contact Information card ────────────────────────────────────────────────

test.describe("Contact Information card", () => {
  test("section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /contact information/i)).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── Addresses card ──────────────────────────────────────────────────────────

test.describe("Addresses card", () => {
  test("Addresses section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /\bAddresses\b/i)).toBeVisible({
      timeout: 10000,
    })
  })

  test("Add Address dialog opens and creates a new address", async ({
    page,
    request,
  }) => {
    const c = await createContact(request, token, {
      first_name: `AAAAddrContact${Date.now()}`,
    })
    createdContactIds.push(c.id)

    await page.goto(`/contacts/${c.id}`)
    const card = cardByTitle(page, /\bAddresses\b/i)
    await card.getByRole("button", { name: /^add$/i }).click()

    const dialog = page.getByRole("dialog", { name: /add address/i })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel(/street/i).fill("123 Test Lane")
    await dialog.getByLabel(/city/i).fill("Springfield")
    await dialog.getByLabel(/region/i).fill("IL")
    await dialog.getByLabel(/postal code/i).fill("62701")
    await dialog.getByRole("button", { name: /^save$/i }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText("123 Test Lane")).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── Pets card ───────────────────────────────────────────────────────────────

test.describe("Pets card", () => {
  test("Pets section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /\bPets\b/i)).toBeVisible({ timeout: 10000 })
  })

  test("Add Pet dialog opens and creates a new pet", async ({
    page,
    request,
  }) => {
    const c = await createContact(request, token, {
      first_name: `AAAPetContact${Date.now()}`,
    })
    createdContactIds.push(c.id)

    await page.goto(`/contacts/${c.id}`)
    const card = cardByTitle(page, /\bPets\b/i)
    await card.getByRole("button", { name: /^add$/i }).click()

    const dialog = page.getByRole("dialog", { name: /add pet/i })
    await expect(dialog).toBeVisible()
    const petName = `Biscuit${Date.now()}`
    // The shadcn FormLabel with asterisk-span doesn't reliably bind to the
    // input via accessible-name (Radix Label htmlFor only points at the
    // FormControl wrapper). Use the placeholder as a stable selector.
    await dialog.getByPlaceholder("Biscuit").fill(petName)
    await dialog.getByPlaceholder("Dog").fill("Dog")
    await dialog.getByRole("button", { name: /^save$/i }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await expect(page.getByText(petName)).toBeVisible({ timeout: 10000 })
  })
})

// ─── Life events card ────────────────────────────────────────────────────────

test.describe("Life Events card", () => {
  test("Life events section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /\bLife events\b/i)).toBeVisible({
      timeout: 10000,
    })
  })

  test("Add Life Event dialog opens and creates a new event", async ({
    page,
    request,
  }) => {
    const c = await createContact(request, token, {
      first_name: `AAALifeContact${Date.now()}`,
    })
    createdContactIds.push(c.id)

    await page.goto(`/contacts/${c.id}`)
    const card = cardByTitle(page, /\bLife events\b/i)
    await card.getByRole("button", { name: /^add$/i }).click()

    const dialog = page.getByRole("dialog", { name: /add life event/i })
    await expect(dialog).toBeVisible()
    const eventTitle = `Got married ${Date.now()}`
    // Use placeholder + type=date input selectors (same shadcn asterisk-label
    // gotcha as the Add Pet test).
    await dialog.getByPlaceholder("Turned 30").fill(eventTitle)
    await dialog.locator('input[type="date"]').fill("2020-06-15")
    await dialog.getByRole("button", { name: /^save$/i }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    // Title appears in both the LifeEvents card and the Timeline — scope.
    await expect(card.getByText(eventTitle)).toBeVisible({ timeout: 10000 })
  })
})

// ─── Custom Fields card ──────────────────────────────────────────────────────

test.describe("Custom Fields card", () => {
  test("Custom fields section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /custom fields/i)).toBeVisible({
      timeout: 10000,
    })
  })

  test("Add custom field dialog opens", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    const card = cardByTitle(page, /custom fields/i)
    await card.getByRole("button", { name: /^add$/i }).click()

    const dialog = page.getByRole("dialog", { name: /add custom field/i })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel(/value/i)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })
})

// ─── Household card ──────────────────────────────────────────────────────────

test.describe("Household card", () => {
  test("Household section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /\bHousehold\b/i)).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── Interaction Locations card ──────────────────────────────────────────────

test.describe("Interaction Locations card", () => {
  test("Interaction Locations section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /interaction locations/i)).toBeVisible({
      timeout: 10000,
    })
  })
})

// ─── Relationships card ──────────────────────────────────────────────────────

test.describe("Relationships card", () => {
  test("Relationships section is visible", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(cardTitle(page, /\bRelationships\b/i)).toBeVisible({
      timeout: 10000,
    })
  })

  test("Add Relationship contact-picker opens", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    const card = cardByTitle(page, /\bRelationships\b/i)
    await expect(card).toBeVisible({ timeout: 15000 })
    // The shadcn popover-trigger button has role="combobox" applied and
    // doesn't expose the inner span text as accessible-name. Click the
    // combobox inside the relationships card directly.
    await card.locator('button[role="combobox"]').first().click()

    await expect(page.getByPlaceholder(/search contacts/i)).toBeVisible({
      timeout: 5000,
    })

    await page.getByPlaceholder(/search contacts/i).fill("Secondary")
    const option = page
      .getByRole("option", { name: /AAADetailSpec Secondary/i })
      .first()
    await expect(option).toBeVisible({ timeout: 5000 })
    await option.click()

    const typeInput = page.getByPlaceholder(/spouse, brother, colleague/i)
    await expect(typeInput).toBeVisible()
    await typeInput.fill("friend")
    // Wait for the inverse-lookup query to settle ("friend" has a known
    // inverse so the manual-inverse field isn't shown).
    await page.waitForTimeout(2000)
    await page.getByRole("button", { name: /^save$/i }).click()

    await expect(
      page.getByRole("link", { name: /AAADetailSpec Secondary/i }).first(),
    ).toBeVisible({ timeout: 10000 })
  })
})

// ─── Tags card (only renders when contact.tags > 0) ──────────────────────────

test.describe("Tags display", () => {
  test("when a contact has tags, the Tags card renders them", async ({
    page,
    request,
  }) => {
    const tagName = `aaa-e2e-tag-${Date.now()}`
    const tag = await createTag(request, token, { name: tagName })
    if (tag?.id) createdTagIds.push(tag.id)

    const c = await createContact(request, token, {
      first_name: `AAATagContact${Date.now()}`,
    })
    createdContactIds.push(c.id)

    // Attach the tag via PATCH /contacts/{id} with tag_ids
    const apiBase = (
      process.env.E2E_BASE_URL ?? "http://localhost:5173"
    ).replace(":5173", ":8001")
    await request.patch(`${apiBase}/api/v1/contacts/${c.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { tag_ids: [tag.id] },
    })

    await page.goto(`/contacts/${c.id}`)
    await expect(cardTitle(page, /\bTags\b/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(tagName)).toBeVisible()
  })
})

// ─── Tabs: Gifts / Debts / Media ─────────────────────────────────────────────

test.describe("Detail tabs", () => {
  test("Gifts tab is selected by default", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    const giftsTab = page.getByRole("tab", { name: /^gifts/i })
    await expect(giftsTab).toBeVisible({ timeout: 10000 })
    // Tabs default to gifts; either data-state="active" or aria-selected="true"
    // is acceptable.
    await expect(giftsTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5000,
    })
  })

  test("Add Gift dialog opens from the Gifts tab", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /^gifts/i }).click()
    await page.getByRole("button", { name: /add gift/i }).first().click()
    const dialog = page.getByRole("dialog", { name: /^add gift$/i })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByPlaceholder("Gift name")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })

  test("creating a gift makes it appear on the Gifts tab", async ({
    page,
    request,
  }) => {
    const c = await createContact(request, token, {
      first_name: `AAAGiftContact${Date.now()}`,
    })
    createdContactIds.push(c.id)

    await page.goto(`/contacts/${c.id}`)
    await page.getByRole("tab", { name: /^gifts/i }).click()
    await page.getByRole("button", { name: /add gift/i }).first().click()

    const dialog = page.getByRole("dialog", { name: /^add gift$/i })
    await expect(dialog).toBeVisible()
    const giftName = `Test Gift ${Date.now()}`
    await dialog.getByPlaceholder("Gift name").fill(giftName)
    await dialog.getByRole("button", { name: /^save$/i }).click()

    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    // The gift name is rendered in the gift card body. The toast surfaces it
    // as "Gift: <name>" — match the row's font-medium element specifically
    // to avoid both strict-mode + toast races.
    await expect(
      page.locator(".text-sm.font-medium").filter({ hasText: giftName }).first(),
    ).toBeVisible({ timeout: 15000 })
  })

  test("Debts tab navigates without error and shows Add Debt button", async ({
    page,
  }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /^debts/i }).click()
    await expect(page.getByRole("tab", { name: /^debts/i })).toHaveAttribute(
      "data-state",
      "active",
    )
    await expect(
      page.getByRole("button", { name: /add debt/i }).first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test("Add Debt dialog opens from the Debts tab", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /^debts/i }).click()
    await page.getByRole("button", { name: /add debt/i }).first().click()

    const dialog = page.getByRole("dialog", { name: /track debt/i })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByPlaceholder("0.00")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })

  test("Media tab navigates without error and shows Add Recommendation button", async ({
    page,
  }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /^media/i }).click()
    await expect(page.getByRole("tab", { name: /^media/i })).toHaveAttribute(
      "data-state",
      "active",
    )
    await expect(
      page.getByRole("button", { name: /add recommendation/i }).first(),
    ).toBeVisible({ timeout: 10000 })
  })

  test("Add Media Recommendation dialog opens from the Media tab", async ({
    page,
  }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /^media/i }).click()
    await page
      .getByRole("button", { name: /add recommendation/i })
      .first()
      .click()

    const dialog = page.getByRole("dialog", {
      name: /add media recommendation/i,
    })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByPlaceholder("e.g. The Bear")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })
})
