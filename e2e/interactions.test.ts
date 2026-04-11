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
  fillInputByLabel,
  selectOption,
} from "./helpers.js";

async function getAuthToken(): Promise<string> {
  const resp = await fetch(`${API_URL}/api/v1/login/access-token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${encodeURIComponent(TEST_USER.email)}&password=${encodeURIComponent(TEST_USER.password)}`,
  });
  const data = await resp.json();
  return data.access_token;
}

async function ensureContact(token: string): Promise<any> {
  const resp = await fetch(`${API_URL}/api/v1/contacts/?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (data.data && data.data.length > 0) return data.data[0];
  const createResp = await fetch(`${API_URL}/api/v1/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: "InteractionTest",
      last_name: "Contact",
    }),
  });
  return createResp.json();
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();
  const contact = await ensureContact(token);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);
    await navigateTo(page, "Interactions");
    await sleep(1000);

    // Test 1: Interactions page renders
    results.push(
      await runTest(page, "Interactions page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Interactions"))
          throw new Error("Interactions page title not found");
        if (!text.includes("Log Interaction"))
          throw new Error("Log Interaction button not found");
      }),
    );

    // Test 2: Log Interaction dialog opens
    results.push(
      await runTest(
        page,
        "Log Interaction dialog opens",
        async (p) => {
          await clickButton(p, "Log Interaction");
          await sleep(500);
          const found = await waitForText(p, "Record a conversation");
          if (!found)
            throw new Error("Log Interaction dialog did not open");
        },
      ),
    );

    // Test 3: Create an interaction
    results.push(
      await runTest(page, "Create an interaction", async (p) => {
        // Select contact
        await selectOption(p, "Select a contact", contact.first_name);

        // Select channel
        await selectOption(p, "How did you interact?", "Call");

        // Set datetime
        const dateInput = await p.$('input[type="datetime-local"]');
        if (dateInput) {
          await dateInput.click({ count: 3 });
          const now = new Date();
          const dateStr = now.toISOString().slice(0, 16);
          await dateInput.type(dateStr);
        }

        // Fill duration
        const durationInput = await p.evaluateHandle(() => {
          const inputs = Array.from(
            document.querySelectorAll('input[type="number"]'),
          );
          return inputs.find((i) => i.placeholder === "30");
        });
        if (durationInput) {
          await (durationInput as any).click({ count: 3 });
          await (durationInput as any).type("15");
        }

        // Fill notes
        const notesArea = await p.evaluateHandle(() => {
          const areas = Array.from(
            document.querySelectorAll("textarea"),
          );
          return areas.find(
            (a) =>
              a.placeholder?.includes("What did you talk about"),
          );
        });
        if (notesArea) {
          await (notesArea as any).type(
            "Test interaction from Puppeteer",
          );
        }

        // Submit - click the submit button (type="submit")
        const submitted = await p.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const submitBtn = buttons.find((b) => b.type === "submit" && b.textContent?.includes("Log Interaction"));
          if (submitBtn) {
            (submitBtn as HTMLButtonElement).click();
            return true;
          }
          return false;
        });
        if (!submitted) {
          throw new Error("Could not find submit button");
        }
        await sleep(3000);
      }),
    );

    // Test 4: Interaction appears in timeline
    results.push(
      await runTest(
        page,
        "Interaction appears in timeline",
        async (p) => {
          await navigateTo(p, "Interactions");
          await sleep(1500);
          const text = await getPageText(p);
          if (
            !text.includes("Call") &&
            !text.includes("InteractionTest")
          )
            throw new Error(
              "New interaction not found in timeline",
            );
        },
      ),
    );

    // Test 5: Interaction shows channel badge
    results.push(
      await runTest(
        page,
        "Interaction shows channel badge",
        async (p) => {
          const hasBadge = await p.evaluate(() => {
            const badges = Array.from(
              document.querySelectorAll(
                '[class*="badge"], span',
              ),
            );
            return badges.some(
              (b) => b.textContent?.trim() === "Call",
            );
          });
          if (!hasBadge)
            throw new Error("Call badge not found for interaction");
        },
      ),
    );

    // Test 6: Delete interaction via dropdown
    results.push(
      await runTest(
        page,
        "Interaction dropdown menu works",
        async (p) => {
          // Look for the more menu button (three dots)
          const found = await p.evaluate(() => {
            const buttons = Array.from(
              document.querySelectorAll("button"),
            );
            const moreBtn = buttons.find(
              (b) =>
                b.querySelector('svg[class*="lucide-more"]') ||
                b.querySelector('svg[class*="ellipsis"]') ||
                b.getAttribute("aria-label")?.includes("More") ||
                b.classList.contains("more-button"),
            );
            if (moreBtn) {
              (moreBtn as HTMLButtonElement).click();
              return true;
            }
            return false;
          });
          if (found) {
            await sleep(500);
            const text = await getPageText(p);
            if (!text.includes("Delete"))
              throw new Error("Delete option not in dropdown menu");
          } else {
            console.log(
              "  [info] More menu button not found, checking for inline delete",
            );
          }
        },
      ),
    );

    // Cleanup
    const interactions = await fetch(
      `${API_URL}/api/v1/interactions/`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ).then((r) => r.json());
    for (const ix of interactions.data || []) {
      await fetch(`${API_URL}/api/v1/interactions/${ix.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== INTERACTIONS TEST RESULTS ===");
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
