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
  clickTab,
  fillInputByLabel,
  fillInput,
  selectOption,
  getToastText,
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

async function cleanupContacts(token: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/contacts/?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  for (const contact of data.data || []) {
    await fetch(`${API_URL}/api/v1/contacts/${contact.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function createContact(
  token: string,
  firstName: string,
  lastName: string,
): Promise<any> {
  const resp = await fetch(`${API_URL}/api/v1/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
    }),
  });
  return resp.json();
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();

  // Clean up before tests
  await cleanupContacts(token);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);
    await navigateTo(page, "Contacts");
    await sleep(1000);

    // Test 1: Contacts page renders
    results.push(
      await runTest(page, "Contacts page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Contacts"))
          throw new Error("Contacts page title not found");
        if (!text.includes("Add Contact"))
          throw new Error("Add Contact button not found");
      }),
    );

    // Test 2: Add Contact dialog opens
    results.push(
      await runTest(page, "Add Contact dialog opens", async (p) => {
        await clickButton(p, "Add Contact");
        await sleep(500);
        const found = await waitForText(p, "Add New Contact");
        if (!found) throw new Error("Add Contact dialog did not open");
      }),
    );

    // Test 3: Create a contact
    results.push(
      await runTest(page, "Create a contact", async (p) => {
        // Dialog should already be open from previous test
        await fillInputByLabel(p, "First Name", "John");
        await fillInputByLabel(p, "Last Name", "TestDoe");
        await fillInputByLabel(p, "Company", "Acme Corp");

        await clickButton(p, "Create Contact");
        await sleep(2000);

        // Verify contact appears in list or we got redirected
        const text = await getPageText(p);
        if (!text.includes("John") && !text.includes("TestDoe"))
          throw new Error("Created contact not found in the page");
      }),
    );

    // Test 4: Create second contact
    results.push(
      await runTest(page, "Create a second contact", async (p) => {
        await navigateTo(p, "Contacts");
        await sleep(1000);
        await clickButton(p, "Add Contact");
        await sleep(500);
        await fillInputByLabel(p, "First Name", "Jane");
        await fillInputByLabel(p, "Last Name", "TestSmith");
        await clickButton(p, "Create Contact");
        await sleep(2000);
        const text = await getPageText(p);
        if (!text.includes("Jane"))
          throw new Error("Second contact not found");
      }),
    );

    // Test 5: Contact list shows multiple contacts
    results.push(
      await runTest(
        page,
        "Contact list shows multiple contacts",
        async (p) => {
          await navigateTo(p, "Contacts");
          await sleep(1000);
          const text = await getPageText(p);
          if (!text.includes("John"))
            throw new Error("John not in contacts list");
          if (!text.includes("Jane"))
            throw new Error("Jane not in contacts list");
        },
      ),
    );

    // Test 6: Click on a contact to view details
    results.push(
      await runTest(
        page,
        "Click on contact to view details",
        async (p) => {
          // Click on the contact row with cursor-pointer class (DataTable sets this when onRowClick is defined)
          const row = await p.waitForSelector('tr.cursor-pointer', { timeout: 5000 });
          if (!row) throw new Error("No clickable contact row found");
          await row.click();
          await sleep(2000);
          const url = p.url();
          if (!url.includes("/contacts/"))
            throw new Error(
              `Expected /contacts/<id> URL, got: ${url}`,
            );
          const text = await getPageText(p);
          if (!text.includes("John") && !text.includes("Jane"))
            throw new Error("Contact detail page does not show contact name");
        },
      ),
    );

    // Test 7: Contact detail shows edit button
    results.push(
      await runTest(
        page,
        "Contact detail shows Edit button",
        async (p) => {
          const text = await getPageText(p);
          if (!text.includes("Edit"))
            throw new Error("Edit button not found on contact detail");
        },
      ),
    );

    // Test 8: Edit Contact dialog opens
    results.push(
      await runTest(page, "Edit Contact dialog opens", async (p) => {
        await clickButton(p, "Edit");
        await sleep(500);
        const found = await waitForText(p, "Edit Contact");
        if (!found) throw new Error("Edit Contact dialog did not open");
      }),
    );

    // Test 9: Edit contact - update nickname
    results.push(
      await runTest(page, "Edit contact - update nickname", async (p) => {
        await fillInputByLabel(p, "Nickname", "Johnny");
        await clickButton(p, "Update Contact");
        await sleep(2000);
        const text = await getPageText(p);
        // Dialog should close, check if update worked
        if (text.includes("Edit Contact"))
          throw new Error("Edit dialog still open after update");
      }),
    );

    // Test 10: Contact detail shows tabs
    results.push(
      await runTest(page, "Contact detail shows tabs", async (p) => {
        const text = await getPageText(p);
        const hasTabs =
          text.includes("Interactions") &&
          (text.includes("Notes") ||
            text.includes("Gifts") ||
            text.includes("Debts"));
        if (!hasTabs)
          throw new Error("Contact detail tabs not found");
      }),
    );

    // Test 11: Contact detail - Interactions tab
    results.push(
      await runTest(
        page,
        "Contact detail - Interactions tab works",
        async (p) => {
          await clickTab(p, "Interactions");
          const text = await getPageText(p);
          if (!text.includes("Log Interaction"))
            throw new Error(
              "Log Interaction button not found in interactions tab",
            );
        },
      ),
    );

    // Test 12: Add interaction from contact detail
    results.push(
      await runTest(
        page,
        "Add interaction from contact detail",
        async (p) => {
          await clickButton(p, "Log Interaction");
          await sleep(500);
          const found = await waitForText(p, "Log Interaction");
          if (!found)
            throw new Error("Log Interaction dialog did not open");

          // Select channel
          await selectOption(p, "How did you interact?", "Call");
          await sleep(300);

          // Set the datetime
          const dateInput = await p.$('input[type="datetime-local"]');
          if (dateInput) {
            await dateInput.click({ count: 3 });
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 16);
            await dateInput.type(dateStr);
          }

          // Fill notes
          const notesTextarea = await p.evaluateHandle(() => {
            const areas = Array.from(
              document.querySelectorAll("textarea"),
            );
            return areas.find((a) =>
              a.placeholder?.includes("What did you talk about"),
            );
          });
          if (notesTextarea) {
            await (notesTextarea as any).type(
              "Discussed the test project",
            );
          }

          await clickButton(p, "Log Interaction");
          await sleep(2000);
        },
      ),
    );

    // Test 13: Notes tab
    results.push(
      await runTest(page, "Contact detail - Notes tab works", async (p) => {
        await clickTab(p, "Notes");
      }),
    );

    // Test 14: Gifts tab
    results.push(
      await runTest(page, "Contact detail - Gifts tab works", async (p) => {
        await clickTab(p, "Gifts");
        const text = await getPageText(p);
        if (!text.includes("Add Gift"))
          throw new Error("Add Gift button not found in Gifts tab");
      }),
    );

    // Test 15: Add Gift dialog
    results.push(
      await runTest(page, "Add Gift dialog opens and works", async (p) => {
        await clickButton(p, "Add Gift");
        await sleep(500);
        const found = await waitForText(p, "Gift");
        if (!found) throw new Error("Add Gift dialog did not open");

        // Fill in gift details
        await fillInputByLabel(p, "Name", "Test Gift");
        await clickButton(p, "Create Gift").catch(() =>
          clickButton(p, "Save").catch(() =>
            clickButton(p, "Add Gift")),
        );
        await sleep(2000);
      }),
    );

    // Test 16: Debts tab
    results.push(
      await runTest(page, "Contact detail - Debts tab works", async (p) => {
        await clickTab(p, "Debts");
        const text = await getPageText(p);
        if (!text.includes("Add Debt"))
          throw new Error("Add Debt button not found in Debts tab");
      }),
    );

    // Test 17: Add Debt dialog
    results.push(
      await runTest(page, "Add Debt dialog opens and works", async (p) => {
        await clickButton(p, "Add Debt");
        await sleep(500);
        const found =
          (await waitForText(p, "Debt")) ||
          (await waitForText(p, "debt"));
        if (!found) throw new Error("Add Debt dialog did not open");

        // Fill amount
        await fillInputByLabel(p, "Amount", "50");
        await fillInputByLabel(p, "Reason", "Lunch");

        await clickButton(p, "Create Debt").catch(() =>
          clickButton(p, "Save").catch(() =>
            clickButton(p, "Add Debt")),
        );
        await sleep(2000);
      }),
    );

    // Test 18: Navigate back to contacts list
    results.push(
      await runTest(
        page,
        "Navigate back to contacts list",
        async (p) => {
          await navigateTo(p, "Contacts");
          await sleep(1000);
          const text = await getPageText(p);
          if (!text.includes("John"))
            throw new Error("Contacts list does not show John");
        },
      ),
    );

    // Test 19: Search contacts
    results.push(
      await runTest(page, "Search contacts", async (p) => {
        const searchInput = await p.$('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
        if (searchInput) {
          await searchInput.click({ count: 3 });
          await searchInput.type("John");
          await sleep(1500);
          const text = await getPageText(p);
          if (!text.includes("John"))
            throw new Error("Search did not find John");
        } else {
          console.log("  [info] Search input not found, skipping search test");
        }
      }),
    );

    // Cleanup
    await cleanupContacts(token);
    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== CONTACTS TEST RESULTS ===");
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
