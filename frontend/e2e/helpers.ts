import { Page, expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

/**
 * Test user credentials for the local auth mode.
 */
export const TEST_USER = {
  email: process.env.FIRST_SUPERUSER || "removed@example.com",
  password: process.env.FIRST_SUPERUSER_PASSWORD || "changeme",
  fullName: "Admin",
};

/**
 * API base URL (backend).
 */
export function getApiBase(): string {
  return process.env.INTERNAL_API_URL || "http://localhost:8000";
}

/**
 * Frontend base URL.
 */
export function getFrontendBase(): string {
  return process.env.VITE_API_URL?.replace(/\/api.*$/, "") || "http://localhost:5173";
}

/**
 * Obtain a JWT token for API calls.
 */
export async function getAuthToken(): Promise<string> {
  const apiBase = getApiBase();
  const resp = await fetch(`${apiBase}/api/v1/login/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${encodeURIComponent(TEST_USER.email)}&password=${encodeURIComponent(TEST_USER.password)}`,
  });
  if (!resp.ok) {
    throw new Error(`Auth failed: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  return data.access_token;
}

/**
 * Clean up all contacts for the test user via API.
 */
export async function cleanupContacts(token: string): Promise<void> {
  const apiBase = getApiBase();
  const resp = await fetch(`${apiBase}/api/v1/contacts/?limit=1000`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return;
  const data = await resp.json();
  const contacts = data.data || [];
  await Promise.all(
    contacts.map((c: any) =>
      fetch(`${apiBase}/api/v1/contacts/${c.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    )
  );
}

/**
 * Create a contact via API and return the contact data.
 */
export async function createContact(
  token: string,
  firstName: string,
  lastName: string
): Promise<any> {
  const apiBase = getApiBase();
  const resp = await fetch(`${apiBase}/api/v1/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  if (!resp.ok) {
    throw new Error(`Create contact failed: ${resp.status} ${await resp.text()}`);
  }
  return resp.json();
}

/**
 * Login via the UI (local auth mode).
 */
export async function loginViaUI(page: Page): Promise<void> {
  const frontendBase = getFrontendBase();
  await page.goto(`${frontendBase}/login`);

  // Check if already logged in (redirected away from login)
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/login")) return;

  // Fill in credentials
  await page.getByTestId("email-input").fill(TEST_USER.email);
  await page.getByTestId("password-input").fill(TEST_USER.password);
  await page.getByRole("button", { name: /sign in|login/i }).click();

  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });
}

/**
 * Navigate to a sidebar link by name.
 */
export async function navigateTo(page: Page, linkText: string): Promise<void> {
  const pathMap: Record<string, string> = {
    Dashboard: "/",
    Contacts: "/contacts",
    Interactions: "/interactions",
    Tags: "/tags",
    Groups: "/groups",
    Reminders: "/reminders",
    Journal: "/journal",
    Admin: "/admin",
  };

  // Try clicking sidebar link first
  const sidebar = page.getByRole("navigation").first();
  const link = sidebar.getByRole("link", { name: linkText, exact: false });
  if ((await link.count()) > 0) {
    await link.first().click();
    await page.waitForLoadState("networkidle");
    return;
  }

  // Fallback: navigate directly
  const path = pathMap[linkText];
  if (path) {
    const frontendBase = getFrontendBase();
    await page.goto(`${frontendBase}${path}`);
    await page.waitForLoadState("networkidle");
  } else {
    throw new Error(`No navigation mapping for "${linkText}"`);
  }
}

/**
 * Click the "Add" button inside a specific card by card title.
 */
export async function clickAddInCard(page: Page, cardTitle: string): Promise<void> {
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.locator('[data-slot="card-title"]').filter({ hasText: new RegExp(cardTitle, "i") }) });
  const addButton = card.getByRole("button").first();
  await addButton.click();
  await page.waitForTimeout(500);
}

/**
 * Click the "Save" button inside an open dialog.
 */
export async function clickDialogSave(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /save/i }).click();
  await page.waitForTimeout(1500);
}

/**
 * Check if a dialog is currently open.
 */
export async function isDialogOpen(page: Page): Promise<boolean> {
  return (await page.getByRole("dialog").count()) > 0;
}

/**
 * Fill a form field by its label text.
 */
export async function fillFieldByLabel(
  page: Page,
  labelText: string,
  value: string
): Promise<void> {
  const dialog = page.getByRole("dialog");
  const target = dialog.locator("label").filter({ hasText: labelText }).first();
  const input = dialog
    .locator("input, textarea")
    .filter({ has: target })
    .or(dialog.locator(`input[aria-label*="${labelText}"], textarea[aria-label*="${labelText}"]`))
    .first();

  // Try to find input associated with the label
  const label = dialog.locator("label").filter({ hasText: labelText }).first();
  const inputId = await label.getAttribute("for");
  let field: any;
  if (inputId) {
    field = page.locator(`#${inputId}`);
  } else {
    // Look for input within the label's parent
    field = label.locator("..").locator("input, textarea").first();
  }

  await field.clear();
  await field.fill(value);
}

/**
 * Open the row actions menu for an item in a card, then click the menu item.
 */
export async function clickRowAction(
  page: Page,
  cardTitle: string,
  menuItemText: string
): Promise<void> {
  // Find the card by title
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.locator('[data-slot="card-title"]').filter({ hasText: new RegExp(cardTitle, "i") }) });

  // Click the actions trigger button in the card
  const trigger = card.getByRole("button", { name: /open actions menu/i }).first();
  await trigger.click();
  await page.waitForTimeout(400);

  // Click the menu item
  await page.getByRole("menuitem", { name: menuItemText }).click();
  await page.waitForTimeout(400);
}

/**
 * Click a tab by name.
 */
export async function clickTab(page: Page, tabText: string): Promise<void> {
  await page.getByRole("tab", { name: new RegExp(tabText, "i") }).click();
  await page.waitForTimeout(500);
}

/**
 * Wait for toast notification and return its text.
 */
export async function getToastText(page: Page): Promise<string | null> {
  await page.waitForTimeout(500);
  const toast = page.locator('[data-sonner-toast]');
  if ((await toast.count()) > 0) {
    return (await toast.first().textContent()) || null;
  }
  return null;
}

/**
 * Generate a unique test identifier.
 */
export function testId(): string {
  return uuidv4().slice(0, 8);
}
