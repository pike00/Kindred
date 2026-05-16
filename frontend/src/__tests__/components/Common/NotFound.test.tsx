import { render, screen } from "@testing-library/react"
import type React from "react"
import { describe, expect, it, vi } from "vitest"
import NotFound from "@/components/Common/NotFound"

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
    useNavigate: () => vi.fn(),
  }
})

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

describe("NotFound", () => {
  it("renders the not found container", () => {
    const { container } = render(<NotFound />)
    const notFoundDiv = container.querySelector('[data-testid="not-found"]')
    expect(notFoundDiv).toBeInTheDocument()
  })

  it("renders 404 status code", () => {
    render(<NotFound />)
    expect(screen.getByText("404")).toBeInTheDocument()
  })

  it("renders oops exclamation", () => {
    render(<NotFound />)
    expect(screen.getByText("Oops!")).toBeInTheDocument()
  })

  it("renders not found message", () => {
    render(<NotFound />)
    expect(
      screen.getByText("The page you are looking for was not found."),
    ).toBeInTheDocument()
  })

  it("renders go back button", () => {
    render(<NotFound />)
    expect(screen.getByText("Go Back")).toBeInTheDocument()
  })

  it("button is wrapped in a link to home", () => {
    const { container } = render(<NotFound />)
    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "/")
  })

  it("applies full screen container classes", () => {
    const { container } = render(<NotFound />)
    const notFoundDiv = container.querySelector('[data-testid="not-found"]')
    expect(notFoundDiv).toHaveClass(
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
      "flex-col",
      "p-4",
    )
  })

  it("404 text has large font size", () => {
    render(<NotFound />)
    const notFoundText = screen.getByText("404")
    expect(notFoundText).toHaveClass("text-6xl", "md:text-8xl")
  })

  it("404 text is bold", () => {
    render(<NotFound />)
    const notFoundText = screen.getByText("404")
    expect(notFoundText).toHaveClass("font-bold")
  })

  it("404 text has tight leading", () => {
    render(<NotFound />)
    const notFoundText = screen.getByText("404")
    expect(notFoundText).toHaveClass("leading-none")
  })

  it("404 text has margin bottom", () => {
    render(<NotFound />)
    const notFoundText = screen.getByText("404")
    expect(notFoundText).toHaveClass("mb-4")
  })

  it("oops text has large font size", () => {
    render(<NotFound />)
    const oopsText = screen.getByText("Oops!")
    expect(oopsText).toHaveClass("text-2xl")
  })

  it("oops text is bold", () => {
    render(<NotFound />)
    const oopsText = screen.getByText("Oops!")
    expect(oopsText).toHaveClass("font-bold")
  })

  it("oops text has margin bottom", () => {
    render(<NotFound />)
    const oopsText = screen.getByText("Oops!")
    expect(oopsText).toHaveClass("mb-2")
  })

  it("message has text-lg class", () => {
    render(<NotFound />)
    const message = screen.getByText(
      "The page you are looking for was not found.",
    )
    expect(message).toHaveClass("text-lg")
  })

  it("message has muted color", () => {
    render(<NotFound />)
    const message = screen.getByText(
      "The page you are looking for was not found.",
    )
    expect(message).toHaveClass("text-muted-foreground")
  })

  it("message is centered", () => {
    render(<NotFound />)
    const message = screen.getByText(
      "The page you are looking for was not found.",
    )
    expect(message).toHaveClass("text-center")
  })

  it("message has margin bottom", () => {
    render(<NotFound />)
    const message = screen.getByText(
      "The page you are looking for was not found.",
    )
    expect(message).toHaveClass("mb-4")
  })

  it("content has z-index for layering", () => {
    const { container } = render(<NotFound />)
    const heading = screen.getByText("404")
    // The z-10 is on the parent div that wraps 404 and Oops!
    const mainContentDiv = container.querySelector("div[class*='z-10']")
    expect(mainContentDiv).toHaveClass("z-10")
  })

  it("text wrapper has z-index for layering", () => {
    const { container } = render(<NotFound />)
    const textWrapper = container.querySelector(
      "div[data-testid='not-found'] > div",
    )
    expect(textWrapper).toHaveClass("z-10")
  })

  it("text wrapper has margin left", () => {
    const { container } = render(<NotFound />)
    const textWrapper = container.querySelector(
      "div[data-testid='not-found'] > div > div",
    )
    expect(textWrapper).toHaveClass("ml-4")
  })

  it("text wrapper is centered", () => {
    const { container } = render(<NotFound />)
    const textWrapper = container.querySelector(
      "div[data-testid='not-found'] > div > div",
    )
    expect(textWrapper).toHaveClass("items-center", "justify-center")
  })

  it("text wrapper uses flex column", () => {
    const { container } = render(<NotFound />)
    const textWrapper = container.querySelector(
      "div[data-testid='not-found'] > div > div",
    )
    expect(textWrapper).toHaveClass("flex-col")
  })

  it("text wrapper has padding", () => {
    const { container } = render(<NotFound />)
    const textWrapper = container.querySelector(
      "div[data-testid='not-found'] > div > div",
    )
    expect(textWrapper).toHaveClass("p-4")
  })

  it("button wrapper has z-index", () => {
    const { container } = render(<NotFound />)
    const buttonWrapper = container.querySelector(
      "div[data-testid='not-found'] > div:last-child",
    )
    expect(buttonWrapper).toHaveClass("z-10")
  })

  it("button has margin top", () => {
    render(<NotFound />)
    const button = screen.getByText("Go Back")
    expect(button).toHaveClass("mt-4")
  })

  it("link navigates to home page", () => {
    const { container } = render(<NotFound />)
    const link = container.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/")
  })

  it("button is inside a link element", () => {
    const { container } = render(<NotFound />)
    const link = container.querySelector("a")
    const button = link?.querySelector("button")
    expect(button).toBeInTheDocument()
  })

  it("container is flex column layout", () => {
    const { container } = render(<NotFound />)
    const notFoundDiv = container.querySelector('[data-testid="not-found"]')
    expect(notFoundDiv).toHaveClass("flex", "flex-col")
  })

  it("content is centered both vertically and horizontally", () => {
    const { container } = render(<NotFound />)
    const notFoundDiv = container.querySelector('[data-testid="not-found"]')
    expect(notFoundDiv).toHaveClass("items-center", "justify-center")
  })

  it("has padding for mobile responsiveness", () => {
    const { container } = render(<NotFound />)
    const notFoundDiv = container.querySelector('[data-testid="not-found"]')
    expect(notFoundDiv).toHaveClass("p-4")
  })

  it("404 and oops text are in correct order", () => {
    const { container } = render(<NotFound />)
    const heading404 = screen.getByText("404")
    const _oops = screen.getByText("Oops!")
    const textContainer = heading404.parentElement?.parentElement

    expect(textContainer?.textContent).toContain("404")
    expect(textContainer?.textContent).toContain("Oops!")
  })

  it("main content wrapper has flex display", () => {
    const { container } = render(<NotFound />)
    const mainWrapper = container.querySelector(
      "div[data-testid='not-found'] > div",
    )
    expect(mainWrapper).toHaveClass("flex")
  })

  it("main content wrapper has items center", () => {
    const { container } = render(<NotFound />)
    const mainWrapper = container.querySelector(
      "div[data-testid='not-found'] > div",
    )
    expect(mainWrapper).toHaveClass("items-center")
  })

  it("renders without crashing", () => {
    const { container } = render(<NotFound />)
    expect(container).toBeInTheDocument()
  })

  it("all main elements are present", () => {
    const { container } = render(<NotFound />)
    expect(screen.getByText("404")).toBeInTheDocument()
    expect(screen.getByText("Oops!")).toBeInTheDocument()
    expect(
      screen.getByText("The page you are looking for was not found."),
    ).toBeInTheDocument()
    expect(screen.getByText("Go Back")).toBeInTheDocument()
    expect(container.querySelector("a")).toBeInTheDocument()
  })

  it("message is readable and descriptive", () => {
    render(<NotFound />)
    const message = screen.getByText(
      "The page you are looking for was not found.",
    )
    expect(message).toBeInTheDocument()
    expect(message.textContent?.length).toBeGreaterThan(10)
  })

  it("has responsive text sizes", () => {
    render(<NotFound />)
    const notFoundText = screen.getByText("404")
    expect(notFoundText).toHaveClass("text-6xl")
    expect(notFoundText).toHaveClass("md:text-8xl")
  })

  it("button is accessible via link navigation", () => {
    const { container } = render(<NotFound />)
    const link = container.querySelector("a[href='/']")
    expect(link).toBeInTheDocument()
    const button = link?.querySelector("button")
    expect(button).toBeInTheDocument()
  })
})
