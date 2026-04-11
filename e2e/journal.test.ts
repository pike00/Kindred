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

async function cleanupJournal(token: string): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/journal/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  for (const entry of data.data || []) {
    await fetch(`${API_URL}/api/v1/journal/${entry.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();
  await cleanupJournal(token);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);
    await navigateTo(page, "Journal");
    await sleep(1000);

    // Test 1: Journal page renders
    results.push(
      await runTest(page, "Journal page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Journal"))
          throw new Error("Journal page title not found");
        if (!text.includes("New Entry"))
          throw new Error("New Entry button not found");
      }),
    );

    // Test 2: New Entry dialog opens
    results.push(
      await runTest(page, "New Entry dialog opens", async (p) => {
        await clickButton(p, "New Entry");
        await sleep(500);
        const found = await waitForText(p, "Write Journal Entry");
        if (!found)
          throw new Error("Write Journal Entry dialog did not open");
      }),
    );

    // Test 3: Create a journal entry
    results.push(
      await runTest(page, "Create a journal entry", async (p) => {
        // Fill in the entry text
        const textarea = await p.evaluateHandle(() => {
          const areas = Array.from(
            document.querySelectorAll("textarea"),
          );
          return areas.find(
            (a) =>
              a.placeholder?.includes("What's on your mind") ||
              a.placeholder?.includes("Write freely"),
          );
        });
        if (textarea) {
          await (textarea as any).type(
            "Today was productive. Met with the team and discussed the roadmap for Q2.",
          );
        } else {
          throw new Error("Journal entry textarea not found");
        }

        // Try to fill mood
        const moodInput = await p.evaluateHandle(() => {
          const inputs = Array.from(
            document.querySelectorAll("input"),
          );
          return inputs.find(
            (i) =>
              i.placeholder?.includes("How are you feeling") ||
              i.placeholder?.includes("feeling"),
          );
        });
        if (moodInput) {
          await (moodInput as any).type("Great");
        }

        await clickButton(p, "Save Entry");
        await sleep(2000);
      }),
    );

    // Test 4: Journal entry appears in list
    results.push(
      await runTest(
        page,
        "Journal entry appears in list",
        async (p) => {
          await navigateTo(p, "Journal");
          await sleep(1500);
          const text = await getPageText(p);
          if (
            !text.includes("productive") &&
            !text.includes("roadmap")
          )
            throw new Error(
              "Created journal entry content not found",
            );
        },
      ),
    );

    // Test 5: Create second journal entry
    results.push(
      await runTest(
        page,
        "Create a second journal entry",
        async (p) => {
          await clickButton(p, "New Entry");
          await sleep(500);

          const textarea = await p.evaluateHandle(() => {
            const areas = Array.from(
              document.querySelectorAll("textarea"),
            );
            return areas.find(
              (a) =>
                a.placeholder?.includes("What's on your mind") ||
                a.placeholder?.includes("Write freely"),
            );
          });
          if (textarea) {
            await (textarea as any).type(
              "Rainy day. Read a book and had some tea.",
            );
          }

          await clickButton(p, "Save Entry");
          await sleep(2000);
        },
      ),
    );

    // Test 6: Both entries visible
    results.push(
      await runTest(page, "Multiple journal entries visible", async (p) => {
        await navigateTo(p, "Journal");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("productive") && !text.includes("roadmap"))
          throw new Error("First journal entry not found");
        if (!text.includes("Rainy") && !text.includes("tea"))
          throw new Error("Second journal entry not found");
      }),
    );

    // Cleanup
    await cleanupJournal(token);
    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== JOURNAL TEST RESULTS ===");
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
