import { test, expect } from "@playwright/test"
import {
  getToken,
  createContact,
  deleteContact,
  createInteraction,
  deleteInteraction,
  listInteractions,
} from "./helpers/api.js"

let token: string
let contactId: string
const createdIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
  const c = await createContact(request, token, { first_name: "InteractionSpec" })
  contactId = c.id
})

test.afterAll(async ({ request }) => {
  for (const id of createdIds) {
    await deleteInteraction(request, token, id).catch(() => {})
  }
  await deleteContact(request, token, contactId).catch(() => {})
})

test.describe("Interactions", () => {
  test("list page renders", async ({ page }) => {
    await page.goto("/interactions")
    await expect(page.getByRole("heading", { name: /interactions/i })).toBeVisible()
  })

  test("add interaction dialog opens", async ({ page }) => {
    await page.goto("/interactions")
    await page.getByRole("button", { name: /add|log|new|create/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("created interaction appears in list", async ({ page, request }) => {
    const summary = `E2E call ${Date.now()}`
    const interaction = await createInteraction(request, token, {
      contact_id: contactId,
      summary,
    })
    createdIds.push(interaction.id)

    await page.goto("/interactions")
    await expect(page.getByText(summary)).toBeVisible({ timeout: 8000 })
  })

  test("interaction detail/edit dialog opens", async ({ page, request }) => {
    const summary = `EditTest ${Date.now()}`
    const interaction = await createInteraction(request, token, {
      contact_id: contactId,
      summary,
    })
    createdIds.push(interaction.id)

    await page.goto("/interactions")
    await expect(page.getByText(summary)).toBeVisible({ timeout: 5000 })
    // Click on the interaction to open detail/edit
    await page.getByText(summary).click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 })
  })
})
