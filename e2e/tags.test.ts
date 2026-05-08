import {
  launchBrowser,
  login,
  API_URL,
  BASE_URL,
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

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();
  await cleanupTags(token);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);

    // === REGRESSION: groups removed ===

    results.push(
      await runTest(
        page,
        "Sidebar has no Groups link (groups merged into tags)",
        async (p) => {
          // The sidebar uses TanStack RouterLink; wait for the Tags link to mount
          // before asserting absence of Groups (otherwise the sidebar may not have
          // rendered yet right after login).
          await p.waitForFunction(
            () =>
              Array.from(document.querySelectorAll("a[href]"))
                .map((a) => (a.textContent || "").trim())
                .includes("Tags"),
            { timeout: 10000 },
          );
          const linkTexts = await p.evaluate(() =>
            Array.from(document.querySelectorAll("a[href]")).map((a) =>
              (a.textContent || "").trim(),
            ),
          );
          if (linkTexts.includes("Groups")) {
            throw new Error(
              `Groups link still in sidebar: ${linkTexts.join(", ")}`,
            );
          }
        },
      ),
    );

    results.push(
      await runTest(
        page,
        "Navigating to /groups does not render a Groups page",
        async (p) => {
          await p.goto(`${BASE_URL}/groups`, { waitUntil: "networkidle2" });
          await sleep(1000);
          const text = await getPageText(p);
          // The route should not match — TanStack Router shows fallback or empties.
          // Accept either (a) no "Add Group" button (page deleted) or (b) navigation
          // to a 404/dashboard. The crucial regression: no Add Group button anywhere.
          if (text.includes("Add Group")) {
            throw new Error("Add Group button still present at /groups");
          }
        },
      ),
    );

    results.push(
      await runTest(
        page,
        "Groups API endpoint returns 404 (route removed)",
        async () => {
          const resp = await fetch(`${API_URL}/api/v1/groups/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.status !== 404) {
            throw new Error(
              `Expected 404 for /api/v1/groups/, got ${resp.status}`,
            );
          }
        },
      ),
    );

    // === TAGS PAGE ===

    await navigateTo(page, "Tags");
    await sleep(1000);

    results.push(
      await runTest(page, "Tags page renders", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Tags"))
          throw new Error("Tags page title not found");
        if (!text.includes("Add Tag"))
          throw new Error("Add Tag button not found");
      }),
    );

    results.push(
      await runTest(page, "Add Tag dialog opens", async (p) => {
        await clickButton(p, "Add Tag");
        await sleep(500);
        const found = await waitForText(p, "Add New Tag");
        if (!found) throw new Error("Add Tag dialog did not open");
      }),
    );

    results.push(
      await runTest(page, "Create a tag with name + color", async (p) => {
        await fillInputByLabel(p, "Name", "Close Friend");
        const colorInput = await p.$('input[type="color"]');
        if (colorInput) {
          await colorInput.evaluate((el: any) => (el.value = "#ff5733"));
        }
        await clickButton(p, "Create Tag");
        await sleep(2000);
      }),
    );

    results.push(
      await runTest(page, "New tag appears in list", async (p) => {
        await navigateTo(p, "Tags");
        await sleep(1500);
        const text = await getPageText(p);
        if (!text.includes("Close Friend"))
          throw new Error("Created tag 'Close Friend' not found");
      }),
    );

    results.push(
      await runTest(page, "Create a second tag", async (p) => {
        await clickButton(p, "Add Tag");
        await sleep(500);
        await fillInputByLabel(p, "Name", "Colleague");
        await clickButton(p, "Create Tag");
        await sleep(2000);
      }),
    );

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

    // === DESCRIPTION FIELD (added when groups merged into tags) ===

    results.push(
      await runTest(
        page,
        "Tags carry description through API round-trip",
        async () => {
          const create = await fetch(`${API_URL}/api/v1/tags/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: "VIP Clients",
              color: "#3b82f6",
              description: "High-priority customers and prospects",
            }),
          });
          if (!create.ok) {
            throw new Error(
              `Create with description failed: ${create.status} ${await create.text()}`,
            );
          }
          const tag = await create.json();
          if (tag.description !== "High-priority customers and prospects") {
            throw new Error(
              `description not echoed back; got ${JSON.stringify(tag.description)}`,
            );
          }

          // Update flips description to a new value
          const update = await fetch(`${API_URL}/api/v1/tags/${tag.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ description: "Top 10 accounts" }),
          });
          if (!update.ok) {
            throw new Error(`Update description failed: ${update.status}`);
          }
          const updated = await update.json();
          if (updated.description !== "Top 10 accounts") {
            throw new Error(
              `Updated description wrong: ${JSON.stringify(updated.description)}`,
            );
          }
          if (updated.name !== "VIP Clients") {
            throw new Error(
              "Patching description should not have wiped name",
            );
          }
        },
      ),
    );

    results.push(
      await runTest(
        page,
        "Tag description optional (null allowed)",
        async () => {
          const create = await fetch(`${API_URL}/api/v1/tags/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name: "No-Desc Tag" }),
          });
          if (!create.ok) {
            throw new Error(
              `Tag without description rejected: ${create.status}`,
            );
          }
          const tag = await create.json();
          if (tag.description !== null && tag.description !== undefined) {
            throw new Error(
              `Expected null description, got ${JSON.stringify(tag.description)}`,
            );
          }
        },
      ),
    );

    results.push(
      await runTest(
        page,
        "Tag description rejects strings >1000 chars",
        async () => {
          const resp = await fetch(`${API_URL}/api/v1/tags/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: "Long Desc",
              description: "x".repeat(1001),
            }),
          });
          if (resp.status !== 422) {
            throw new Error(
              `Expected 422 for >1000 char description, got ${resp.status}`,
            );
          }
        },
      ),
    );

    // === REGRESSION: contact response shape ===

    results.push(
      await runTest(
        page,
        "ContactPublic no longer carries `groups` field",
        async () => {
          const create = await fetch(`${API_URL}/api/v1/contacts/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              first_name: "Regression",
              last_name: "Check",
            }),
          });
          if (!create.ok) {
            throw new Error(`Contact create failed: ${create.status}`);
          }
          const contact = await create.json();
          if ("groups" in contact) {
            throw new Error(
              "ContactPublic still has `groups` field — frontend will crash on undefined .map",
            );
          }
          if (!("tags" in contact)) {
            throw new Error("ContactPublic missing `tags` field");
          }
          // Cleanup
          await fetch(`${API_URL}/api/v1/contacts/${contact.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        },
      ),
    );

    // Cleanup
    await cleanupTags(token);
    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== TAGS TEST RESULTS ===");
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
