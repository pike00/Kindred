import { expect, test } from "@playwright/test"
import {
  cleanupContacts,
  clickAddInCard,
  clickDialogSave,
  clickRowAction,
  createContact,
  fillFieldByLabel,
  getAuthToken,
  loginViaUI,
  testId,
} from "./helpers"

test.describe("CustomFieldsCard", () => {
  let token: string
  let contactId: string
  const firstName = `E2ECustom${testId()}`
  const lastName = "Test"

  test.beforeAll(async () => {
    token = await getAuthToken()
    await cleanupContacts(token)
    const contact = await createContact(token, firstName, lastName)
    contactId = contact.id
  })

  test.afterAll(async () => {
    await cleanupContacts(token)
  })

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page)
    await page.goto(`/contacts/${contactId}`)
    await page.waitForLoadState("networkidle")
  })

  test("add custom field value", async ({ page }) => {
    // Click Add in Custom Fields card
    await clickAddInCard(page, "Custom fields")

    // Wait for dialog
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Select a field definition from the dropdown
    const selectTrigger = dialog.getByRole("combobox")
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click()
      await page.waitForTimeout(500)
      // Select the first available option
      await page.getByRole("option").first().click()
    }

    // Fill value
    await fillFieldByLabel(page, "Value", "Custom Value E2E Test")

    // Save
    await clickDialogSave(page)

    // Wait for success
    await page.waitForTimeout(2000)

    // Verify the custom field value appears
    await expect(page.getByText("Custom Value E2E Test")).toBeVisible()
  })

  test("edit custom field value", async ({ page }) => {
    // Click edit on the custom field row
    await clickRowAction(page, "Custom fields", "Edit")

    // Wait for dialog
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Update value
    const valueInput = dialog.getByRole("textbox")
    await valueInput.clear()
    await valueInput.fill("Updated Custom Value")

    // Save
    await clickDialogSave(page)

    // Wait for success
    await page.waitForTimeout(2000)

    // Verify updated value appears
    await expect(page.getByText("Updated Custom Value")).toBeVisible()
  })

  test("delete custom field value", async ({ page }) => {
    // Click delete on the custom field row
    await clickRowAction(page, "Custom fields", "Delete")

    // Handle confirmation
    await page.waitForTimeout(500)
    if (await page.getByText("Delete this custom field value?").isVisible()) {
      await page.getByRole("button", { name: /confirm|yes|delete/i }).click()
    }

    // Wait for deletion
    await page.waitForTimeout(2000)

    // Verify custom field is removed
    await expect(page.getByText("Updated Custom Value")).not.toBeVisible()
  })
})
