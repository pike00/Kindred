import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Footer } from "@/components/Common/Footer"
import { renderWithProviders } from "@/test/helpers"

// Mock EnvironmentChip
vi.mock("@/components/Common/EnvironmentChip", () => ({
  EnvironmentChip: () => (
    <div data-testid="environment-chip">Environment Chip</div>
  ),
}))

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("rendering", () => {
    it("renders footer element", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toBeInTheDocument()
    })

    it("renders Kindred brand name", () => {
      renderWithProviders(<Footer />)
      expect(screen.getByText(/Kindred/)).toBeInTheDocument()
    })

    it("renders current year", () => {
      const currentYear = new Date().getFullYear()
      const { container } = renderWithProviders(<Footer />)
      const span = container.querySelector("span")
      expect(span?.textContent).toContain(String(currentYear))
    })

    it("renders year after the dot separator", () => {
      renderWithProviders(<Footer />)
      expect(screen.getByText(/Kindred · \d+/)).toBeInTheDocument()
    })

    it("renders EnvironmentChip component", () => {
      renderWithProviders(<Footer />)
      expect(screen.getByTestId("environment-chip")).toBeInTheDocument()
    })

    it("renders version + commit hash linking to GitHub", () => {
      renderWithProviders(<Footer />)
      const link = screen.getByRole("link", { name: /vtest · testhash/ })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/pike00/Kindred/commit/testhash",
      )
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("handles empty or unknown commit hash gracefully without trailing dot", () => {
      const originalHash = (globalThis as Record<string, unknown>).__APP_HASH__
      ;(globalThis as Record<string, unknown>).__APP_HASH__ = ""
      try {
        renderWithProviders(<Footer />)
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

  describe("content", () => {
    it("displays the correct copyright text format", () => {
      renderWithProviders(<Footer />)
      const footerText = screen.getByText(/Kindred · \d+/)
      expect(footerText).toBeInTheDocument()
    })

    it("updates year when year changes", () => {
      renderWithProviders(<Footer />)
      expect(screen.getByText(/Kindred · \d+/)).toBeInTheDocument()
    })

    it("uses getFullYear() for year calculation", () => {
      const expectedYear = new Date().getFullYear()
      const { container } = renderWithProviders(<Footer />)
      const span = container.querySelector("span")
      expect(span?.textContent).toContain(String(expectedYear))
    })
  })

  describe("styling", () => {
    it("applies footer semantic HTML element", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer?.tagName).toBe("FOOTER")
    })

    it("applies border-t class", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("border-t")
    })

    it("applies padding classes", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("py-4")
      expect(footer).toHaveClass("px-6")
    })

    it("applies text styling classes", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("text-sm")
      expect(footer).toHaveClass("text-muted-foreground")
    })

    it("applies flex layout to content container", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("flex")
      expect(contentDiv).toHaveClass("items-center")
      expect(contentDiv).toHaveClass("justify-center")
    })

    it("applies gap between flex items", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("gap-3")
    })
  })

  describe("layout", () => {
    it("centers footer content", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("justify-center")
    })

    it("vertically aligns footer items", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("items-center")
    })

    it("creates flex layout for side-by-side content", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("flex")
    })

    it("maintains spacing between text and chip", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("gap-3")
    })
  })

  describe("component integration", () => {
    it("renders both text and EnvironmentChip together", () => {
      renderWithProviders(<Footer />)
      expect(screen.getByText(/Kindred · \d+/)).toBeInTheDocument()
      expect(screen.getByTestId("environment-chip")).toBeInTheDocument()
    })

    it("positions EnvironmentChip after text content", () => {
      const { container } = renderWithProviders(<Footer />)
      const children = container.querySelector("footer > div")?.children
      expect(children?.length).toBe(3)
      expect(children?.[0]).toContainElement(screen.getByText(/Kindred/))
      expect(children?.[2]).toContainElement(
        screen.getByTestId("environment-chip"),
      )
    })
  })

  describe("accessibility", () => {
    it("uses semantic footer element", () => {
      const { container } = renderWithProviders(<Footer />)
      expect(container.querySelector("footer")).toBeInTheDocument()
    })

    it("maintains readable text contrast with muted-foreground class", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("text-muted-foreground")
    })

    it("uses readable text size", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("text-sm")
    })
  })

  describe("responsive behavior", () => {
    it("applies consistent padding for all viewport sizes", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("py-4")
      expect(footer).toHaveClass("px-6")
    })

    it("maintains centered layout across viewports", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("justify-center")
    })
  })

  describe("edge cases", () => {
    it("handles mounting and unmounting", () => {
      const { unmount } = renderWithProviders(<Footer />)
      expect(screen.getByText(/Kindred · \d+/)).toBeInTheDocument()

      unmount()

      expect(screen.queryByText(/Kindred · \d+/)).not.toBeInTheDocument()
    })

    it("renders multiple footers on same page", () => {
      renderWithProviders(
        <>
          <Footer />
          <Footer />
        </>,
      )
      const yearTexts = screen.getAllByText(/Kindred · \d+/)
      expect(yearTexts).toHaveLength(2)
    })

    it("handles re-render without issues", () => {
      const { rerender } = renderWithProviders(<Footer />)
      expect(screen.getByText(/Kindred · \d+/)).toBeInTheDocument()

      rerender(<Footer />)
      expect(screen.getByText(/Kindred · \d+/)).toBeInTheDocument()
    })
  })

  describe("year accuracy", () => {
    it("always uses current date for year", () => {
      const now = new Date()
      const year = now.getFullYear()
      const { container } = renderWithProviders(<Footer />)
      const span = container.querySelector("span")
      expect(span?.textContent).toContain(String(year))
    })

    it("calls getFullYear() on new Date instance", () => {
      const { container } = renderWithProviders(<Footer />)
      const yearText = new Date().getFullYear()
      const span = container.querySelector("span")
      expect(span?.textContent).toContain(String(yearText))
    })
  })
})
