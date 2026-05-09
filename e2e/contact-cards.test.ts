import type { Page } from "puppeteer";
import {
  API_URL,
  BASE_URL,
  fillInputByLabel,
  getPageText,
  launchBrowser,
  login,
  runTest,
  sleep,
  TEST_USER,
  type TestResult,
  waitForText,
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
): Promise<{ id: string }> {
  const resp = await fetch(`${API_URL}/api/v1/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  return resp.json();
}

// Click the "Add" button inside the card whose CardTitle contains `cardTitle`.
// Cards on the contact detail page each render their own "Add" button, so a
// global text match would always hit the first card on the page.
//
// Uses page.mouse.click via bounding rect rather than el.click() — Radix's
// DialogTrigger registers PointerDown listeners that synthetic clicks miss.
async function clickAddInCard(page: Page, cardTitle: string): Promise<void> {
  // Match against [data-slot="card-title"] specifically — matching against the
  // whole card-header would also pick up cards (like UnifiedTimeline) whose
  // headers contain filter pills with the same names ("Life events", etc.).
  //
  // Tag the button with a unique data attribute, then use Puppeteer's element
  // handle .click() which computes the bbox right before clicking and emits a
  // real PointerEvent. This is more reliable than computing coords ourselves
  // because layout shifts between scroll and click otherwise stale-out the box.
  const tag = `__add_${Math.random().toString(36).slice(2)}`;
  const tagged = await page.evaluate(
    (title: string, t: string) => {
      const cards = Array.from(document.querySelectorAll('[data-slot="card"]'));
      for (const card of cards) {
        const titleEl = card.querySelector('[data-slot="card-title"]');
        if (!titleEl) continue;
        if (!titleEl.textContent?.toLowerCase().includes(title.toLowerCase()))
          continue;
        const header = card.querySelector('[data-slot="card-header"]');
        const btn = header?.querySelector("button") as HTMLButtonElement | null;
        if (!btn) continue;
        btn.setAttribute("data-e2e-tag", t);
        btn.scrollIntoView({
          block: "center",
          behavior: "instant" as ScrollBehavior,
        });
        return true;
      }
      return false;
    },
    cardTitle,
    tag,
  );
  if (!tagged) {
    throw new Error(`Add button in card "${cardTitle}" not found`);
  }
  // Wait for layout to settle (avatar/skeleton swaps can shift the row).
  await sleep(250);
  const handle = await page.$(`[data-e2e-tag="${tag}"]`);
  if (!handle) {
    throw new Error(`Add button in card "${cardTitle}" disappeared after scroll`);
  }
  await handle.click();
  await sleep(500);
}

// Click the "Save" button inside the open dialog (radix uses role=dialog).
async function clickDialogSave(page: Page): Promise<void> {
  const found = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const buttons = Array.from(dialog.querySelectorAll("button"));
    const save = buttons.find((b) => b.textContent?.trim() === "Save");
    if (!save) return false;
    (save as HTMLButtonElement).click();
    return true;
  });
  if (!found) throw new Error("Dialog Save button not found");
  await sleep(1500);
}

// True iff a radix dialog is currently open.
async function dialogOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.querySelector('[role="dialog"]'));
}

async function main() {
  const browser = await launchBrowser();
  const results: TestResult[] = [];
  const token = await getAuthToken();

  await cleanupContacts(token);
  // Seed a contact via API and jump straight to its detail page.
  const contact = await createContact(token, "Card", "Subject");

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await login(page);
    await page.goto(`${BASE_URL}/contacts/${contact.id}`, {
      waitUntil: "networkidle2",
    });
    // Wait for all four expected card titles to be in the DOM rather than
    // sleeping for an arbitrary duration. The detail page lazy-loads cards
    // via independent React Query fetches, so the body text grows in waves.
    await page
      .waitForFunction(
        () => {
          const titles = Array.from(
            document.querySelectorAll('[data-slot="card-title"]'),
          ).map((e) => (e.textContent || "").trim());
          return ["Contact Information", "Addresses", "Pets", "Life events"]
            .every((needle) => titles.some((t) => t.includes(needle)));
        },
        { timeout: 10000 },
      )
      .catch(() => {});

    // Sanity check
    results.push(
      await runTest(page, "Contact detail page renders cards", async (p) => {
        const titles = await p.evaluate(() =>
          Array.from(
            document.querySelectorAll('[data-slot="card-title"]'),
          ).map((e) => (e.textContent || "").trim()),
        );
        for (const expected of [
          "Contact Information",
          "Addresses",
          "Pets",
          "Life events",
        ]) {
          if (!titles.some((t) => t.includes(expected))) {
            throw new Error(
              `Missing card on detail page: ${expected} (titles: ${titles.join(" | ")})`,
            );
          }
        }
      }),
    );

    // Address: add → expect on page
    results.push(
      await runTest(
        page,
        "Add Address dialog creates an address",
        async (p) => {
          await clickAddInCard(p, "Addresses");
          const opened = await waitForText(p, "Add address");
          if (!opened) throw new Error("Add address dialog did not open");
          await fillInputByLabel(p, "Street", "742 Evergreen Terrace");
          await fillInputByLabel(p, "City", "Springfield");
          await clickDialogSave(p);
          if (await dialogOpen(p))
            throw new Error("Add address dialog did not close after save");
          const text = await getPageText(p);
          if (!text.includes("742 Evergreen Terrace"))
            throw new Error("New address not visible on contact detail");
        },
      ),
    );

    // Pet: add → expect on page
    results.push(
      await runTest(page, "Add Pet dialog creates a pet", async (p) => {
        await clickAddInCard(p, "Pets");
        const opened = await waitForText(p, "Add pet");
        if (!opened) throw new Error("Add pet dialog did not open");
        await fillInputByLabel(p, "Name", "Snowball");
        await fillInputByLabel(p, "Species", "Cat");
        await clickDialogSave(p);
        if (await dialogOpen(p))
          throw new Error("Add pet dialog did not close after save");
        const text = await getPageText(p);
        if (!text.includes("Snowball"))
          throw new Error("New pet not visible on contact detail");
      }),
    );

    // Life event: add → expect on page
    results.push(
      await runTest(
        page,
        "Add Life Event dialog creates an event",
        async (p) => {
          await clickAddInCard(p, "Life events");
          const opened = await waitForText(p, "Add life event");
          if (!opened) throw new Error("Add life event dialog did not open");
          await fillInputByLabel(p, "Title", "Got married");
          // Date input is type="date"; populate via React's native setter.
          await p.evaluate(() => {
            const dialog = document.querySelector('[role="dialog"]');
            const input = dialog?.querySelector(
              'input[type="date"]',
            ) as HTMLInputElement | null;
            if (!input) return;
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value",
            )?.set;
            setter?.call(input, "2020-06-15");
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
          await clickDialogSave(p);
          if (await dialogOpen(p))
            throw new Error("Add life event dialog did not close after save");
          const text = await getPageText(p);
          if (!text.includes("Got married"))
            throw new Error("New life event not visible on contact detail");
        },
      ),
    );

    // Contact field: add email → expect on page
    results.push(
      await runTest(
        page,
        "Add Contact Field dialog creates an email",
        async (p) => {
          await clickAddInCard(p, "Contact Information");
          const opened = await waitForText(p, "Add contact field");
          if (!opened) throw new Error("Add contact field dialog did not open");
          // Default field type is "email"; fill label + value
          await fillInputByLabel(p, "Label", "Home");
          await fillInputByLabel(p, "Value", "marge@simpsons.test");
          await clickDialogSave(p);
          if (await dialogOpen(p))
            throw new Error(
              "Add contact field dialog did not close after save",
            );
          const text = await getPageText(p);
          if (!text.includes("marge@simpsons.test"))
            throw new Error("New contact field not visible on detail");
        },
      ),
    );

    // Edit one of the cards we just populated — exercise the Edit dialog path.
    results.push(
      await runTest(page, "Edit Pet dialog updates the pet", async (p) => {
        // Open the row actions menu inside the Pets card via real mouse click.
        const triggerBox = await p.evaluate(() => {
          const cards = Array.from(
            document.querySelectorAll('[data-slot="card"]'),
          );
          for (const card of cards) {
            const title = card.querySelector('[data-slot="card-title"]');
            if (!title?.textContent?.toLowerCase().includes("pets")) continue;
            const trigger = card.querySelector(
              'button[aria-label="Open actions menu"]',
            ) as HTMLButtonElement | null;
            if (!trigger) return null;
            trigger.scrollIntoView({
              block: "center",
              behavior: "instant" as ScrollBehavior,
            });
            const r = trigger.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }
          return null;
        });
        if (!triggerBox) {
          throw new Error("Pet row actions menu trigger not found");
        }
        await sleep(150);
        await p.mouse.click(triggerBox.x, triggerBox.y);
        await sleep(400);
        // Radix DropdownMenu items also need a real click — same trap as the
        // trigger. Use mouse.click on the menuitem's center.
        const editBox = await p.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll(
              '[role="menuitem"], [data-slot="dropdown-menu-item"]',
            ),
          );
          const edit = items.find((i) => i.textContent?.trim() === "Edit");
          if (!edit) return null;
          const r = (edit as HTMLElement).getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (!editBox) throw new Error("Edit menu item not found");
        await p.mouse.click(editBox.x, editBox.y);
        await sleep(400);
        const dialogOpened = await waitForText(p, "Edit pet");
        if (!dialogOpened) throw new Error("Edit pet dialog did not open");
        await fillInputByLabel(p, "Breed", "Persian");
        await clickDialogSave(p);
        if (await dialogOpen(p))
          throw new Error("Edit pet dialog did not close after save");
        const text = await getPageText(p);
        if (!text.includes("Persian"))
          throw new Error("Updated pet breed not visible");
      }),
    );

    await cleanupContacts(token);
    await page.close();
  } finally {
    await browser.close();
  }

  console.log("\n=== CONTACT-CARDS TEST RESULTS ===");
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
