import type { Page } from "puppeteer";
import {
  BASE_URL,
  TEST_USER,
  fillInputByLabel,
  getPageText,
  launchBrowser,
  login,
  navigateTo,
  runTest,
  sleep,
  type TestResult,
  waitForText,
} from "./helpers.js";

// Click a button by its visible text using a real PointerEvent (Radix-friendly).
async function mouseClickButton(
  page: Page,
  text: string,
): Promise<boolean> {
  const tag = `__btn_${Math.random().toString(36).slice(2)}`;
  const tagged = await page.evaluate(
    (needle: string, t: string) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find(
        (b) => (b.textContent || "").trim() === needle,
      ) as HTMLButtonElement | undefined;
      if (!btn) return false;
      btn.setAttribute("data-e2e-tag", t);
      btn.scrollIntoView({
        block: "center",
        behavior: "instant" as ScrollBehavior,
      });
      return true;
    },
    text,
    tag,
  );
  if (!tagged) return false;
  await sleep(150);
  const handle = await page.$(`[data-e2e-tag="${tag}"]`);
  if (!handle) return false;
  await handle.click();
  await sleep(300);
  return true;
}

async function clickTabByText(page: Page, label: string): Promise<void> {
  const box = await page.evaluate((t: string) => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    const tab = tabs.find((el) =>
      (el.textContent || "").trim().includes(t),
    ) as HTMLElement | undefined;
    if (!tab) return null;
    tab.scrollIntoView({
      block: "center",
      behavior: "instant" as ScrollBehavior,
    });
    const r = tab.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, label);
  if (!box) throw new Error(`Tab "${label}" not found`);
  await sleep(150);
  await page.mouse.click(box.x, box.y);
  await sleep(400);
}

async function dialogOpen(page: Page): Promise<boolean> {
  return page.evaluate(
    () => !!document.querySelector('[role="dialog"][data-state="open"]'),
  );
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await login(page);

    // === SETTINGS ===
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle2" });
    await page
      .waitForFunction(
        () => document.body.innerText.includes("User Settings"),
        { timeout: 10000 },
      )
      .catch(() => {});

    results.push(
      await runTest(page, "Settings page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("User Settings"))
          throw new Error("'User Settings' header not on page");
      }),
    );

    results.push(
      await runTest(page, "Settings shows tab strip", async (p) => {
        const labels = await p.evaluate(() =>
          Array.from(document.querySelectorAll('[role="tab"]')).map((t) =>
            (t.textContent || "").trim(),
          ),
        );
        for (const expected of ["My profile", "Password"]) {
          if (!labels.some((l) => l.includes(expected))) {
            throw new Error(
              `Tab "${expected}" not found (got: ${labels.join(" | ")})`,
            );
          }
        }
      }),
    );

    results.push(
      await runTest(page, "My profile tab shows current user", async (p) => {
        // Default tab is "my-profile" — should already be active.
        const text = await getPageText(p);
        if (!text.includes(TEST_USER.email)) {
          throw new Error(
            `Email ${TEST_USER.email} not in profile tab`,
          );
        }
        if (!text.includes("Edit")) {
          throw new Error("Edit button missing from profile");
        }
      }),
    );

    results.push(
      await runTest(page, "Password tab opens change form", async (p) => {
        await clickTabByText(p, "Password");
        await p
          .waitForSelector('[data-testid="current-password-input"]', {
            timeout: 5000,
          })
          .catch(() => null);
        const current = await p.$(
          '[data-testid="current-password-input"]',
        );
        const next = await p.$('[data-testid="new-password-input"]');
        const confirm = await p.$(
          '[data-testid="confirm-password-input"]',
        );
        if (!current) throw new Error("Current password input missing");
        if (!next) throw new Error("New password input missing");
        if (!confirm) throw new Error("Confirm password input missing");
      }),
    );

    // Superusers get all 5 tabs *except* the Danger zone (the route filters
    // it out with `slice(0, -1)`); a non-superuser session would see it.
    // Assert the role-aware behavior is correct for the admin@example.com test
    // user, which is configured as a superuser.
    results.push(
      await runTest(
        page,
        "Superuser does NOT see Danger zone tab",
        async (p) => {
          const labels = await p.evaluate(() =>
            Array.from(document.querySelectorAll('[role="tab"]')).map((t) =>
              (t.textContent || "").trim(),
            ),
          );
          if (labels.some((l) => l.includes("Danger zone"))) {
            throw new Error(
              "Danger zone tab is visible to a superuser — settings.tsx slice(0,-1) regression?",
            );
          }
        },
      ),
    );

    results.push(
      await runTest(page, "Custom fields tab present", async (p) => {
        const labels = await p.evaluate(() =>
          Array.from(document.querySelectorAll('[role="tab"]')).map((t) =>
            (t.textContent || "").trim(),
          ),
        );
        if (!labels.some((l) => l.includes("Custom fields"))) {
          throw new Error("Custom fields tab missing");
        }
      }),
    );

    results.push(
      await runTest(page, "API keys tab present", async (p) => {
        const labels = await p.evaluate(() =>
          Array.from(document.querySelectorAll('[role="tab"]')).map((t) =>
            (t.textContent || "").trim(),
          ),
        );
        if (!labels.some((l) => l.includes("API keys"))) {
          throw new Error("API keys tab missing");
        }
      }),
    );

    // === ADMIN ===
    await navigateTo(page, "Admin");
    await sleep(800);

    results.push(
      await runTest(page, "Admin page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Users"))
          throw new Error("'Users' not on admin page");
      }),
    );

    results.push(
      await runTest(page, "Admin shows Add User button", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Add User"))
          throw new Error("Add User button missing");
      }),
    );

    results.push(
      await runTest(page, "Admin Add User dialog opens", async (p) => {
        const clicked = await mouseClickButton(p, "Add User");
        if (!clicked) throw new Error("Add User button not clickable");
        const opened = await waitForText(p, "Add User");
        if (!opened) throw new Error("Add User dialog did not open");
        // Verify essential fields exist
        const text = await getPageText(p);
        if (!text.includes("Email")) {
          throw new Error("Email field missing from dialog");
        }
        if (!text.includes("Password")) {
          throw new Error("Password field missing from dialog");
        }
      }),
    );

    results.push(
      await runTest(page, "Admin creates a user", async (p) => {
        const ts = Date.now();
        const email = `testadmin${ts}@example.com`;
        await fillInputByLabel(p, "Email", email);
        await fillInputByLabel(p, "Full Name", `Test Admin ${ts}`);
        await fillInputByLabel(p, "Set Password", `TestPass${ts}!`);
        await fillInputByLabel(p, "Confirm Password", `TestPass${ts}!`);
        const saved = await mouseClickButton(p, "Save");
        if (!saved) throw new Error("Save button not clickable");
        // Wait for dialog to close
        await p
          .waitForFunction(
            () =>
              !document.querySelector('[role="dialog"][data-state="open"]'),
            { timeout: 5000 },
          )
          .catch(() => null);
        if (await dialogOpen(p))
          throw new Error("Add User dialog did not close after save");
        // The new user should appear in the list
        await p
          .waitForFunction(
            (e: string) => document.body.innerText.includes(e),
            { timeout: 5000 },
            email,
          )
          .catch(() => null);
        const text = await getPageText(p);
        if (!text.includes(email)) {
          throw new Error(`Newly created user ${email} not in list`);
        }
      }),
    );

    results.push(
      await runTest(page, "Admin shows current admin in user list", async (p) => {
        const text = await getPageText(p);
        if (!text.includes(TEST_USER.email))
          throw new Error("Current admin not in user list");
      }),
    );

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== SETTINGS & ADMIN TEST RESULTS ===");
  for (const r of results) {
    const icon = r.passed ? "PASS" : "FAIL";
    console.log(`[${icon}] ${r.name}`);
    if (r.error) console.log(`  Error: ${r.error}`);
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(
    `\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
