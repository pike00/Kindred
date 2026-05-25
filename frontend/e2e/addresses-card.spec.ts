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

test.describe("AddressesCard", () => {
  let token: string
  let contactId: string
  const firstName = `E2EAddr${testId()}`
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

  test("add address", async ({ page }) => {
    // Click Add in Addresses card
    await clickAddInCard(page, "Addresses")

    // Wait for dialog
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Fill address fields
    await fillFieldByLabel(page, "Label", "Home")
    await fillFieldByLabel(page, "Street", "123 Main Street")
    await fillFieldByLabel(page, "Apt / Suite", "Apt 4B")
    await fillFieldByLabel(page, "City", "Brooklyn")
    await fillFieldByLabel(page, "Region / State", "NY")
    await fillFieldByLabel(page, "Postal code", "11201")
    await fillFieldByLabel(page, "Country", "USA")

    // Save
    await clickDialogSave(page)

    // Wait for success
    await page.waitForTimeout(2000)

    // Verify address appears in the card
    await expect(page.getByText("123 Main Street")).toBeVisible()
    await expect(page.getByText("Brooklyn")).toBeVisible()
  })

  test("edit address", async ({ page }) => {
    // Click edit on the address row
    await clickRowAction(page, "Addresses", "Edit")

    // Wait for dialog
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    // Update city
    const cityInput = dialog.getByLabel("City")
    await cityInput.clear()
    await cityInput.fill("Queens")

    // Save
    await clickDialogSave(page)

    // Wait for success
    await page.waitForTimeout(2000)

    // Verify updated city appears
    await expect(page.getByText("Queens")).toBeVisible()
  })

  test("delete address", async ({ page }) => {
    // Click delete on the address row
    await clickRowAction(page, "Addresses", "Delete")

    // Handle confirmation
    await page.waitForTimeout(500)
    if (await page.getByText("Delete this address?").isVisible()) {
      await page.getByRole("button", { name: /confirm|yes|delete/i }).click()
    }

    // Wait for deletion
    await page.waitForTimeout(2000)

    // Verify address is removed (check that the street is gone)
    await expect(page.getByText("123 Main Street")).not.toBeVisible()
  })
})
