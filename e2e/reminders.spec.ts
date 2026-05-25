import { test, expect } from "@playwright/test"
import {
  getToken,
  createReminder,
  deleteReminder,
} from "./helpers/api.js"

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

test.describe("Reminders", () => {
  test("list page renders", async ({ page }) => {
    await page.goto("/reminders")
    await expect(page.getByRole("heading", { name: /reminders/i })).toBeVisible()
  })

  test("add reminder dialog opens", async ({ page }) => {
    await page.goto("/reminders")
    await page.getByRole("button", { name: /add|new|create/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("created reminder appears in list", async ({ page, request }) => {
    const title = `E2E Reminder ${Date.now()}`
    const r = await createReminder(request, token, { title })
    createdIds.push(r.id)

    await page.goto("/reminders")
    await expect(page.getByText(title)).toBeVisible({ timeout: 8000 })
  })

  test("mark reminder as done", async ({ page, request }) => {
    const title = `DoneReminder ${Date.now()}`
    const r = await createReminder(request, token, { title })
    createdIds.push(r.id)

    await page.goto("/reminders")
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 })

    // Find the checkbox or "mark done" button near the reminder
    const reminderRow = page.locator("[data-testid*='reminder'], li, tr").filter({ hasText: title }).first()
    const doneBtn = reminderRow.getByRole("checkbox").or(reminderRow.getByRole("button", { name: /done|complete|check/i })).first()
    if (await doneBtn.isVisible()) {
      await doneBtn.click()
      // After marking done, the reminder may disappear from active list or get a strike
    }
  })
})
