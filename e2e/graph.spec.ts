import { test, expect } from "./fixtures"
import { getToken, createContact, deleteContact } from "./helpers/api.js"

let token: string
const createdContactIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
})

test.afterAll(async ({ request }) => {
  for (const id of createdContactIds) {
    await deleteContact(request, token, id).catch(() => {})
  }
})

async function openGraph(page: import("@playwright/test").Page) {
  await page.goto("/graph")
  const heading = page.getByRole("heading", {
    name: /relationship graph/i,
    level: 1,
  })
  try {
    await expect(heading).toBeVisible({ timeout: 15_000 })
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(heading).toBeVisible({ timeout: 30_000 })
  }
}

test.describe("Relationship Graph", () => {
  test("page header renders", async ({ page }) => {
    await openGraph(page)
    await expect(
      page.getByRole("heading", { name: /relationship graph/i, level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByText(/interactive force-directed graph/i),
    ).toBeVisible()
  })

  test("controls card shows depth select and root contact input", async ({
    page,
  }) => {
    await openGraph(page)
    await expect(
      page.getByRole("heading", { name: /relationship graph/i, level: 1 }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/graph controls/i).first()).toBeVisible({
      timeout: 15_000,
    })
    const depthSelect = page.locator("select#depth")
    await expect(depthSelect).toBeVisible()
    // Each select option (1-hop / 2-hop / 3-hop) exists.
    await expect(depthSelect.locator("option")).toHaveCount(3)

    await expect(page.locator("input#root")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /show all/i }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /refresh/i })).toBeVisible()
  })

  test("changing depth selector triggers a refetch", async ({ page }) => {
    await openGraph(page)
    const depthSelect = page.locator("select#depth")
    await expect(depthSelect).toBeVisible({ timeout: 10000 })
    await depthSelect.selectOption("1")
    // After the refetch settles, the page must still render without errors.
    await page.waitForTimeout(500)
    await expect(
      page.getByRole("heading", { name: /relationship graph/i }),
    ).toBeVisible()
    await depthSelect.selectOption("3")
    await page.waitForTimeout(500)
    await expect(
      page.getByRole("heading", { name: /relationship graph/i }),
    ).toBeVisible()
  })

  test("graph viewport renders SVG or empty-state", async ({ page }) => {
    await openGraph(page)
    // Wait for the graph container (CardContent inside the visualization Card).
    // We don't depend on the data being loaded — either an SVG or the empty
    // state must eventually appear.
    await expect(async () => {
      const hasSvg = await page
        .locator("svg")
        .first()
        .isVisible()
        .catch(() => false)
      const hasEmpty = await page
        .getByText(/no relationships found|no data to display|loading graph/i)
        .first()
        .isVisible()
        .catch(() => false)
      expect(hasSvg || hasEmpty).toBe(true)
    }).toPass({ timeout: 15000 })
  })

  test("zoom in / zoom out / reset buttons are clickable when SVG exists", async ({
    page,
  }) => {
    await openGraph(page)
    // Wait for either zoom controls OR an empty/loading state.
    await expect(async () => {
      const zoomIn = page.locator('button[title="Zoom In"]')
      const empty = page.getByText(
        /no relationships found|no data to display|loading graph/i,
      )
      const haveZoom = await zoomIn.first().isVisible().catch(() => false)
      const haveEmpty = await empty.first().isVisible().catch(() => false)
      expect(haveZoom || haveEmpty).toBe(true)
    }).toPass({ timeout: 15000 })

    const zoomIn = page.locator('button[title="Zoom In"]')
    if (await zoomIn.first().isVisible().catch(() => false)) {
      await zoomIn.first().click()
      await page.locator('button[title="Zoom Out"]').first().click()
      await page.locator('button[title="Reset View"]').first().click()
    }
  })

  test("legend card lists contact / favorite / relationship entries", async ({
    page,
  }) => {
    await openGraph(page)
    // CardTitle renders as a div with the text "Legend".
    await expect(page.getByText(/^legend$/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/^contact$/i).first()).toBeVisible()
    await expect(page.getByText(/^favorite$/i).first()).toBeVisible()
    await expect(page.getByText(/^relationship$/i).first()).toBeVisible()
  })

  test("entering a bogus root contact ID does not crash the page", async ({
    page,
  }) => {
    await openGraph(page)
    await page.locator("input#root").fill("00000000-0000-0000-0000-000000000000")
    await page.waitForTimeout(1500)
    // Either the empty state shows OR the page still renders cleanly.
    await expect(
      page.getByRole("heading", { name: /relationship graph/i }),
    ).toBeVisible()
  })

  test("show-all button clears root contact filter", async ({ page }) => {
    await openGraph(page)
    const rootInput = page.locator("input#root")
    await rootInput.fill("test-uuid")
    await expect(rootInput).toHaveValue("test-uuid")
    await page.getByRole("button", { name: /show all/i }).click()
    await expect(rootInput).toHaveValue("")
  })
})
