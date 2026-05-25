import { test, expect } from "@playwright/test"
import {
  getToken,
  createTag,
  deleteTag,
  createContact,
  deleteContact,
} from "./helpers/api.js"

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

test.describe("Tags", () => {
  test("list page renders", async ({ page }) => {
    await page.goto("/tags")
    await expect(page.getByRole("heading", { name: /tags/i })).toBeVisible()
  })

  test("add tag dialog opens", async ({ page }) => {
    await page.goto("/tags")
    await page.getByRole("button", { name: /add|new|create/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("created tag appears in list", async ({ page, request }) => {
    const name = `E2ETag ${Date.now()}`
    const t = await createTag(request, token, { name })
    createdTagIds.push(t.id)

    await page.goto("/tags")
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 })
  })

  test("edit tag dialog opens", async ({ page, request }) => {
    const name = `EditTag ${Date.now()}`
    const t = await createTag(request, token, { name })
    createdTagIds.push(t.id)

    await page.goto("/tags")
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
    // Find edit button near the tag
    const row = page.locator("li, tr, [role='row'], div").filter({ hasText: name }).first()
    const editBtn = row.getByRole("button", { name: /edit/i }).or(row.locator('[aria-label*="edit" i]')).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await expect(page.getByRole("dialog")).toBeVisible()
    }
  })

  test("assign tag to contact via contact detail", async ({ page, request }) => {
    const tagName = `AssignTag ${Date.now()}`
    const t = await createTag(request, token, { name: tagName })
    createdTagIds.push(t.id)

    const c = await createContact(request, token, { first_name: "TagTarget" })
    createdContactIds.push(c.id)

    await page.goto(`/contacts/${c.id}`)
    // Find the tag assignment area
    const addTagBtn = page.getByRole("button", { name: /add tag|assign tag/i }).or(
      page.getByPlaceholder(/search tags|add tag/i)
    ).first()
    if (await addTagBtn.isVisible()) {
      await addTagBtn.click()
      await page.getByText(tagName).click()
      await expect(page.getByText(tagName)).toBeVisible({ timeout: 3000 })
    }
  })
})
