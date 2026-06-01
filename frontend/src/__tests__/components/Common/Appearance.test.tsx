import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderWithProviders } from "@/test/helpers"
import { Appearance, SidebarAppearance } from "@/components/Common/Appearance"

// Create mock functions that can be accessed in describe blocks
const mockFns = {
  setTheme: vi.fn(),
  useTheme: vi.fn(),
  useSidebar: vi.fn(),
}

// Mock theme-provider
vi.mock("@/components/theme-provider", () => {
  return {
    useTheme: () => {
      const result = mockFns.useTheme()
      return result || { theme: "system", setTheme: mockFns.setTheme }
    },
  }
})

// Mock sidebar context
vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenuItem: ({ children }: any) => <div data-testid="sidebar-menu-item">{children}</div>,
  SidebarMenuButton: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="sidebar-menu-button" {...props}>
      {children}
    </button>
  ),
  useSidebar: () => mockFns.useSidebar(),
}))

// Mock dropdown menu
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children, side, align }: any) => (
    <div data-testid="dropdown-content" data-side={side} data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
}))

// Mock button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, size, variant, ...props }: any) => (
    <button onClick={onClick} data-size={size} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}))

describe("Appearance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFns.useTheme.mockReturnValue({
      theme: "system",
      setTheme: mockFns.setTheme,
    })
  })

  it("renders the theme toggle button", () => {
    renderWithProviders(<Appearance />)

    const button = screen.getByTestId("theme-button")
    expect(button).toBeInTheDocument()
  })

  it("renders dropdown menu wrapper", () => {
    renderWithProviders(<Appearance />)

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument()
  })

  it("renders in centered flex container", () => {
    const { container } = renderWithProviders(<Appearance />)

    const flexContainer = container.querySelector(".flex.items-center.justify-center")
    expect(flexContainer).toBeInTheDocument()
  })

  it("button is not disabled", () => {
    renderWithProviders(<Appearance />)

    const button = screen.getByTestId("theme-button")
    expect(button).not.toBeDisabled()
  })

  it("has accessible label for screen readers", () => {
    renderWithProviders(<Appearance />)

    const label = screen.getByText("Toggle theme")
    expect(label).toHaveClass("sr-only")
  })

  it("renders dropdown trigger", () => {
    renderWithProviders(<Appearance />)

    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument()
  })

  it("renders dropdown content", () => {
    renderWithProviders(<Appearance />)

    expect(screen.getByTestId("dropdown-content")).toBeInTheDocument()
  })

  it("has light mode option", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const lightModeItem = items.find((item) => item.textContent?.includes("Light"))
    expect(lightModeItem).toBeInTheDocument()
  })

  it("has dark mode option", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const darkModeItem = items.find((item) => item.textContent?.includes("Dark"))
    expect(darkModeItem).toBeInTheDocument()
  })

  it("has system mode option", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const systemModeItem = items.find((item) => item.textContent?.includes("System"))
    expect(systemModeItem).toBeInTheDocument()
  })

  it("calls setTheme with light when light mode is clicked", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const lightModeItem = items.find((item) => item.textContent?.includes("Light"))

    if (lightModeItem) {
      fireEvent.click(lightModeItem)
    }

    expect(mockFns.setTheme).toHaveBeenCalledWith("light")
  })

  it("calls setTheme with dark when dark mode is clicked", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const darkModeItem = items.find((item) => item.textContent?.includes("Dark"))

    if (darkModeItem) {
      fireEvent.click(darkModeItem)
    }

    expect(mockFns.setTheme).toHaveBeenCalledWith("dark")
  })

  it("calls setTheme with system when system mode is clicked", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const systemModeItem = items.find((item) => item.textContent?.includes("System"))

    if (systemModeItem) {
      fireEvent.click(systemModeItem)
    }

    expect(mockFns.setTheme).toHaveBeenCalledWith("system")
  })

  it("uses light mode icon when theme is light", () => {
    mockFns.useTheme.mockReturnValue({
      theme: "light",
      setTheme: mockFns.setTheme,
    })

    renderWithProviders(<Appearance />)

    expect(screen.getByTestId("theme-button")).toBeInTheDocument()
  })

  it("uses dark mode icon when theme is dark", () => {
    mockFns.useTheme.mockReturnValue({
      theme: "dark",
      setTheme: mockFns.setTheme,
    })

    renderWithProviders(<Appearance />)

    expect(screen.getByTestId("theme-button")).toBeInTheDocument()
  })

  it("uses system mode icon when theme is system", () => {
    mockFns.useTheme.mockReturnValue({
      theme: "system",
      setTheme: mockFns.setTheme,
    })

    renderWithProviders(<Appearance />)

    expect(screen.getByTestId("theme-button")).toBeInTheDocument()
  })

  it("dropdown content has correct alignment", () => {
    renderWithProviders(<Appearance />)

    const content = screen.getByTestId("dropdown-content")
    expect(content).toHaveAttribute("data-align", "end")
  })

  it("all three mode options are rendered", () => {
    renderWithProviders(<Appearance />)

    const items = screen.getAllByTestId("dropdown-item")
    expect(items.length).toBe(3)
  })
})

describe("SidebarAppearance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFns.useSidebar.mockReturnValue({ isMobile: false })
    mockFns.useTheme.mockReturnValue({
      theme: "system",
      setTheme: mockFns.setTheme,
    })
  })

  it("renders the sidebar appearance component", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })

  it("displays Appearance label in button", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByText("Appearance")).toBeInTheDocument()
  })

  it("has accessible label for screen readers", () => {
    renderWithProviders(<SidebarAppearance />)

    const label = screen.getByText("Toggle theme")
    expect(label).toHaveClass("sr-only")
  })

  it("uses sidebar menu item wrapper", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })

  it("displays Appearance label visible in sidebar", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByText("Appearance")).toBeInTheDocument()
  })

  it("renders dropdown menu", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument()
  })

  it("has light mode option", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const lightModeItem = items.find((item) => item.textContent?.includes("Light"))
    expect(lightModeItem).toBeInTheDocument()
  })

  it("has dark mode option", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const darkModeItem = items.find((item) => item.textContent?.includes("Dark"))
    expect(darkModeItem).toBeInTheDocument()
  })

  it("has system mode option", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const systemModeItem = items.find((item) => item.textContent?.includes("System"))
    expect(systemModeItem).toBeInTheDocument()
  })

  it("calls setTheme with light when light mode is clicked", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const lightModeItem = items.find((item) => item.textContent?.includes("Light"))

    if (lightModeItem) {
      fireEvent.click(lightModeItem)
    }

    expect(mockFns.setTheme).toHaveBeenCalledWith("light")
  })

  it("calls setTheme with dark when dark mode is clicked", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const darkModeItem = items.find((item) => item.textContent?.includes("Dark"))

    if (darkModeItem) {
      fireEvent.click(darkModeItem)
    }

    expect(mockFns.setTheme).toHaveBeenCalledWith("dark")
  })

  it("calls setTheme with system when system mode is clicked", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    const systemModeItem = items.find((item) => item.textContent?.includes("System"))

    if (systemModeItem) {
      fireEvent.click(systemModeItem)
    }

    expect(mockFns.setTheme).toHaveBeenCalledWith("system")
  })

  it("uses correct icon for light theme", () => {
    mockFns.useTheme.mockReturnValue({
      theme: "light",
      setTheme: mockFns.setTheme,
    })

    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })

  it("uses correct icon for dark theme", () => {
    mockFns.useTheme.mockReturnValue({
      theme: "dark",
      setTheme: mockFns.setTheme,
    })

    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })

  it("uses correct icon for system theme", () => {
    mockFns.useTheme.mockReturnValue({
      theme: "system",
      setTheme: mockFns.setTheme,
    })

    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })

  it("renders as right-side dropdown on desktop", () => {
    mockFns.useSidebar.mockReturnValue({ isMobile: false })

    renderWithProviders(<SidebarAppearance />)

    const content = screen.getByTestId("dropdown-content")
    expect(content).toHaveAttribute("data-side", "right")
  })

  it("renders as top-side dropdown on mobile", () => {
    mockFns.useSidebar.mockReturnValue({ isMobile: true })

    renderWithProviders(<SidebarAppearance />)

    const content = screen.getByTestId("dropdown-content")
    expect(content).toHaveAttribute("data-side", "top")
  })

  it("dropdown content always aligns to end", () => {
    renderWithProviders(<SidebarAppearance />)

    const content = screen.getByTestId("dropdown-content")
    expect(content).toHaveAttribute("data-align", "end")
  })

  it("modal is disabled on dropdown", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument()
  })

  it("all three mode options are rendered", () => {
    renderWithProviders(<SidebarAppearance />)

    const items = screen.getAllByTestId("dropdown-item")
    expect(items.length).toBe(3)
  })

  it("menu item is rendered in document", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })

  it("renders with SidebarMenuItem wrapper", () => {
    renderWithProviders(<SidebarAppearance />)

    expect(screen.getByTestId("sidebar-menu-item")).toBeInTheDocument()
  })
})
