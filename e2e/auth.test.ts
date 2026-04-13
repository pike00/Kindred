import {
  launchBrowser,
  login,
  freshPage,
  BASE_URL,
  TEST_USER,
  waitForText,
  sleep,
  fillInput,
  runTest,
  TestResult,
  getPageText,
} from "./helpers.js";

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];

  try {
    // Test 1: Login page renders
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Login page renders", async (p) => {
          await p.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
          const found = await waitForText(p, "Log In");
          if (!found) throw new Error("Login page did not render 'Log In' button");
          const emailInput = await p.$('[data-testid="email-input"]');
          if (!emailInput) throw new Error("Email input not found");
          const pwInput = await p.$('[data-testid="password-input"]');
          if (!pwInput) throw new Error("Password input not found");
        }),
      );
      await context.close();
    }

    // Test 2: Login with valid credentials
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Login with valid credentials", async (p) => {
          await login(p);
          const url = p.url();
          if (url.includes("/login"))
            throw new Error(`Still on login page after login: ${url}`);
          const text = await getPageText(p);
          if (!text.includes("Dashboard") && !text.includes("Hi,"))
            throw new Error("Dashboard content not found after login");
        }),
      );
      await context.close();
    }

    // Test 3: Login with invalid credentials shows error
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(
          page,
          "Login with invalid credentials shows error",
          async (p) => {
            await p.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
            await fillInput(p, '[data-testid="email-input"]', "wrong@example.com");
            await fillInput(p, '[data-testid="password-input"]', "wrongpassword");
            await p.click('button[type="submit"]');
            await sleep(2000);
            const text = await getPageText(p);
            const hasError =
              text.toLowerCase().includes("incorrect") ||
              text.toLowerCase().includes("error") ||
              text.toLowerCase().includes("invalid");
            // Also check for toast notification
            const toastText = await p.evaluate(() => {
              const toast = document.querySelector("[data-sonner-toast]");
              return toast?.textContent?.toLowerCase() || "";
            });
            if (!hasError && !toastText.includes("incorrect") && !toastText.includes("error"))
              throw new Error("No error message shown for invalid credentials");
          },
        ),
      );
      await context.close();
    }

    // Test 4: Login validation - empty fields
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Login validation - empty fields", async (p) => {
          await p.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
          await p.click('button[type="submit"]');
          await sleep(500);
          if (!p.url().includes("/login"))
            throw new Error("Should stay on login page with empty fields");
        }),
      );
      await context.close();
    }

    // Test 5: Signup page renders
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Signup page renders", async (p) => {
          await p.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle2" });
          const found = await waitForText(p, "Sign Up");
          if (!found) throw new Error("Signup page did not render");
          const nameInput = await p.$('[data-testid="full-name-input"]');
          if (!nameInput) throw new Error("Full name input not found");
        }),
      );
      await context.close();
    }

    // Test 6: Signup with new user
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Signup with new user", async (p) => {
          await p.goto(`${BASE_URL}/signup`, { waitUntil: "networkidle2" });
          const ts = Date.now();
          await fillInput(p, '[data-testid="full-name-input"]', `Test User ${ts}`);
          await fillInput(p, '[data-testid="email-input"]', `test${ts}@example.com`);
          await fillInput(p, '[data-testid="password-input"]', "TestPass123!");
          await fillInput(p, '[data-testid="confirm-password-input"]', "TestPass123!");
          await p.click('button[type="submit"]');
          await sleep(3000);
          const text = await getPageText(p);
          const url = p.url();
          if (
            !url.includes("/login") &&
            !text.includes("Dashboard") &&
            !text.includes("successfully") &&
            !text.includes("Hi,")
          )
            throw new Error(`Signup did not succeed. URL: ${url}, text: ${text.substring(0, 200)}`);
        }),
      );
      await context.close();
    }

    // Test 7: Password recovery page renders
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Password recovery page renders", async (p) => {
          await p.goto(`${BASE_URL}/recover-password`, { waitUntil: "networkidle2" });
          const text = await getPageText(p);
          if (!text.includes("Password") && !text.includes("Recover") && !text.includes("Reset"))
            throw new Error("Password recovery page did not render");
        }),
      );
      await context.close();
    }

    // Test 8: Unauthenticated redirect to login
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Unauthenticated user redirected to login", async (p) => {
          await p.goto(`${BASE_URL}/contacts`, { waitUntil: "networkidle2" });
          await sleep(1000);
          const url = p.url();
          if (!url.includes("/login"))
            throw new Error(`Should redirect to login, got: ${url}`);
        }),
      );
      await context.close();
    }

    // Test 9: Logout functionality
    {
      const { context, page } = await freshPage(browser);
      results.push(
        await runTest(page, "Logout functionality", async (p) => {
          await login(p);

          // Radix DropdownMenuTrigger requires real pointer events — use page.click, not evaluate()
          await p.click('[data-testid="user-menu"]');
          await sleep(500);

          // Locate the Log Out menu item and click it via CDP so Radix fires onSelect
          const logoutBox = await p.evaluate(() => {
            const items = Array.from(
              document.querySelectorAll('[role="menuitem"]'),
            );
            const item = items.find((i) => i.textContent?.includes("Log Out"));
            if (!item) return null;
            const rect = item.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          });
          if (!logoutBox) throw new Error("Logout menu item not found");
          await p.mouse.click(logoutBox.x, logoutBox.y);

          await sleep(2000);
          const url = p.url();
          if (!url.includes("/login"))
            throw new Error(`Should be on login after logout, got: ${url}`);
        }),
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== AUTH TEST RESULTS ===");
  for (const r of results) {
    const icon = r.passed ? "PASS" : "FAIL";
    console.log(`[${icon}] ${r.name}`);
    if (r.error) console.log(`  Error: ${r.error}`);
    if (r.screenshot) console.log(`  Screenshot: ${r.screenshot}`);
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
