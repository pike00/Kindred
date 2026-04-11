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

async function cleanupReminders(token: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/reminders/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  for (const r of data.data || []) {
    await fetch(`${API_URL}/api/v1/reminders/${r.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();
  await cleanupReminders(token);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);
    await navigateTo(page, "Reminders");
    await sleep(1000);

    // Test 1: Reminders page renders
    results.push(
      await runTest(page, "Reminders page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Reminders"))
          throw new Error("Reminders page title not found");
        if (!text.includes("Add Reminder"))
          throw new Error("Add Reminder button not found");
      }),
    );

    // Test 2: Add Reminder dialog opens
    results.push(
      await runTest(page, "Add Reminder dialog opens", async (p) => {
        await clickButton(p, "Add Reminder");
        await sleep(500);
        const found = await waitForText(p, "Add New Reminder");
        if (!found)
          throw new Error("Add Reminder dialog did not open");
      }),
    );

    // Test 3: Create a reminder
    results.push(
      await runTest(page, "Create a reminder", async (p) => {
        await fillInputByLabel(p, "Title", "Call Mom");
        await fillInputByLabel(p, "Description", "Weekly check-in call");

        // Set datetime
        const dateInput = await p.$('input[type="datetime-local"]');
        if (dateInput) {
          await dateInput.click({ count: 3 });
          const future = new Date(Date.now() + 86400000); // tomorrow
          const dateStr = future.toISOString().slice(0, 16);
          await dateInput.type(dateStr);
        }

        await clickButton(p, "Create Reminder");
        await sleep(2000);
      }),
    );

    // Test 4: Reminder appears in list
    results.push(
      await runTest(page, "Reminder appears in list", async (p) => {
        await navigateTo(p, "Reminders");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Call Mom"))
          throw new Error("Created reminder 'Call Mom' not found in list");
      }),
    );

    // Test 5: Create a second reminder
    results.push(
      await runTest(page, "Create a second reminder", async (p) => {
        await clickButton(p, "Add Reminder");
        await sleep(500);
        await fillInputByLabel(p, "Title", "Send birthday card");

        const dateInput = await p.$('input[type="datetime-local"]');
        if (dateInput) {
          await dateInput.click({ count: 3 });
          const future = new Date(Date.now() + 172800000); // 2 days
          const dateStr = future.toISOString().slice(0, 16);
          await dateInput.type(dateStr);
        }

        await clickButton(p, "Create Reminder");
        await sleep(2000);
      }),
    );

    // Test 6: Multiple reminders visible
    results.push(
      await runTest(page, "Multiple reminders visible", async (p) => {
        await navigateTo(p, "Reminders");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Call Mom"))
          throw new Error("Call Mom reminder missing");
        if (!text.includes("Send birthday card"))
          throw new Error("Send birthday card reminder missing");
      }),
    );

    // Cleanup
    await cleanupReminders(token);
    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== REMINDERS TEST RESULTS ===");
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
