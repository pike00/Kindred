import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Footer } from "@/components/Common/Footer"
import { useEnvironment } from "@/components/Common/EnvironmentChip"
import { renderWithProviders } from "@/test/helpers"

// Mock EnvironmentChip
vi.mock("@/components/Common/EnvironmentChip", () => ({
  EnvironmentChip: () => (
    <div data-testid="environment-chip">Environment Chip</div>
  ),
  useEnvironment: vi.fn(() => ({
    data: { environment: "local" },
  })),
}))

describe("Footer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useEnvironment).mockReturnValue({
      data: { environment: "local" },
    } as ReturnType<typeof useEnvironment>)
  })

  describe("rendering", () => {
    it("renders footer element in dev environment", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toBeInTheDocument()
    })

    it("does not render Kindred brand text", () => {
      renderWithProviders(<Footer />)
      expect(screen.queryByText(/Kindred/)).not.toBeInTheDocument()
    })

    it("renders EnvironmentChip component", () => {
      renderWithProviders(<Footer />)
      expect(screen.getByTestId("environment-chip")).toBeInTheDocument()
    })

    it("renders nothing in production environment", () => {
      vi.mocked(useEnvironment).mockReturnValue({
        data: { environment: "production" },
      } as ReturnType<typeof useEnvironment>)
      const { container } = renderWithProviders(<Footer />)
      expect(container.querySelector("footer")).not.toBeInTheDocument()
    })
  })

  describe("styling", () => {
    it("applies footer semantic HTML element", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer?.tagName).toBe("FOOTER")
    })

    it("applies border-t and border-red-700 classes in dev", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("border-t")
      expect(footer).toHaveClass("border-red-700")
    })

    it("applies bg-red-600 in dev", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("bg-red-600")
      expect(footer).toHaveClass("text-white")
    })

    it("applies padding classes", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("py-3")
      expect(footer).toHaveClass("px-6")
    })

    it("applies flex layout to content container", () => {
      const { container } = renderWithProviders(<Footer />)
      const contentDiv = container.querySelector("footer > div")
      expect(contentDiv).toHaveClass("flex")
      expect(contentDiv).toHaveClass("items-center")
      expect(contentDiv).toHaveClass("justify-center")
    })
  })

  describe("accessibility", () => {
    it("uses semantic footer element", () => {
      const { container } = renderWithProviders(<Footer />)
      expect(container.querySelector("footer")).toBeInTheDocument()
    })

    it("uses readable text size", () => {
      const { container } = renderWithProviders(<Footer />)
      const footer = container.querySelector("footer")
      expect(footer).toHaveClass("text-sm")
    })
  })

  describe("edge cases", () => {
    it("handles mounting and unmounting", () => {
      const { unmount } = renderWithProviders(<Footer />)
      expect(screen.getByTestId("environment-chip")).toBeInTheDocument()

      unmount()

      expect(screen.queryByTestId("environment-chip")).not.toBeInTheDocument()
    })

    it("handles re-render without issues", () => {
      const { rerender } = renderWithProviders(<Footer />)
      expect(screen.getByTestId("environment-chip")).toBeInTheDocument()

      rerender(<Footer />)
      expect(screen.getByTestId("environment-chip")).toBeInTheDocument()
    })
  })
})
