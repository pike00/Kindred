import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Logo } from "@/components/Common/Logo"

// Mock React Router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: React.ReactNode
      to: string
      [key: string]: unknown
    }) => (
      <a href={String(to)} {...props}>
        {children}
      </a>
    ),
  }
})

// Mock KindredMark component
vi.mock("@/components/Common/KindredMark", () => ({
  KindredMark: ({
    className,
    "aria-hidden": ariaHidden,
    "aria-label": ariaLabel,
    ...props
  }: {
    className?: string
    "aria-hidden"?: boolean
    "aria-label"?: string
    [key: string]: unknown
  }) => (
    <div
      data-testid="kindred-mark"
      className={className}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      {...props}
    />
  ),
}))

describe("Logo", () => {
  describe("full variant", () => {
    it("renders full logo as default", () => {
      render(<Logo />)
      expect(screen.getByTestId("kindred-mark")).toBeInTheDocument()
      expect(screen.getByText("KIN")).toBeInTheDocument()
      expect(screen.getByText("DRED")).toBeInTheDocument()
    })

    it("renders full logo explicitly", () => {
      render(<Logo variant="full" />)
      expect(screen.getByTestId("kindred-mark")).toBeInTheDocument()
      expect(screen.getByText("KIN")).toBeInTheDocument()
      expect(screen.getByText("DRED")).toBeInTheDocument()
    })

    it("renders full logo with KindredMark icon", () => {
      render(<Logo variant="full" />)
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveClass("h-[1.5em]")
      expect(mark).toHaveClass("w-[1.5em]")
      expect(mark).toHaveClass("text-foreground")
    })

    it("renders KIN text with primary color", () => {
      render(<Logo variant="full" />)
      const kinText = screen.getByText("KIN")
      expect(kinText).toHaveClass("text-primary")
    })

    it("renders DRED text with foreground color", () => {
      render(<Logo variant="full" />)
      const dredText = screen.getByText("DRED")
      expect(dredText).toHaveClass("text-foreground")
    })

    it("renders full logo as link when asLink is true", () => {
      render(<Logo variant="full" asLink={true} />)
      const link = screen.getByRole("link", { name: /Kindred/ })
      expect(link).toHaveAttribute("href", "/")
    })

    it("renders full logo without link when asLink is false", () => {
      render(<Logo variant="full" asLink={false} />)
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByText("KIN")).toBeInTheDocument()
    })

    it("applies custom className to full logo", () => {
      const { container } = render(
        <Logo variant="full" className="custom-class" />,
      )
      const span = container.querySelector("span")
      expect(span).toHaveClass("custom-class")
    })

    it("includes sr-only accessibility text", () => {
      render(<Logo variant="full" />)
      const srOnlyText = screen.getByText("Kindred")
      expect(srOnlyText).toHaveClass("sr-only")
    })
  })

  describe("icon variant", () => {
    it("renders icon variant", () => {
      render(<Logo variant="icon" />)
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveClass("h-7")
      expect(mark).toHaveClass("w-7")
      expect(mark).toHaveClass("text-foreground")
    })

    it("renders icon variant with aria-label", () => {
      render(<Logo variant="icon" />)
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveAttribute("aria-label", "Kindred")
    })

    it("renders icon as link when asLink is true", () => {
      render(<Logo variant="icon" asLink={true} />)
      const link = screen.getByRole("link", { name: /Kindred/ })
      expect(link).toHaveAttribute("href", "/")
    })

    it("renders icon without link when asLink is false", () => {
      render(<Logo variant="icon" asLink={false} />)
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByTestId("kindred-mark")).toBeInTheDocument()
    })

    it("applies custom className to icon", () => {
      const { container } = render(
        <Logo variant="icon" className="custom-size" />,
      )
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveClass("custom-size")
    })

    it("does not render text in icon variant", () => {
      render(<Logo variant="icon" />)
      expect(screen.queryByText("KIN")).not.toBeInTheDocument()
      expect(screen.queryByText("DRED")).not.toBeInTheDocument()
    })
  })

  describe("responsive variant", () => {
    it("renders responsive variant", () => {
      render(<Logo variant="responsive" />)
      const marks = screen.getAllByTestId("kindred-mark")
      expect(marks.length).toBeGreaterThanOrEqual(1)
    })

    it("shows full mark on larger screens", () => {
      const { container } = render(<Logo variant="responsive" />)
      const fullMarkSpan = container.querySelector("span")
      expect(fullMarkSpan).toHaveClass("group-data-[collapsible=icon]:hidden")
    })

    it("renders icon mark for collapsed state", () => {
      render(<Logo variant="responsive" />)
      const marks = screen.getAllByTestId("kindred-mark")
      expect(marks[1]).toHaveClass("group-data-[collapsible=icon]:block")
    })

    it("renders responsive variant as link when asLink is true", () => {
      render(<Logo variant="responsive" asLink={true} />)
      const link = screen.getByRole("link", { name: /Kindred/ })
      expect(link).toHaveAttribute("href", "/")
    })

    it("renders responsive variant without link when asLink is false", () => {
      render(<Logo variant="responsive" asLink={false} />)
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByTestId("kindred-mark")).toBeInTheDocument()
    })

    it("applies custom className to responsive variant", () => {
      const { container } = render(
        <Logo variant="responsive" className="responsive-custom" />,
      )
      expect(container.textContent).toBeTruthy()
    })
  })

  describe("asLink prop", () => {
    it("renders as link by default", () => {
      render(<Logo />)
      const link = screen.getByRole("link", { name: /Kindred/ })
      expect(link).toHaveAttribute("href", "/")
    })

    it("renders as link when asLink is explicitly true", () => {
      render(<Logo asLink={true} />)
      const link = screen.getByRole("link", { name: /Kindred/ })
      expect(link).toHaveAttribute("href", "/")
    })

    it("renders without link when asLink is false", () => {
      render(<Logo asLink={false} />)
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByText("KIN")).toBeInTheDocument()
    })

    it("all variants support asLink prop", () => {
      const { rerender } = render(<Logo variant="full" asLink={true} />)
      expect(screen.getByRole("link")).toHaveAttribute("href", "/")

      rerender(<Logo variant="icon" asLink={true} />)
      expect(screen.getByRole("link")).toHaveAttribute("href", "/")

      rerender(<Logo variant="responsive" asLink={true} />)
      expect(screen.getByRole("link")).toHaveAttribute("href", "/")
    })
  })

  describe("className prop", () => {
    it("applies custom className to full variant", () => {
      const { container } = render(<Logo className="custom-full" />)
      const span = container.querySelector("span")
      expect(span).toHaveClass("custom-full")
    })

    it("applies custom className to icon variant", () => {
      render(<Logo variant="icon" className="custom-icon" />)
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveClass("custom-icon")
    })

    it("applies custom className to responsive variant", () => {
      render(<Logo variant="responsive" className="custom-responsive" />)
      const marks = screen.getAllByTestId("kindred-mark")
      expect(marks[0]).toHaveClass("custom-responsive")
    })
  })

  describe("accessibility", () => {
    it("icon variant has aria-label", () => {
      render(<Logo variant="icon" />)
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveAttribute("aria-label", "Kindred")
    })

    it("full variant has sr-only text for screen readers", () => {
      render(<Logo variant="full" />)
      const srText = screen.getByText("Kindred")
      expect(srText).toHaveClass("sr-only")
    })

    it("full variant marks icon as aria-hidden", () => {
      render(<Logo variant="full" />)
      const mark = screen.getByTestId("kindred-mark")
      expect(mark).toHaveAttribute("aria-hidden", "true")
    })

    it("responsive variant marks full mark as aria-hidden", () => {
      const { container } = render(<Logo variant="responsive" />)
      const marks = screen.getAllByTestId("kindred-mark")
      expect(marks.some((m) => m.getAttribute("aria-hidden") === "true")).toBe(
        true,
      )
    })

    it("links navigate to home", () => {
      render(<Logo asLink={true} />)
      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/")
    })
  })

  describe("edge cases", () => {
    it("handles no props (uses all defaults)", () => {
      render(<Logo />)
      expect(screen.getByText("KIN")).toBeInTheDocument()
      expect(screen.getByText("DRED")).toBeInTheDocument()
      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/")
    })

    it("can render multiple logos on same page", () => {
      render(
        <>
          <Logo />
          <Logo variant="icon" />
          <Logo variant="responsive" />
        </>,
      )
      const links = screen.getAllByRole("link")
      expect(links.length).toBeGreaterThanOrEqual(3)
    })

    it("handles variant changes", () => {
      const { rerender } = render(<Logo variant="full" />)
      expect(screen.getByText("KIN")).toBeInTheDocument()

      rerender(<Logo variant="icon" />)
      expect(screen.queryByText("KIN")).not.toBeInTheDocument()

      rerender(<Logo variant="responsive" />)
      expect(screen.getByText("KIN")).toBeInTheDocument()
    })

    it("handles asLink prop changes", () => {
      const { rerender } = render(<Logo asLink={true} />)
      expect(screen.getByRole("link")).toBeInTheDocument()

      rerender(<Logo asLink={false} />)
      expect(screen.queryByRole("link")).not.toBeInTheDocument()

      rerender(<Logo asLink={true} />)
      expect(screen.getByRole("link")).toBeInTheDocument()
    })
  })
})
