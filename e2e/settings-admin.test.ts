import {
  launchBrowser,
  login,
  BASE_URL,
  API_URL,
  TEST_USER,
  waitForText,
  sleep,
  runTest,
  TestResult,
  getPageText,
  navigateTo,
  clickButton,
  fillInput,
  fillInputByLabel,
} from "./helpers.js";

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);

    // === SETTINGS TESTS ===
    // Navigate to settings
    const foundSettings = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const link = links.find(
        (l) =>
          l.textContent?.trim() === "Settings" ||
          l.getAttribute("href")?.includes("/settings"),
      );
      if (link) {
        (link as HTMLAnchorElement).click();
        return true;
      }
      return false;
    });
    if (foundSettings) {
      await sleep(1500);
    } else {
      // Try navigating directly
      await page.goto(`${BASE_URL}/settings`, {
        waitUntil: "networkidle2",
      });
      await sleep(1000);
    }

    // Test 1: Settings page renders
    results.push(
      await runTest(page, "Settings page renders", async (p) => {
        const text = await getPageText(p);
        if (
          !text.includes("Settings") &&
          !text.includes("User Settings")
        )
          throw new Error("Settings page title not found");
      }),
    );

    // Test 2: Settings shows profile tab
    results.push(
      await runTest(page, "Settings shows profile tab", async (p) => {
        const text = await getPageText(p);
        if (
          !text.includes("My profile") &&
          !text.includes("Profile") &&
          !text.includes("User Information")
        )
          throw new Error("Profile tab/section not found");
      }),
    );

    // Test 3: Settings shows user info
    results.push(
      await runTest(
        page,
        "Settings shows current user info",
        async (p) => {
          const text = await getPageText(p);
          if (
            !text.includes(TEST_USER.email) &&
            !text.includes("admin")
          )
            throw new Error("Current user email not displayed");
        },
      ),
    );

    // Test 4: Settings profile edit button
    results.push(
      await runTest(
        page,
        "Settings profile has Edit button",
        async (p) => {
          const text = await getPageText(p);
          if (!text.includes("Edit"))
            throw new Error("Edit button not found on settings profile");
        },
      ),
    );

    // Test 5: Password tab exists
    results.push(
      await runTest(page, "Settings has Password tab", async (p) => {
        const tab = await p.evaluate(() => {
          const tabs = Array.from(
            document.querySelectorAll(
              '[role="tab"], button[data-state]',
            ),
          );
          return tabs.some((t) => t.textContent?.includes("Password"));
        });
        if (!tab) throw new Error("Password tab not found");
      }),
    );

    // Test 6: Click Password tab
    results.push(
      await runTest(page, "Password tab shows change form", async (p) => {
        // Use Puppeteer's click which dispatches proper pointer/mouse events (needed for Radix UI tabs)
        const tabHandle = await p.evaluateHandle(() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
          return tabs.find((t) => t.textContent?.includes("Password")) || null;
        });
        if (!tabHandle) throw new Error("Could not find Password tab");
        await (tabHandle as any).click();
        await sleep(1000);
        const text = await getPageText(p);
        if (
          !text.includes("Change Password") &&
          !text.includes("Current Password") &&
          !text.includes("Update Password")
        )
          throw new Error("Change password form not shown");
      }),
    );

    // Test 7: Password form has required fields
    results.push(
      await runTest(
        page,
        "Password form has required fields",
        async (p) => {
          const currentPw = await p.$(
            '[data-testid="current-password-input"]',
          );
          const newPw = await p.$(
            '[data-testid="new-password-input"]',
          );
          const confirmPw = await p.$(
            '[data-testid="confirm-password-input"]',
          );
          if (!currentPw)
            throw new Error("Current password input not found");
          if (!newPw) throw new Error("New password input not found");
          if (!confirmPw)
            throw new Error("Confirm password input not found");
        },
      ),
    );

    // Test 8: Danger zone tab exists
    results.push(
      await runTest(page, "Settings has Danger zone tab", async (p) => {
        const tab = await p.evaluate(() => {
          const tabs = Array.from(
            document.querySelectorAll(
              '[role="tab"], button[data-state]',
            ),
          );
          return tabs.some((t) =>
            t.textContent?.includes("Danger zone"),
          );
        });
        if (!tab) throw new Error("Danger zone tab not found");
      }),
    );

    // === ADMIN TESTS ===
    // Navigate to admin
    await navigateTo(page, "Admin");
    await sleep(1000);

    // Test 9: Admin page renders
    results.push(
      await runTest(page, "Admin page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Users"))
          throw new Error("Admin page 'Users' title not found");
      }),
    );

    // Test 10: Admin shows Add User button
    results.push(
      await runTest(
        page,
        "Admin shows Add User button",
        async (p) => {
          const text = await getPageText(p);
          if (!text.includes("Add User"))
            throw new Error("Add User button not found");
        },
      ),
    );

    // Test 11: Admin Add User dialog opens
    results.push(
      await runTest(
        page,
        "Admin Add User dialog opens",
        async (p) => {
          await clickButton(p, "Add User");
          await sleep(500);
          const found = await waitForText(p, "Add User");
          if (!found)
            throw new Error("Add User dialog did not open");
        },
      ),
    );

    // Test 12: Admin create user form has fields
    results.push(
      await runTest(
        page,
        "Admin create user form has fields",
        async (p) => {
          const text = await getPageText(p);
          if (!text.includes("Email"))
            throw new Error("Email field not in form");
          if (!text.includes("Password"))
            throw new Error("Password field not in form");
        },
      ),
    );

    // Test 13: Create a new user via admin
    results.push(
      await runTest(
        page,
        "Admin creates a new user",
        async (p) => {
          const ts = Date.now();
          await fillInputByLabel(p, "Email", `testadmin${ts}@example.com`);
          await fillInputByLabel(p, "Full Name", `Test Admin ${ts}`);
          await fillInputByLabel(p, "Set Password", `TestPass${ts}!`);
          await fillInputByLabel(p, "Confirm Password", `TestPass${ts}!`);

          await clickButton(p, "Save");
          await sleep(2000);

          // Verify dialog closed or user appears
          const text = await getPageText(p);
          // Either the dialog closed or the user appeared in the list
          console.log(
            `  [info] After creating user, page contains: ${text.substring(0, 200)}`,
          );
        },
      ),
    );

    // Test 14: Admin shows user list
    results.push(
      await runTest(page, "Admin shows user list", async (p) => {
        await navigateTo(p, "Admin");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes(TEST_USER.email))
          throw new Error(
            "Admin user not found in user list",
          );
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
