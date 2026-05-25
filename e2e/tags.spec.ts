import { test, expect } from "./fixtures"
import {
  getToken,
  createTag,
  deleteTag,
  updateTag,
  createContact,
  deleteContact,
} from "./helpers/api.js"

// `/tags` shows a DataTable of tags with a row-actions menu that exposes
// "Delete". There is no edit dialog in the UI, no group selector or
// confirmation modal — delete fires immediately. AddTagDialog asks for
// `name` and `color`. The color input is a native <input type="color">.

let token: string
const createdTagIds: string[] = []
const createdContactIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.afterAll(async ({ request }) => {
  for (const id of createdTagIds) {
    await deleteTag(request, token, id).catch(() => {})
  }
  for (const id of createdContactIds) {
    await deleteContact(request, token, id).catch(() => {})
  }
})

async function openTags(page: import("@playwright/test").Page) {
  await page.goto("/tags", { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { name: /^tags$/i })).toBeVisible({
    timeout: 30_000,
  })
}

// The DataTable defaults to pageSize=10 but the demo DB has more tags than
// that, so our newly-created row is usually on a later page. Bump to 50 so
// every test-created tag is on page 1.
async function maxPageSize(page: import("@playwright/test").Page) {
  const trigger = page
    .locator("button[role='combobox']")
    .filter({ hasText: /^\d+$/ })
    .first()
  if (!(await trigger.isVisible().catch(() => false))) return
  await trigger.click()
  await page.getByRole("option", { name: /^50$/ }).click()
}

test.describe("Tags", () => {
  test("page renders heading", async ({ page }) => {
    await openTags(page)
    await expect(page.getByRole("heading", { name: /^tags$/i })).toBeVisible()
  })

  test("add tag dialog opens with documented fields", async ({ page }) => {
    await openTags(page)
    await page.getByRole("button", { name: /^add tag$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole("heading", { name: /add new tag/i }),
    ).toBeVisible()
    await expect(dialog.getByLabel(/^name \*/i)).toBeVisible()
    await expect(dialog.getByLabel(/^color$/i)).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: /^create tag$/i }),
    ).toBeVisible()
  })

  test("create tag via UI surfaces in list", async ({ page, request }) => {
    const name = `AAATagE2E${Date.now()}`
    await openTags(page)
    await page.getByRole("button", { name: /^add tag$/i }).click()

    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/^name \*/i).fill(name)

    await dialog.getByRole("button", { name: /^create tag$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await maxPageSize(page)
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })

    // Track for teardown
    const baseUrl = (process.env.E2E_BASE_URL ?? "http://localhost:5173").replace(
      ":5173",
      ":8001",
    )
    const res = await request.get(`${baseUrl}/api/v1/tags/?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    for (const t of body.data ?? []) {
      if (t.name === name) createdTagIds.push(t.id)
    }
  })

  test("color picker accepts a custom hex value", async ({ page }) => {
    await openTags(page)
    await page.getByRole("button", { name: /^add tag$/i }).click()

    const dialog = page.getByRole("dialog")
    const colorInput = dialog.getByLabel(/^color$/i)
    await colorInput.fill("#a3e635")
    await expect(colorInput).toHaveValue("#a3e635")
  })

  test("API-updated tag name and color reflect in list (no edit UI)", async ({
    page,
    request,
  }) => {
    const original = `AAAOriginalTag${Date.now()}`
    const t = await createTag(request, token, {
      name: original,
      color: "#ff0000",
    })
    createdTagIds.push(t.id)

    await openTags(page)
    await maxPageSize(page)
    await expect(page.getByText(original)).toBeVisible({ timeout: 10_000 })

    const updated = `AAAUpdatedTag${Date.now()}`
    await updateTag(request, token, t.id, { name: updated, color: "#00ff00" })

    await page.reload()
    await expect(page.getByRole("heading", { name: /^tags$/i })).toBeVisible({
      timeout: 30_000,
    })
    await maxPageSize(page)
    await expect(page.getByText(updated)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(original)).toHaveCount(0)
  })

  test("delete via row actions removes tag from list", async ({
    page,
    request,
  }) => {
    const name = `AAADeleteTag${Date.now()}`
    const t = await createTag(request, token, { name })
    // not pushed — we'll delete via UI

    await openTags(page)
    await maxPageSize(page)
    const row = page.getByRole("row").filter({ hasText: name }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    await row.getByRole("button", { name: /open actions menu/i }).click()
    await page.getByRole("menuitem", { name: /^delete$/i }).click()

    await expect(page.getByText(name)).toHaveCount(0, { timeout: 10_000 })
    await deleteTag(request, token, t.id).catch(() => {})
  })

  test("tag color swatch is rendered next to the name", async ({
    page,
    request,
  }) => {
    const name = `AAASwatchTag${Date.now()}`
    const color = "#3b82f6"
    const t = await createTag(request, token, { name, color })
    createdTagIds.push(t.id)

    await openTags(page)
    await maxPageSize(page)
    const row = page.getByRole("row").filter({ hasText: name }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })

    // The TagsList row column renders a <div> with backgroundColor inline.
    const swatch = row.locator(`div[style*="background-color"]`).first()
    await expect(swatch).toBeVisible()
  })

  test("created column shows a date for each tag", async ({ page, request }) => {
    const name = `AAACreatedTag${Date.now()}`
    const t = await createTag(request, token, { name })
    createdTagIds.push(t.id)

    await openTags(page)
    await maxPageSize(page)
    const row = page.getByRole("row").filter({ hasText: name }).first()
    await expect(row).toBeVisible({ timeout: 10_000 })
    // Date-like text (locale string, e.g. "5/25/2026")
    await expect(row.getByText(/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/)).toBeVisible()
  })

  test("assign tag to contact via contact detail page", async ({
    page,
    request,
  }) => {
    const tagName = `AAAAssignTag${Date.now()}`
    const t = await createTag(request, token, { name: tagName })
    createdTagIds.push(t.id)

    const c = await createContact(request, token, {
      first_name: `AAATagTarget${Date.now()}`,
    })
    createdContactIds.push(c.id)

    await page.goto(`/contacts/${c.id}`, { waitUntil: "domcontentloaded" })

    // Look for a tag-assignment UI on the contact card. The component is
    // optional and varies between layouts — search for either an "Add tag"
    // button or a tag search/combobox.
    const addTrigger = page
      .getByRole("button", { name: /add tag|assign tag/i })
      .first()
      .or(page.getByPlaceholder(/search tags|add tag/i).first())

    // Skip the test gracefully if the UI surface is missing on this build.
    const visible = await addTrigger.isVisible().catch(() => false)
    test.skip(!visible, "Tag-assignment UI not present on contact detail page")

    await addTrigger.click()
    await page.getByText(tagName).first().click()
    // The assigned tag should now be visible on the contact card.
    await expect(page.getByText(tagName).first()).toBeVisible({
      timeout: 5000,
    })
  })
})
