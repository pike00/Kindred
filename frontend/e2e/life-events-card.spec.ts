import { test, expect } from "@playwright/test";
import {
  getAuthToken,
  createContact,
  cleanupContacts,
  loginViaUI,
  testId,
  clickAddInCard,
  clickDialogSave,
  fillFieldByLabel,
  clickRowAction,
} from "./helpers";

test.describe("LifeEventsCard", () => {
  let token: string;
  let contactId: string;
  const firstName = `E2ELife${testId()}`;
  const lastName = "Test";

  test.beforeAll(async () => {
    token = await getAuthToken();
    await cleanupContacts(token);
    const contact = await createContact(token, firstName, lastName);
    contactId = contact.id;
  });

  test.afterAll(async () => {
    await cleanupContacts(token);
  });

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
    await page.goto(`/contacts/${contactId}`);
    await page.waitForLoadState("networkidle");
  });

  test("add life event", async ({ page }) => {
    // Click Add in Life Events card
    await clickAddInCard(page, "Life events");

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Select event type (anniversary is default, but let's click it to be sure)
    const anniversaryButton = dialog.getByRole("button", { name: /anniversary/i });
    if (await anniversaryButton.isVisible()) {
      await anniversaryButton.click();
    }

    // Fill title
    await fillFieldByLabel(page, "Title", "Wedding Anniversary");

    // Fill date - use a date input
    const dateInput = dialog.getByLabel("Date");
    await dateInput.fill("2024-06-15");

    // Fill description
    await fillFieldByLabel(page, "Description", "Celebrated 5 years");

    // Check annual reminder checkbox if present
    const reminderCheckbox = dialog.getByRole("checkbox", { name: /annual/i });
    if (await reminderCheckbox.isVisible()) {
      await reminderCheckbox.check();
    }

    // Save
    await clickDialogSave(page);

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify event appears in the card
    await expect(page.getByText("Wedding Anniversary")).toBeVisible();
  });

  test("edit life event", async ({ page }) => {
    // Click edit on the life event row
    await clickRowAction(page, "Life events", "Edit");

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Update title
    const titleInput = dialog.getByLabel("Title");
    await titleInput.clear();
    await titleInput.fill("Updated Anniversary");

    // Save
    await clickDialogSave(page);

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify updated event appears
    await expect(page.getByText("Updated Anniversary")).toBeVisible();
  });

  test("delete life event", async ({ page }) => {
    // Click delete on the life event row
    await clickRowAction(page, "Life events", "Delete");

    // Handle confirmation
    await page.waitForTimeout(500);
    if (await page.getByText("Delete this event?").isVisible()) {
      await page.getByRole("button", { name: /confirm|yes|delete/i }).click();
    }

    // Wait for deletion
    await page.waitForTimeout(2000);

    // Verify event is removed
    await expect(page.getByText("Updated Anniversary")).not.toBeVisible();
  });
});
