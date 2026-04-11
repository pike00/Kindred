import puppeteer, { Browser, BrowserContext, Page } from "puppeteer";

export const BASE_URL = "http://localhost:5173";
export const API_URL = "http://localhost:8001";
export const TEST_USER = {
  email: "admin@example.com",
  password: "changethis",
  fullName: "Admin",
};

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function freshPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  return { context, page };
}

export async function login(page: Page): Promise<void> {
  // Clear any existing state first
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  // Check if we got redirected to dashboard (already logged in)
  if (!page.url().includes("/login")) {
    return; // Already logged in
  }
  const emailInput = await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });
  await emailInput!.click({ count: 3 });
  await emailInput!.type(TEST_USER.email);
  const pwInput = await page.waitForSelector(
    '[data-testid="password-input"]',
    { timeout: 5000 },
  );
  await pwInput!.click({ count: 3 });
  await pwInput!.type(TEST_USER.password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  // Give React time to render
  await sleep(1500);
  // Verify we made it past login
  const url = page.url();
  if (url.includes("/login")) {
    throw new Error("Login failed - still on login page");
  }
}

export async function navigateTo(
  page: Page,
  linkText: string,
): Promise<void> {
  // Try to click sidebar link by text content
  const found = await page.evaluate((text: string) => {
    const links = Array.from(document.querySelectorAll("a"));
    const link = links.find(
      (l) => l.textContent?.trim() === text,
    );
    if (link) {
      (link as HTMLAnchorElement).click();
      return true;
    }
    return false;
  }, linkText);

  if (found) {
    await sleep(1500);
  } else {
    // Fallback: navigate via URL based on link text
    const pathMap: { [key: string]: string } = {
      "Dashboard": "/",
      "Contacts": "/contacts",
      "Interactions": "/interactions",
      "Tags": "/tags",
      "Groups": "/groups",
      "Reminders": "/reminders",
      "Journal": "/journal",
      "Admin": "/admin",
    };
    const path = pathMap[linkText];
    if (path) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2" });
      await sleep(1500);
    } else {
      throw new Error(`Navigation link "${linkText}" not found and no URL mapping exists`);
    }
  }
}

export async function clickButton(
  page: Page,
  text: string,
): Promise<void> {
  const found = await page.evaluate((t: string) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.textContent?.trim() === t);
    if (btn) {
      (btn as HTMLButtonElement).click();
      return true;
    }
    return false;
  }, text);
  if (found) {
    await sleep(500);
  } else {
    throw new Error(`Button "${text}" not found`);
  }
}

export async function waitForText(
  page: Page,
  text: string,
  timeout = 5000,
): Promise<boolean> {
  try {
    await page.waitForFunction(
      (t: string) => document.body.innerText.includes(t),
      { timeout },
      text,
    );
    return true;
  } catch {
    return false;
  }
}

export async function fillInput(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  const el = await page.waitForSelector(selector, { timeout: 5000 });
  await el!.click({ count: 3 });
  await el!.type(value);
}

export async function fillInputByLabel(
  page: Page,
  labelText: string,
  value: string,
): Promise<void> {
  const found = await page.evaluate((label: string, val: string) => {
    const labels = Array.from(document.querySelectorAll("label"));
    const l = labels.find((el) => el.textContent?.includes(label));
    if (!l) return false;

    // Try to find input within or after the label
    let input = l.querySelector("input, textarea");
    if (!input) {
      const parent = l.parentElement;
      if (parent) {
        input = parent.querySelector("input, textarea");
      }
    }

    if (input) {
      const el = input as HTMLInputElement | HTMLTextAreaElement;
      el.click();
      // Clear and set value
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }, labelText, value);

  if (!found) {
    throw new Error(`Input for label "${labelText}" not found`);
  }
}

export async function selectOption(
  page: Page,
  triggerText: string,
  optionText: string,
): Promise<void> {
  // Click the select trigger
  const triggerFound = await page.evaluate((text: string) => {
    const triggers = Array.from(
      document.querySelectorAll('[role="combobox"], button[data-slot="select-trigger"]'),
    );
    const t = triggers.find((tr) => tr.textContent?.includes(text));
    if (t) {
      (t as HTMLElement).click();
      return true;
    }
    return false;
  }, triggerText);
  if (triggerFound) {
    await sleep(300);
  }
  // Click the option - try exact match first, then substring match
  const optionFound = await page.evaluate((text: string) => {
    const options = Array.from(
      document.querySelectorAll('[role="option"], [data-slot="select-item"]'),
    );
    let o = options.find((opt) => opt.textContent?.trim() === text);
    if (!o) {
      // Try substring match
      o = options.find((opt) => opt.textContent?.includes(text));
    }
    if (o) {
      (o as HTMLElement).click();
      return true;
    }
    return false;
  }, optionText);
  if (!optionFound) {
    throw new Error(`Option "${optionText}" not found`);
  }
  await sleep(300);
}

export async function clickTab(
  page: Page,
  tabText: string,
): Promise<void> {
  // Use evaluate with inline click for Radix UI tabs
  const found = await page.evaluate((text: string) => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const tab = tabs.find((t) => t.textContent?.includes(text));
    if (tab) {
      (tab as HTMLElement).click();
      return true;
    }
    return false;
  }, tabText);
  if (!found) throw new Error(`Tab "${tabText}" not found`);
  await sleep(500);
}

export async function getPageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

export async function getToastText(page: Page): Promise<string | null> {
  await sleep(500);
  return page.evaluate(() => {
    const toast = document.querySelector('[data-sonner-toast]');
    return toast?.textContent || null;
  });
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function screenshotOnFail(
  page: Page,
  testName: string,
): Promise<void> {
  const safeName = testName.replace(/[^a-zA-Z0-9]/g, "_");
  await page.screenshot({
    path: `e2e/screenshots/${safeName}.png`,
    fullPage: true,
  });
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  screenshot?: string;
}

export async function runTest(
  page: Page,
  name: string,
  fn: (page: Page) => Promise<void>,
): Promise<TestResult> {
  try {
    await fn(page);
    return { name, passed: true };
  } catch (err: any) {
    const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
    try {
      await page.screenshot({
        path: `e2e/screenshots/${safeName}.png`,
        fullPage: true,
      });
    } catch {}
    return {
      name,
      passed: false,
      error: err.message || String(err),
      screenshot: `e2e/screenshots/${safeName}.png`,
    };
  }
}
