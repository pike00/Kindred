import { test, expect } from "@playwright/test"
import { getToken, createContact, deleteContact } from "./helpers/api.js"

let token: string
let contactId: string

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
  const c = await createContact(request, token, {
    first_name: "DetailSpec",
    last_name: "Contact",
  })
  contactId = c.id
})

test.afterAll(async ({ request }) => {
  await deleteContact(request, token, contactId).catch(() => {})
})

test.describe("Contact detail tabs", () => {
  test("Gifts tab is visible by default", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByRole("tab", { name: /gifts/i })).toBeVisible()
  })

  test("Debts tab navigates without error", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /debts/i }).click()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
  })

  test("Media tab navigates without error", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await page.getByRole("tab", { name: /media/i }).click()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
  })

  test("Reminders section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/reminders/i)).toBeVisible({ timeout: 5000 })
  })

  test("Notes section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/notes/i)).toBeVisible({ timeout: 5000 })
  })

  test("Interactions section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/interactions/i)).toBeVisible({ timeout: 5000 })
  })

  test("Relationships section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/relationships/i)).toBeVisible({ timeout: 5000 })
  })

  test("Life Events section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/life events/i)).toBeVisible({ timeout: 5000 })
  })

  test("Addresses section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/addresses/i)).toBeVisible({ timeout: 5000 })
  })

  test("Pets section is present", async ({ page }) => {
    await page.goto(`/contacts/${contactId}`)
    await expect(page.getByText(/pets/i)).toBeVisible({ timeout: 5000 })
  })
})
