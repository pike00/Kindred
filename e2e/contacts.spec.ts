import { test, expect } from "@playwright/test"
import { getToken, createContact, deleteContact } from "./helpers/api.js"

let token: string
const createdIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.afterAll(async ({ request }) => {
  for (const id of createdIds) {
    await deleteContact(request, token, id).catch(() => {})
  }
})

test.describe("Contacts list", () => {
  test("page renders", async ({ page }) => {
    await page.goto("/contacts")
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible()
  })

  test("add contact dialog opens", async ({ page }) => {
    await page.goto("/contacts")
    await page.getByRole("button", { name: /add contact/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("create a contact and it appears in the list", async ({ page, request }) => {
    const name = `E2ECreate ${Date.now()}`
    const c = await createContact(request, token, { first_name: name })
    createdIds.push(c.id)

    await page.goto("/contacts")
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 })
  })

  test("search filters contacts by name", async ({ page, request }) => {
    const name = `SearchTest ${Date.now()}`
    const c = await createContact(request, token, { first_name: name })
    createdIds.push(c.id)

    await page.goto("/contacts")
    await page.getByPlaceholder(/search/i).fill(name)
    await expect(page.getByText(name)).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Contacts kanban", () => {
  test("loads with stage columns", async ({ page }) => {
    await page.goto("/contacts/kanban")
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible()
    await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Contacts map", () => {
  test("renders without error", async ({ page }) => {
    await page.goto("/contacts/map")
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByText(/oops|something went wrong/i)).not.toBeVisible()
  })
})

test.describe("Contact detail", () => {
  test("opens contact detail page", async ({ page, request }) => {
    const c = await createContact(request, token, {
      first_name: "DetailTest",
      last_name: "User",
    })
    createdIds.push(c.id)

    await page.goto(`/contacts/${c.id}`)
    await expect(page.getByText(/DetailTest/)).toBeVisible({ timeout: 5000 })
  })
})
