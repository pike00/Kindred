import {
  launchBrowser,
  login,
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

async function cleanupTags(token: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/tags/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  for (const tag of data.data || []) {
    await fetch(`${API_URL}/api/v1/tags/${tag.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function cleanupGroups(token: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/groups/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  for (const group of data.data || []) {
    await fetch(`${API_URL}/api/v1/groups/${group.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();
  await cleanupTags(token);
  await cleanupGroups(token);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);

    // === TAGS TESTS ===
    await navigateTo(page, "Tags");
    await sleep(1000);

    // Test 1: Tags page renders
    results.push(
      await runTest(page, "Tags page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Tags"))
          throw new Error("Tags page title not found");
        if (!text.includes("Add Tag"))
          throw new Error("Add Tag button not found");
      }),
    );

    // Test 2: Add Tag dialog opens
    results.push(
      await runTest(page, "Add Tag dialog opens", async (p) => {
        await clickButton(p, "Add Tag");
        await sleep(500);
        const found = await waitForText(p, "Add New Tag");
        if (!found) throw new Error("Add Tag dialog did not open");
      }),
    );

    // Test 3: Create a tag
    results.push(
      await runTest(page, "Create a tag", async (p) => {
        await fillInputByLabel(p, "Name", "Close Friend");
        // Color picker
        const colorInput = await p.$('input[type="color"]');
        if (colorInput) {
          await colorInput.evaluate(
            (el: any) => (el.value = "#ff5733"),
          );
        }
        await clickButton(p, "Create Tag");
        await sleep(2000);
      }),
    );

    // Test 4: Tag appears in list
    results.push(
      await runTest(page, "Tag appears in list", async (p) => {
        await navigateTo(p, "Tags");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Close Friend"))
          throw new Error("Created tag 'Close Friend' not found");
      }),
    );

    // Test 5: Create second tag
    results.push(
      await runTest(page, "Create a second tag", async (p) => {
        await clickButton(p, "Add Tag");
        await sleep(500);
        await fillInputByLabel(p, "Name", "Colleague");
        await clickButton(p, "Create Tag");
        await sleep(2000);
      }),
    );

    // Test 6: Multiple tags visible
    results.push(
      await runTest(page, "Multiple tags visible", async (p) => {
        await navigateTo(p, "Tags");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Close Friend"))
          throw new Error("Close Friend tag missing");
        if (!text.includes("Colleague"))
          throw new Error("Colleague tag missing");
      }),
    );

    // === GROUPS TESTS ===
    await navigateTo(page, "Groups");
    await sleep(1000);

    // Test 7: Groups page renders
    results.push(
      await runTest(page, "Groups page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Groups"))
          throw new Error("Groups page title not found");
        if (!text.includes("Add Group"))
          throw new Error("Add Group button not found");
      }),
    );

    // Test 8: Add Group dialog opens
    results.push(
      await runTest(page, "Add Group dialog opens", async (p) => {
        await clickButton(p, "Add Group");
        await sleep(500);
        const found = await waitForText(p, "Add New Group");
        if (!found) throw new Error("Add Group dialog did not open");
      }),
    );

    // Test 9: Create a group
    results.push(
      await runTest(page, "Create a group", async (p) => {
        await fillInputByLabel(p, "Name", "Work Team");
        await fillInputByLabel(
          p,
          "Description",
          "People from the office",
        );
        await clickButton(p, "Create Group");
        await sleep(2000);
      }),
    );

    // Test 10: Group appears in list
    results.push(
      await runTest(page, "Group appears in list", async (p) => {
        await navigateTo(p, "Groups");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Work Team"))
          throw new Error("Created group 'Work Team' not found");
      }),
    );

    // Test 11: Create second group
    results.push(
      await runTest(page, "Create a second group", async (p) => {
        await clickButton(p, "Add Group");
        await sleep(500);
        await fillInputByLabel(p, "Name", "Book Club");
        await clickButton(p, "Create Group");
        await sleep(2000);
      }),
    );

    // Test 12: Multiple groups visible
    results.push(
      await runTest(page, "Multiple groups visible", async (p) => {
        await navigateTo(p, "Groups");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Work Team"))
          throw new Error("Work Team group missing");
        if (!text.includes("Book Club"))
          throw new Error("Book Club group missing");
      }),
    );

    // Cleanup
    await cleanupTags(token);
    await cleanupGroups(token);
    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== TAGS & GROUPS TEST RESULTS ===");
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
