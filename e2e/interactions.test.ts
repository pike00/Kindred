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
        // Open the attendee popover and pick the seeded contact.
        // The dialog uses a Popover + Command (search-as-you-type) for attendees,
        // not a basic select.
        await clickButton(p, "Add attendee");
        await sleep(400);
        // Type into the CommandInput to filter
        const commandInput = await p.waitForSelector(
          '[cmdk-input], input[placeholder="Search contacts..."]',
          { timeout: 3000 },
        );
        await commandInput!.type(contact.first_name);
        await sleep(300);
        const picked = await p.evaluate((needle: string) => {
          const items = Array.from(
            document.querySelectorAll('[cmdk-item], [role="option"]'),
          );
          const item = items.find((i) =>
            (i.textContent || "").toLowerCase().includes(needle.toLowerCase()),
          );
          if (item) {
            (item as HTMLElement).click();
            return true;
          }
          return false;
        }, contact.first_name);
        if (!picked) {
          throw new Error(
            `Contact "${contact.first_name}" not found in attendee picker`,
          );
        }
        await sleep(300);
        // Close the popover by pressing Escape so the rest of the form is focusable.
        await p.keyboard.press("Escape");
        await sleep(200);

        // Channel is a button-pill row. Click the "Call" pill.
        const channelClicked = await p.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const callBtn = buttons.find(
            (b) => b.textContent?.trim() === "Call" && b.type === "button",
          );
          if (callBtn) {
            (callBtn as HTMLButtonElement).click();
            return true;
          }
          return false;
        });
        if (!channelClicked) {
          throw new Error("Channel pill 'Call' not found");
        }

        // Set datetime via React-aware setter (datetime-local ignores typing)
        await p.evaluate(() => {
          const el = document.querySelector(
            'input[type="datetime-local"]',
          ) as HTMLInputElement | null;
          if (!el) return;
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
          )?.set;
          const now = new Date().toISOString().slice(0, 16);
          setter?.call(el, now);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });

        // Submit
        const submitted = await p.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const submitBtn = buttons.find(
            (b) =>
              b.type === "submit" &&
              b.textContent?.includes("Log Interaction"),
          );
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

    // Test 6: Open actions dropdown on the interaction row
    results.push(
      await runTest(
        page,
        "Interaction dropdown menu works",
        async (p) => {
          // Make sure the timeline has actually rendered the new interaction —
          // we navigated here in test 4, but if test 5 ran fast the row may
          // have had its trigger remounted. Wait for at least one trigger.
          await p.waitForFunction(
            () =>
              document.querySelectorAll(
                'button[aria-label="Open actions menu"]',
              ).length > 0,
            { timeout: 5000 },
          );
          // Radix DropdownMenu trigger needs a real PointerEvent — synthetic
          // .click() inside evaluate() does not open the menu. Use the mouse.
          const box = await p.evaluate(() => {
            const t = document.querySelector(
              'button[aria-label="Open actions menu"]',
            ) as HTMLButtonElement | null;
            if (!t) return null;
            const r = t.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          });
          if (!box) {
            throw new Error(
              "RowActionsMenu trigger (aria-label=Open actions menu) not found",
            );
          }
          await p.mouse.click(box.x, box.y);
          await sleep(500);
          // Radix DropdownMenu uses data-slot="dropdown-menu-item" + role attr
          // varies by version. Match either, plus a textContent fallback.
          const hasDelete = await p.evaluate(() => {
            const items = Array.from(
              document.querySelectorAll(
                '[data-slot="dropdown-menu-item"], [role="menuitem"]',
              ),
            );
            return items.some((i) =>
              (i.textContent || "").includes("Delete"),
            );
          });
          if (!hasDelete) {
            throw new Error("Delete option not in dropdown menu");
          }
          // Close menu so subsequent runs aren't sticky
          await p.keyboard.press("Escape");
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
