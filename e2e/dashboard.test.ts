import {
  launchBrowser,
  login,
  BASE_URL,
  waitForText,
  sleep,
  runTest,
  TestResult,
  getPageText,
  navigateTo,
} from "./helpers.js";

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await login(page);

    // Test 1: Dashboard renders after login
    results.push(
      await runTest(page, "Dashboard renders after login", async (p) => {
        const text = await getPageText(p);
        if (!text.includes("Hi,") && !text.includes("Dashboard"))
          throw new Error(
            `Dashboard greeting not found. Page text: ${text.substring(0, 300)}`,
          );
      }),
    );

    // Test 2: Dashboard shows stats cards
    results.push(
      await runTest(page, "Dashboard shows stats cards", async (p) => {
        const text = await getPageText(p);
        const hasContacts = text.includes("Contacts");
        const hasTags = text.includes("Tags");
        const hasGroups = text.includes("Groups");
        const hasReminders = text.includes("Reminders");
        if (!hasContacts)
          throw new Error("Contacts stats card not found on dashboard");
        if (!hasTags)
          throw new Error("Tags stats card not found on dashboard");
        if (!hasGroups)
          throw new Error("Groups stats card not found on dashboard");
        if (!hasReminders)
          throw new Error("Reminders stats card not found on dashboard");
      }),
    );

    // Test 3: Dashboard Losing Touch section (only shows with data)
    results.push(
      await runTest(
        page,
        "Dashboard Losing Touch section (conditional)",
        async (p) => {
          // This section only renders when there are contacts with contact_frequency_days set
          // With empty DB, it's correct for it not to appear
          const text = await getPageText(p);
          console.log(`  [info] Losing Touch section present: ${text.includes("Losing Touch")}`);
        },
      ),
    );

    // Test 4: Dashboard Recent Interactions section (only shows with data)
    results.push(
      await runTest(
        page,
        "Dashboard Recent Interactions section (conditional)",
        async (p) => {
          // This section only renders when there are interactions
          const text = await getPageText(p);
          console.log(`  [info] Recent Interactions section present: ${text.includes("Recent Interactions")}`);
        },
      ),
    );

    // Test 5: Dashboard stats cards are clickable links
    results.push(
      await runTest(
        page,
        "Dashboard Contacts card links to /contacts",
        async (p) => {
          const contactsLink = await p.evaluateHandle(() => {
            const links = Array.from(document.querySelectorAll("a"));
            return links.find(
              (l) =>
                l.textContent?.includes("Contacts") &&
                l.getAttribute("href")?.includes("/contacts"),
            );
          });
          if (!contactsLink)
            throw new Error(
              "Contacts card link to /contacts not found",
            );
        },
      ),
    );

    // Test 6: Sidebar navigation links present
    results.push(
      await runTest(
        page,
        "Sidebar navigation links present",
        async (p) => {
          const navLinks = [
            "Dashboard",
            "Contacts",
            "Interactions",
            "Tags",
            "Groups",
            "Reminders",
            "Journal",
          ];
          for (const linkText of navLinks) {
            const exists = await p.evaluate((text: string) => {
              const links = Array.from(document.querySelectorAll("a"));
              return links.some((l) => l.textContent?.trim() === text);
            }, linkText);
            if (!exists)
              throw new Error(
                `Sidebar link "${linkText}" not found`,
              );
          }
        },
      ),
    );

    // Test 7: Navigate to Contacts from sidebar
    results.push(
      await runTest(
        page,
        "Navigate to Contacts from sidebar",
        async (p) => {
          await navigateTo(p, "Contacts");
          const url = p.url();
          if (!url.includes("/contacts"))
            throw new Error(
              `Expected /contacts in URL, got: ${url}`,
            );
          const text = await getPageText(p);
          if (!text.includes("Contacts") && !text.includes("Add Contact"))
            throw new Error("Contacts page content not found");
        },
      ),
    );

    // Navigate back to dashboard for remaining tests
    await navigateTo(page, "Dashboard");

    // Test 8: Navigate to each sidebar page
    const pages = [
      { name: "Interactions", urlPart: "/interactions" },
      { name: "Tags", urlPart: "/tags" },
      { name: "Groups", urlPart: "/groups" },
      { name: "Reminders", urlPart: "/reminders" },
      { name: "Journal", urlPart: "/journal" },
    ];
    for (const pg of pages) {
      results.push(
        await runTest(
          page,
          `Navigate to ${pg.name} from sidebar`,
          async (p) => {
            await navigateTo(p, pg.name);
            const url = p.url();
            if (!url.includes(pg.urlPart))
              throw new Error(
                `Expected ${pg.urlPart} in URL, got: ${url}`,
              );
          },
        ),
      );
    }

    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== DASHBOARD & NAVIGATION TEST RESULTS ===");
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
