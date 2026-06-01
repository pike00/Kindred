import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "@/test/helpers"
import { AuthLayout } from "@/components/Common/AuthLayout"

// Mock Logo component
vi.mock("@/components/Common/Logo", () => ({
  Logo: ({ variant, className }: any) => (
    <div data-testid="logo" data-variant={variant} className={className}>
      Logo
    </div>
  ),
}))

// Mock Appearance component
vi.mock("@/components/Common/Appearance", () => ({
  Appearance: () => <div data-testid="appearance">Appearance</div>,
}))

// Mock Footer component
vi.mock("@/components/Common/Footer", () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

describe("AuthLayout", () => {
  it("renders the layout structure", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("renders the logo on the left side", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const logo = screen.getByTestId("logo")
    expect(logo).toBeInTheDocument()
  })

  it("renders the logo with 'full' variant", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const logo = screen.getByTestId("logo")
    expect(logo).toHaveAttribute("data-variant", "full")
  })

  it("renders the appearance toggle in the top right", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    expect(screen.getByTestId("appearance")).toBeInTheDocument()
  })

  it("renders the footer at the bottom", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    expect(screen.getByTestId("footer")).toBeInTheDocument()
  })

  it("renders children in the center content area", () => {
    const testContent = "My Auth Form"

    renderWithProviders(
      <AuthLayout>
        <div>{testContent}</div>
      </AuthLayout>
    )

    expect(screen.getByText(testContent)).toBeInTheDocument()
  })

  it("renders with a two-column grid layout on large screens", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const gridContainer = container.querySelector(".grid")
    expect(gridContainer).toHaveClass("lg:grid-cols-2")
  })

  it("has minimum height of screen viewport", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const gridContainer = container.querySelector(".grid")
    expect(gridContainer).toHaveClass("min-h-svh")
  })

  it("left side is hidden on mobile, visible on large screens", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const leftSide = container.querySelector(".hidden.lg\\:flex")
    expect(leftSide).toBeInTheDocument()
  })

  it("left side contains centered logo", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const leftSide = container.querySelector(".hidden.lg\\:flex")
    expect(leftSide).toHaveClass("lg:items-center")
    expect(leftSide).toHaveClass("lg:justify-center")
    expect(leftSide!.querySelector("[data-testid='logo']")).toBeInTheDocument()
  })

  it("right side contains appearance toggle, children, and footer", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div data-testid="child-content">Test Content</div>
      </AuthLayout>
    )

    // Get the flex column that is the right side
    const rightSide = container.querySelector(".flex.flex-col.gap-4")
    expect(rightSide).toBeInTheDocument()
    expect(rightSide?.querySelector("[data-testid='appearance']")).toBeInTheDocument()
    expect(rightSide?.querySelector("[data-testid='child-content']")).toBeInTheDocument()
    expect(rightSide?.querySelector("[data-testid='footer']")).toBeInTheDocument()
  })

  it("right side has correct padding", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const rightSide = container.querySelector(".flex.flex-col.gap-4")
    expect(rightSide).toHaveClass("p-6")
    expect(rightSide).toHaveClass("md:p-10")
  })

  it("appearance is in a flex container with justify-end", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const appearanceContainer = container.querySelector(".flex.justify-end")
    expect(appearanceContainer?.querySelector("[data-testid='appearance']")).toBeInTheDocument()
  })

  it("children are centered vertically and horizontally", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div data-testid="child-content">Test Content</div>
      </AuthLayout>
    )

    const centerContainer = container.querySelector(".flex.flex-1")
    expect(centerContainer).toHaveClass("items-center")
    expect(centerContainer).toHaveClass("justify-center")
    expect(centerContainer?.querySelector("[data-testid='child-content']")).toBeInTheDocument()
  })

  it("children are constrained to max-width-xs", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div data-testid="child-content">Test Content</div>
      </AuthLayout>
    )

    const childWrapper = container.querySelector(".max-w-xs")
    expect(childWrapper?.querySelector("[data-testid='child-content']")).toBeInTheDocument()
  })

  it("children occupy full width of their container", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div data-testid="child-content">Test Content</div>
      </AuthLayout>
    )

    const childWrapper = container.querySelector(".w-full")
    expect(childWrapper?.querySelector("[data-testid='child-content']")).toBeInTheDocument()
  })

  it("left side has muted background", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const leftSide = container.querySelector(".bg-muted")
    expect(leftSide).toBeInTheDocument()
  })

  it("left side uses dark background color scheme", () => {
    const { container } = renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const leftSide = container.querySelector(".dark\\:bg-zinc-900")
    expect(leftSide).toBeInTheDocument()
  })

  it("renders logo without link", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const logo = screen.getByTestId("logo")
    // Logo should be rendered with asLink={false}
    expect(logo).toBeInTheDocument()
  })

  it("supports multiple children", () => {
    renderWithProviders(
      <AuthLayout>
        <div data-testid="child1">Child 1</div>
      </AuthLayout>
    )

    expect(screen.getByTestId("child1")).toBeInTheDocument()
  })

  it("maintains layout with complex children", () => {
    renderWithProviders(
      <AuthLayout>
        <div>
          <h1>Login</h1>
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button>Sign In</button>
        </div>
      </AuthLayout>
    )

    expect(screen.getByText("Login")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
  })

  it("logo has correct text size", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const logo = screen.getByTestId("logo")
    expect(logo).toHaveClass("text-5xl")
  })

  it("logo has correct gap", () => {
    renderWithProviders(
      <AuthLayout>
        <div>Test Content</div>
      </AuthLayout>
    )

    const logo = screen.getByTestId("logo")
    expect(logo).toHaveClass("gap-4")
  })
})
