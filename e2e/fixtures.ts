import { test as base, expect } from "@playwright/test"

// Patterns that always indicate a real runtime bug. Other console.error
// noise (API 4xx surfaced through TanStack Query, toast messages, etc.) is
// tolerated unless the spec explicitly checks for it.
const FATAL_PATTERNS = [
  /maximum update depth exceeded/i,
  /uncaught .*error/i,
  /unhandled .*rejection/i,
]

type Fixtures = {
  /**
   * Auto-attached page-error guard. Captures every `pageerror` (uncaught
   * exception) and every `Maximum update depth exceeded`-style console error
   * during the test, and fails the test at teardown if any were observed.
   *
   * Catches whole-app crashes regardless of what the test specifically asserts
   * on — the bug that motivated this (an infinite render loop in the shortcut
   * registry) would have surfaced here even with no command-palette spec.
   */
  pageErrorGuard: void
}

export const test = base.extend<Fixtures>({
  pageErrorGuard: [
    async ({ page }, use, testInfo) => {
      const pageErrors: string[] = []
      const fatalConsoleErrors: string[] = []

      page.on("pageerror", (err) => {
        pageErrors.push(`${err.name}: ${err.message}`)
      })
      page.on("console", (msg) => {
        if (msg.type() !== "error") return
        const text = msg.text()
        if (FATAL_PATTERNS.some((p) => p.test(text))) {
          fatalConsoleErrors.push(text)
        }
      })

      await use()

      const fatal = [...pageErrors, ...fatalConsoleErrors]
      if (fatal.length === 0) return

      // Skip a few legitimate cases:
      //   - auth tests that intentionally trigger 401/403
      //   - tests that already assert on errors themselves
      const opted = testInfo.annotations.find(
        (a) => a.type === "allow-page-errors",
      )
      if (opted) return

      throw new Error(
        `Uncaught runtime errors during test "${testInfo.title}":\n` +
          fatal.map((m) => `  - ${m}`).join("\n"),
      )
    },
    { auto: true },
  ],
})

export { expect }
