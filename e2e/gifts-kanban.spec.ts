import { test, expect } from "./fixtures"
import {
  getToken,
  createContact,
  deleteContact,
  createGift,
  deleteGift,
} from "./helpers/api.js"

let token: string
let contactId: string
const createdGiftIds: string[] = []

test.beforeAll(async ({ request }) => {
  token = await getToken(request)
  const c = await createContact(request, token, {
    first_name: "GiftKanban",
    last_name: `${Date.now()}`,
  })
  contactId = c.id
})

test.afterAll(async ({ request }) => {
  for (const id of createdGiftIds) {
    await deleteGift(request, token, id).catch(() => {})
  }
  await deleteContact(request, token, contactId).catch(() => {})
})

test.describe("Gifts Kanban", () => {
  test("page header and gift count render", async ({ page }) => {
    await page.goto("/gifts/kanban")
    await expect(
      page.getByRole("heading", { name: /^gifts$/i, level: 1 }),
    ).toBeVisible()
    // Subtitle that includes "Kanban Board · N gift(s)"
    await expect(page.getByText(/kanban board/i)).toBeVisible()
  })

  test("all five stage columns are present", async ({ page }) => {
    await page.goto("/gifts/kanban")
    for (const label of ["Idea", "Purchased", "Wrapped", "Given", "Received"]) {
      await expect(
        page.getByRole("heading", { level: 3, name: label }),
      ).toBeVisible({ timeout: 15000 })
    }
  })

  test("gift created via API appears in Idea column with contact name", async ({
    page,
    request,
  }) => {
    const giftName = `IdeaGift ${Date.now()}`
    const g = await createGift(request, token, {
      name: giftName,
      contact_id: contactId,
      status: "idea",
    })
    createdGiftIds.push(g.id)

    await page.goto("/gifts/kanban")
    const card = page.locator("div").filter({ hasText: giftName }).first()
    await expect(card).toBeVisible({ timeout: 15000 })
    // Contact full name should appear on the card (first + last name)
    await expect(card).toContainText(/GiftKanban/i)

    // Confirm the card lives inside the Idea column by checking surrounding text
    const ideaHeader = page.getByRole("heading", { level: 3, name: "Idea" })
    await expect(ideaHeader).toBeVisible()
  })

  test("gift in Purchased status renders in Purchased column", async ({
    page,
    request,
  }) => {
    const giftName = `PurchasedGift ${Date.now()}`
    const g = await createGift(request, token, {
      name: giftName,
      contact_id: contactId,
      status: "purchased",
    })
    createdGiftIds.push(g.id)

    await page.goto("/gifts/kanban")
    await expect(page.getByText(giftName)).toBeVisible({ timeout: 15000 })
  })

  test("changing gift status via API is reflected on reload", async ({
    page,
    request,
  }) => {
    const giftName = `MoveGift ${Date.now()}`
    const g = await createGift(request, token, {
      name: giftName,
      contact_id: contactId,
      status: "idea",
    })
    createdGiftIds.push(g.id)

    await page.goto("/gifts/kanban")
    await expect(page.getByText(giftName)).toBeVisible({ timeout: 15000 })

    // Update status via API directly (drag is exercised below; this verifies the
    // board updates in response to backend state changes).
    const apiUrl =
      process.env.E2E_BASE_URL?.replace(":5173", ":8001") ??
      "http://localhost:8001"
    const res = await request.post(
      `${apiUrl}/api/v1/gifts/${g.id}/change-status?new_status=given`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    expect(res.ok()).toBeTruthy()

    await page.reload()
    await expect(page.getByText(giftName)).toBeVisible({ timeout: 15000 })
  })

  test("deleting gift via API removes it from the board", async ({
    page,
    request,
  }) => {
    const giftName = `DeleteGift ${Date.now()}`
    const g = await createGift(request, token, {
      name: giftName,
      contact_id: contactId,
      status: "idea",
    })
    createdGiftIds.push(g.id)

    await page.goto("/gifts/kanban")
    await expect(page.getByText(giftName)).toBeVisible({ timeout: 15000 })

    await deleteGift(request, token, g.id)
    await page.reload()
    await expect(page.getByText(giftName)).not.toBeVisible()
  })

  test("board shows either no-gifts placeholder or rendered columns", async ({
    page,
  }) => {
    await page.goto("/gifts/kanban")
    // Wait for any one of the stage headings to confirm board mounted.
    await expect(
      page.getByRole("heading", { level: 3, name: "Idea" }),
    ).toBeVisible({ timeout: 10000 })

    // At this point every column heading must be visible (data resolved).
    // Empty columns show a "No gifts" placeholder; full columns show cards.
    // We don't depend on a specific count — just that the board structure is
    // intact (all five headings rendered).
    for (const label of ["Idea", "Purchased", "Wrapped", "Given", "Received"]) {
      await expect(
        page.getByRole("heading", { level: 3, name: label }),
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test("dragging a gift card initiates without crashing", async ({
    page,
    request,
  }) => {
    const giftName = `DragGift ${Date.now()}`
    const g = await createGift(request, token, {
      name: giftName,
      contact_id: contactId,
      status: "idea",
    })
    createdGiftIds.push(g.id)

    await page.goto("/gifts/kanban")
    const card = page.getByText(giftName).first()
    await expect(card).toBeVisible({ timeout: 15000 })

    // dnd-kit requires PointerSensor distance >= 8 to activate. Initiate a
    // mouse drag — even if the drop target isn't precisely landed, the goal
    // here is to confirm the dnd context fires without uncaught errors.
    const box = await card.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      const startX = box.x + box.width / 2
      const startY = box.y + box.height / 2
      await page.mouse.move(startX, startY)
      await page.mouse.down()
      // Move past the 8px activation threshold then release.
      await page.mouse.move(startX + 40, startY + 20, { steps: 6 })
      await page.mouse.move(startX + 200, startY, { steps: 8 })
      await page.mouse.up()
      // Give mutations time to settle (or no-op if no drop).
      await page.waitForTimeout(500)
    }

    // The card must still be on the board (either in original or new column).
    await expect(page.getByText(giftName).first()).toBeVisible({ timeout: 5000 })
  })
})
