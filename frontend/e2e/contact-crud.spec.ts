import { expect, test } from "@playwright/test"
import {
  cleanupContacts,
  createContact,
  getAuthToken,
  loginViaUI,
  navigateTo,
  testId,
} from "./helpers"

test.describe("Contact CRUD", () => {
  let token: string
  let contactId: string
  const firstName = `E2E${testId()}`
  const lastName = "TestUser"

  test.beforeAll(async () => {
    token = await getAuthToken()
    await cleanupContacts(token)
  })

  test.afterAll(async () => {
    await cleanupContacts(token)
  })

  test("create contact via API and verify in UI", async ({ page }) => {
    // Create contact via API
    const contact = await createContact(token, firstName, lastName)
    contactId = contact.id

    // Login and navigate to contacts
    await loginViaUI(page)
    await navigateTo(page, "Contacts")

    // Verify contact appears in the list
    await expect(page.getByText(`${firstName} ${lastName}`)).toBeVisible()
  })

  test("edit contact via UI", async ({ page }) => {
    test.skip(!contactId, "Contact ID not set")

    await loginViaUI(page)
    await navigateTo(page, "Contacts")

    // Click on the contact to open detail view
    await page.getByText(`${firstName} ${lastName}`).click()
    await page.waitForURL((url) => url.pathname.includes("/contacts/"))

    // Click edit button
    await page.getByRole("button", { name: /edit/i }).click()

    // Wait for dialog to open
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Update nickname
    const nicknameField = dialog.getByLabel("Nickname")
    await nicknameField.clear()
    await nicknameField.fill("E2E Test Nickname")

    // Update how we met
    const howWeMetField = dialog.getByLabel("How We Met")
    await howWeMetField.clear()
    await howWeMetField.fill("Met at E2E testing")

    // Save
    await dialog.getByRole("button", { name: /update contact/i }).click()

    // Wait for dialog to close and toast to appear
    await page.waitForTimeout(2000)

    // Verify the updated info appears (nickname should be visible)
    await expect(page.getByText("E2E Test Nickname")).toBeVisible()
  })

  test("delete contact via UI", async ({ page }) => {
    test.skip(!contactId, "Contact ID not set")

    await loginViaUI(page)
    await navigateTo(page, "Contacts")

    // Find and click on the contact
    await page.getByText(`${firstName} ${lastName}`).click()
    await page.waitForURL((url) => url.pathname.includes("/contacts/"))

    // Look for delete action - check for a delete button or menu
    const deleteButton = page.getByRole("button", { name: /delete/i })
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Handle confirmation dialog if present
      await page.waitForTimeout(500)
      const confirmButton = page.getByRole("button", {
        name: /confirm|yes|delete/i,
      })
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
      }
    }

    await page.waitForTimeout(2000)

    // Verify contact is removed from the list
    await navigateTo(page, "Contacts")
    await expect(page.getByText(`${firstName} ${lastName}`)).not.toBeVisible()

    // Clear contactId since we deleted it
    contactId = ""
  })
})
