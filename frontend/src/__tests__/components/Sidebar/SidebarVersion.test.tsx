import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SidebarVersion } from "@/components/Sidebar/SidebarVersion"
import { renderWithProviders } from "@/test/helpers"

// Mock EnvironmentChip
vi.mock("@/components/Common/EnvironmentChip", () => ({
  EnvironmentChip: () => (
    <div data-testid="environment-chip">Environment Chip</div>
  ),
}))

describe("SidebarVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders sidebar version component", () => {
    renderWithProviders(<SidebarVersion />)
    expect(screen.getByTestId("sidebar-version")).toBeInTheDocument()
  })

  it("renders version + commit hash linking to GitHub commit", () => {
    renderWithProviders(<SidebarVersion />)
    const link = screen.getByRole("link", { name: /vtest · testhash/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/pike00/Kindred/commit/testhash",
    )
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("renders GitHub icon", () => {
    renderWithProviders(<SidebarVersion />)
    const img = screen.getByAltText("GitHub")
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "/assets/github-mark.svg")
  })

  it("renders EnvironmentChip component", () => {
    renderWithProviders(<SidebarVersion />)
    expect(screen.getByTestId("environment-chip")).toBeInTheDocument()
  })

  it("handles empty or unknown commit hash gracefully without trailing dot", () => {
    const originalHash = (globalThis as Record<string, unknown>).__APP_HASH__
    ;(globalThis as Record<string, unknown>).__APP_HASH__ = ""
    try {
      renderWithProviders(<SidebarVersion />)
      const link = screen.getByRole("link", { name: /vtest/ })
      expect(link).toBeInTheDocument()
      expect(link.textContent).toContain("vtest")
      expect(link.textContent).not.toContain("·")
      expect(link).toHaveAttribute("href", "https://github.com/pike00/Kindred")
    } finally {
      ;(globalThis as Record<string, unknown>).__APP_HASH__ = originalHash
    }
  })
})
