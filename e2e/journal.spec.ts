import { test, expect } from "@playwright/test"
import {
  getToken,
  createJournalEntry,
  deleteJournalEntry,
} from "./helpers/api.js"

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

test.describe("Journal", () => {
  test("list page renders", async ({ page }) => {
    await page.goto("/journal")
    await expect(page.getByRole("heading", { name: /journal/i })).toBeVisible()
  })

  test("new entry dialog opens", async ({ page }) => {
    await page.goto("/journal")
    await page.getByRole("button", { name: /add|new|create/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("created entry appears in list", async ({ page, request }) => {
    const title = `E2E Journal ${Date.now()}`
    const entry = await createJournalEntry(request, token, { title })
    createdIds.push(entry.id)

    await page.goto("/journal")
    await expect(page.getByText(title)).toBeVisible({ timeout: 8000 })
  })

  test("entry edit dialog opens", async ({ page, request }) => {
    const title = `EditEntry ${Date.now()}`
    const entry = await createJournalEntry(request, token, { title })
    createdIds.push(entry.id)

    await page.goto("/journal")
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 })
    await page.getByText(title).click()
    // Either a dialog opens or we navigate to an edit page
    const isDialog = await page.getByRole("dialog").isVisible().catch(() => false)
    const hasEditField = await page.getByLabel(/title/i).isVisible().catch(() => false)
    expect(isDialog || hasEditField).toBe(true)
  })
})
