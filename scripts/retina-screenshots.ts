import puppeteer from "puppeteer";
import path from "path";

const BASE_URL = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve(import.meta.dir, "../docs/screenshots");
const EMAIL = "admin@example.com";
const PASSWORD = "16EVdrvljQroLuEIHr2rI_9MzwJWLbQg";

// 1440x900 logical pixels @ 2x = 2880x1800 physical pixels
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--force-device-scale-factor=2"],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Login
  console.log("Logging in...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await sleep(2000);
  await page.waitForSelector('[data-testid="email-input"]', { timeout: 15000 });
  await page.type('[data-testid="email-input"]', EMAIL);
  await page.type('[data-testid="password-input"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  await sleep(2000);
  console.log("Logged in, at:", page.url());

  async function shot(name: string, url: string, extra?: () => Promise<void>) {
    console.log(`  → ${name}`);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle2" });
    await sleep(1800);
    if (extra) await extra();
    await page.screenshot({
      path: `${OUT_DIR}/${name}.png`,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
  }

  await shot("dashboard", "/");
  await shot("contacts", "/contacts");

  // Navigate directly to a contact detail page using the API to get a real contact ID
  const apiBase = "http://127.0.0.1:8001";
  const tokenResp = await fetch(`${apiBase}/api/v1/login/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${EMAIL}&password=${PASSWORD}`,
  });
  const { access_token } = (await tokenResp.json()) as { access_token: string };
  const contactsResp = await fetch(`${apiBase}/api/v1/contacts/?limit=1`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const contactsData = (await contactsResp.json()) as { data: { id: string }[] };
  const firstContactId = contactsData.data[0]?.id;
  if (firstContactId) {
    console.log("  → contact-detail");
    await page.goto(`${BASE_URL}/contacts/${firstContactId}`, { waitUntil: "networkidle2" });
    await sleep(2500);
    await page.screenshot({
      path: `${OUT_DIR}/contact-detail.png`,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });
  }

  await shot("interactions", "/interactions");
  await shot("reminders", "/reminders");
  await shot("calendar", "/calendar");
  await shot("journal", "/journal");
  await shot("tags", "/tags");

  await browser.close();
  console.log("Done. Screenshots in docs/screenshots/");
}

main().catch((e) => { console.error(e); process.exit(1); });
