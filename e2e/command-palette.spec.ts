import { test, expect } from "./fixtures"

test.describe("Command palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tags")
    // Wait for the layout's command-palette trigger to render before pressing
    // shortcuts — until it's mounted, the keydown listeners aren't attached.
    const trigger = page.getByRole("button", { name: /open command palette/i })
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await expect(trigger).toBeVisible({
          timeout: attempt === 0 ? 15_000 : 20_000,
        })
        return
      } catch (error) {
        if (attempt === 2) throw error
        await page.reload({ waitUntil: "domcontentloaded" })
      }
    }
  })

  test("trigger button opens dialog on click", async ({ page }) => {
    await page.getByRole("button", { name: /open command palette/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(
      page.getByPlaceholder(/type a command or search/i),
    ).toBeVisible()
  })

  test("Meta+K opens the dialog", async ({ page }) => {
    await page.keyboard.press("Meta+k")
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("Control+K opens the dialog", async ({ page }) => {
    await page.keyboard.press("Control+k")
    await expect(page.getByRole("dialog")).toBeVisible()
  })

  test("Escape closes the dialog", async ({ page }) => {
    await page.keyboard.press("Meta+k")
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).not.toBeVisible()
  })

  test("layout renders without runtime errors", async ({ page }) => {
    // Regression guard: a previous version of useRegisterShortcuts threw
    // "Maximum update depth exceeded" because the shortcut registry effect
    // had unstable deps. That crashed the whole layout and disabled Cmd+K
    // along with everything else. Catch it explicitly.
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on("pageerror", (e) => pageErrors.push(e.message))
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text())
    })

    await page.reload()
    await page.waitForLoadState("networkidle")
    // Give React a moment to settle any pending effects.
    await page.waitForTimeout(500)

    const updateLoop = [...pageErrors, ...consoleErrors].filter((s) =>
      /maximum update depth/i.test(s),
    )
    expect(updateLoop, "infinite render loop detected").toEqual([])
  })
})
