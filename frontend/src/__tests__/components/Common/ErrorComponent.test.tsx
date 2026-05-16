import { render, screen } from "@testing-library/react"
import type React from "react"
import { describe, expect, it, vi } from "vitest"
import ErrorComponent from "@/components/Common/ErrorComponent"

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

describe("ErrorComponent", () => {
  it("renders the error container", () => {
    const { container } = render(<ErrorComponent />)
    const errorDiv = container.querySelector('[data-testid="error-component"]')
    expect(errorDiv).toBeInTheDocument()
  })

  it("renders error heading", () => {
    render(<ErrorComponent />)
    expect(screen.getByText("Error")).toBeInTheDocument()
  })

  it("renders oops exclamation", () => {
    render(<ErrorComponent />)
    expect(screen.getByText("Oops!")).toBeInTheDocument()
  })

  it("renders error message", () => {
    render(<ErrorComponent />)
    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument()
  })

  it("renders go home button", () => {
    render(<ErrorComponent />)
    expect(screen.getByText("Go Home")).toBeInTheDocument()
  })

  it("button is wrapped in a link to home", () => {
    const { container } = render(<ErrorComponent />)
    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "/")
  })

  it("applies full screen container classes", () => {
    const { container } = render(<ErrorComponent />)
    const errorDiv = container.querySelector('[data-testid="error-component"]')
    expect(errorDiv).toHaveClass(
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
      "flex-col",
      "p-4",
    )
  })

  it("error text has large font size", () => {
    render(<ErrorComponent />)
    const errorText = screen.getByText("Error")
    expect(errorText).toHaveClass("text-6xl", "md:text-8xl")
  })

  it("error text is bold", () => {
    render(<ErrorComponent />)
    const errorText = screen.getByText("Error")
    expect(errorText).toHaveClass("font-bold")
  })

  it("error heading is in text wrapper", () => {
    const { container } = render(<ErrorComponent />)
    const errorDiv = container.querySelector('[data-testid="error-component"]')
    const wrapper = errorDiv?.querySelector("div > div:first-child > div")
    expect(wrapper).toBeInTheDocument()
  })

  it("oops text has large font size", () => {
    render(<ErrorComponent />)
    const oopsText = screen.getByText("Oops!")
    expect(oopsText).toHaveClass("text-2xl")
  })

  it("oops text is bold", () => {
    render(<ErrorComponent />)
    const oopsText = screen.getByText("Oops!")
    expect(oopsText).toHaveClass("font-bold")
  })

  it("error message has muted color", () => {
    render(<ErrorComponent />)
    const message = screen.getByText("Something went wrong. Please try again.")
    expect(message).toHaveClass("text-muted-foreground")
  })

  it("error message is centered", () => {
    render(<ErrorComponent />)
    const message = screen.getByText("Something went wrong. Please try again.")
    expect(message.parentElement).toHaveClass("text-center")
  })

  it("error message has text-lg class", () => {
    render(<ErrorComponent />)
    const message = screen.getByText("Something went wrong. Please try again.")
    expect(message).toHaveClass("text-lg")
  })

  it("content has z-index for layering", () => {
    const { container } = render(<ErrorComponent />)
    const mainContent = container.querySelector(
      '[data-testid="error-component"]',
    )
    expect(mainContent).toHaveClass("z-10")
  })

  it("text wrapper has margin left", () => {
    const { container } = render(<ErrorComponent />)
    const textWrapper = container.querySelector(
      "div[data-testid='error-component'] > div > div",
    )
    expect(textWrapper).toHaveClass("ml-4")
  })

  it("text wrapper is centered", () => {
    const { container } = render(<ErrorComponent />)
    const textWrapper = container.querySelector(
      "div[data-testid='error-component'] > div > div",
    )
    expect(textWrapper).toHaveClass("items-center", "justify-center")
  })

  it("error section uses flex column", () => {
    const { container } = render(<ErrorComponent />)
    const textWrapper = container.querySelector(
      "div[data-testid='error-component'] > div > div",
    )
    expect(textWrapper).toHaveClass("flex-col")
  })

  it("error text section has specific spacing", () => {
    const { container } = render(<ErrorComponent />)
    const errorText = screen.getByText("Error")
    expect(errorText.parentElement).toHaveClass("mb-4")
  })

  it("oops text section has specific spacing", () => {
    const { container } = render(<ErrorComponent />)
    const oopsText = screen.getByText("Oops!")
    expect(oopsText.parentElement).toHaveClass("mb-2")
  })

  it("message has margin bottom", () => {
    render(<ErrorComponent />)
    const message = screen.getByText("Something went wrong. Please try again.")
    expect(message).toHaveClass("mb-4")
  })

  it("link navigates to home page", () => {
    const { container } = render(<ErrorComponent />)
    const link = container.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/")
  })

  it("button is inside a link element", () => {
    const { container } = render(<ErrorComponent />)
    const link = container.querySelector("a")
    const button = link?.querySelector("button")
    expect(button).toBeInTheDocument()
  })

  it("container is flex column layout", () => {
    const { container } = render(<ErrorComponent />)
    const errorDiv = container.querySelector('[data-testid="error-component"]')
    expect(errorDiv).toHaveClass("flex", "flex-col")
  })

  it("content is centered both vertically and horizontally", () => {
    const { container } = render(<ErrorComponent />)
    const errorDiv = container.querySelector('[data-testid="error-component"]')
    expect(errorDiv).toHaveClass("items-center", "justify-center")
  })

  it("has padding for mobile responsiveness", () => {
    const { container } = render(<ErrorComponent />)
    const errorDiv = container.querySelector('[data-testid="error-component"]')
    expect(errorDiv).toHaveClass("p-4")
  })

  it("error text has tight leading", () => {
    render(<ErrorComponent />)
    const errorText = screen.getByText("Error")
    expect(errorText).toHaveClass("leading-none")
  })

  it("error and oops text are displayed in sequence", () => {
    const { container } = render(<ErrorComponent />)
    const errorSpan = screen.getByText("Error")
    const _oopsSpan = screen.getByText("Oops!")
    const parent = errorSpan.parentElement?.parentElement

    expect(parent).toBeInTheDocument()
    expect(parent?.textContent).toContain("Error")
    expect(parent?.textContent).toContain("Oops!")
  })

  it("renders without crashing", () => {
    const { container } = render(<ErrorComponent />)
    expect(container).toBeInTheDocument()
  })

  it("all main elements are present", () => {
    const { container } = render(<ErrorComponent />)
    expect(screen.getByText("Error")).toBeInTheDocument()
    expect(screen.getByText("Oops!")).toBeInTheDocument()
    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument()
    expect(screen.getByText("Go Home")).toBeInTheDocument()
    expect(container.querySelector("a")).toBeInTheDocument()
  })
})
