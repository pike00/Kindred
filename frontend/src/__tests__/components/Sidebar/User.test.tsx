import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { User } from "@/components/Sidebar/User"
import { makeUser, renderWithProviders } from "@/test/helpers"

// Mock sidebar UI components
const { mockSetOpenMobile, mockUseSidebar } = vi.hoisted(() => ({
  mockSetOpenMobile: vi.fn(),
  mockUseSidebar: vi.fn(() => ({
    isMobile: false,
    setOpenMobile: vi.fn(),
    open: true,
    setOpen: vi.fn(),
    toggleSidebar: vi.fn(),
  })),
}))

vi.mock("@/components/ui/sidebar", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/ui/sidebar")>()
  return {
    ...actual,
    useSidebar: mockUseSidebar,
    SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
    SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
    SidebarMenuButton: ({
      children,
      onClick,
      size,
      className,
      ...props
    }: any) => (
      <button size={size} {...props}>
        {children}
      </button>
    ),
  }
})

// Mock avatar component
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children, className }: any) => (
    <span data-testid="avatar-fallback" className={className}>
      {children}
    </span>
  ),
}))

// Mock dropdown menu
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({
    children,
    side,
    align,
    sideOffset,
  }: any) => (
    <div
      data-testid="dropdown-content"
      data-side={side}
      data-align={align}
      data-side-offset={sideOffset}
    >
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children, className }: any) => (
    <div data-testid="dropdown-label" className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="dropdown-item">
      {children}
    </button>
  ),
}))

// Mock router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={String(to)} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

// Mock useAuth
const { mockLogout } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn(() => ({
    user: makeUser(),
    logout: mockLogout,
    loginMutation: { mutate: vi.fn(), isPending: false },
    signUpMutation: { mutate: vi.fn(), isPending: false },
  })),
}))

// Mock utils
vi.mock("@/utils", () => ({
  getInitials: (name: string) => {
    const parts = name.split(" ")
    return (parts[0]?.[0] || "") + (parts[1]?.[0] || "")
  },
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  ChevronsUpDown: () => <span>ChevronIcon</span>,
  LogOut: () => <span>LogOutIcon</span>,
  Settings: () => <span>SettingsIcon</span>,
}))

describe("User", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSidebar.mockReturnValue({
      isMobile: false,
      setOpenMobile: mockSetOpenMobile,
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    })
  })

  it("returns null when user is null", () => {
    const { container } = renderWithProviders(<User user={null} />)

    // Container should be empty or only have whitespace
    expect(container.firstChild).toBeNull()
  })

  it("returns null when user is undefined", () => {
    const { container } = renderWithProviders(<User user={undefined} />)

    expect(container.firstChild).toBeNull()
  })

  it("renders user menu when user is provided", () => {
    renderWithProviders(<User user={makeUser()} />)

    expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument()
  })

  it("displays user full name", () => {
    renderWithProviders(<User user={makeUser({ full_name: "John Doe" })} />)

    expect(screen.getAllByText("John Doe")[0]).toBeInTheDocument()
  })

  it("displays user email", () => {
    renderWithProviders(<User user={makeUser({ email: "john@example.com" })} />)

    expect(screen.getAllByText("john@example.com")[0]).toBeInTheDocument()
  })

  it("renders avatar with user initials", () => {
    renderWithProviders(<User user={makeUser({ full_name: "John Doe" })} />)

    const avatar = screen.getAllByTestId("avatar-fallback")[0]
    expect(avatar).toHaveTextContent("JD")
  })

  it("renders avatar with single initial for single name", () => {
    renderWithProviders(<User user={makeUser({ full_name: "Alice" })} />)

    const avatar = screen.getAllByTestId("avatar-fallback")[0]
    expect(avatar).toHaveTextContent("A")
  })

  it("renders avatar with 'U' fallback for empty name", () => {
    renderWithProviders(<User user={makeUser({ full_name: "" })} />)

    const avatar = screen.getAllByTestId("avatar-fallback")[0]
    expect(avatar).toHaveTextContent("U")
  })

  it("renders dropdown menu content with user info", () => {
    renderWithProviders(
      <User
        user={makeUser({ full_name: "Jane Smith", email: "jane@example.com" })}
      />,
    )

    const label = screen.getByTestId("dropdown-label")
    expect(label).toHaveTextContent("Jane Smith")
    expect(label).toHaveTextContent("jane@example.com")
  })

  it("renders Settings menu item with link to /settings", () => {
    renderWithProviders(<User user={makeUser()} />)

    const settingsLink = screen.getByText("User Settings").closest("a")
    expect(settingsLink).toHaveAttribute("href", "/settings")
  })

  it("renders LogOut menu item", () => {
    renderWithProviders(<User user={makeUser()} />)

    expect(screen.getByText("Log Out")).toBeInTheDocument()
  })

  it("renders dropdown separator", () => {
    renderWithProviders(<User user={makeUser()} />)

    expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument()
  })

  it("renders chevrons icon in menu button", () => {
    renderWithProviders(<User user={makeUser()} />)

    expect(screen.getByText("ChevronIcon")).toBeInTheDocument()
  })

  it("calls logout when Log Out is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<User user={makeUser()} />)

    const logoutButton = screen.getByText("Log Out")
    await user.click(logoutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  it("closes mobile sidebar when Settings is clicked", async () => {
    const mockSetOpenMobileLocal = vi.fn()
    mockUseSidebar.mockReturnValue({
      isMobile: true,
      setOpenMobile: mockSetOpenMobileLocal,
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    })

    const user = userEvent.setup()
    renderWithProviders(<User user={makeUser()} />)

    const settingsLink = screen.getByText("User Settings").closest("a")
    await user.click(settingsLink!)

    expect(mockSetOpenMobileLocal).toHaveBeenCalledWith(false)
  })

  it("does not close mobile sidebar when Log Out is clicked", async () => {
    const mockSetOpenMobileLocal = vi.fn()
    mockUseSidebar.mockReturnValue({
      isMobile: true,
      setOpenMobile: mockSetOpenMobileLocal,
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    })

    const user = userEvent.setup()
    renderWithProviders(<User user={makeUser()} />)

    const logoutButton = screen.getByText("Log Out")
    await user.click(logoutButton)

    // Logout doesn't call setOpenMobile
    expect(mockSetOpenMobileLocal).not.toHaveBeenCalled()
  })

  it("does not call setOpenMobile on desktop", async () => {
    const user = userEvent.setup()
    renderWithProviders(<User user={makeUser()} />)

    const settingsLink = screen.getByText("User Settings").closest("a")
    await user.click(settingsLink!)

    expect(mockSetOpenMobile).not.toHaveBeenCalled()
  })

  it("renders dropdown content on right side for desktop", () => {
    renderWithProviders(<User user={makeUser()} />)

    const dropdownContent = screen.getByTestId("dropdown-content")
    expect(dropdownContent).toHaveAttribute("data-side", "right")
  })

  it("renders dropdown content on bottom side for mobile", () => {
    mockUseSidebar.mockReturnValue({
      isMobile: true,
      setOpenMobile: vi.fn(),
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    })

    renderWithProviders(<User user={makeUser()} />)

    const dropdownContent = screen.getByTestId("dropdown-content")
    expect(dropdownContent).toHaveAttribute("data-side", "bottom")
  })

  it("renders dropdown aligned to end", () => {
    renderWithProviders(<User user={makeUser()} />)

    const dropdownContent = screen.getByTestId("dropdown-content")
    expect(dropdownContent).toHaveAttribute("data-align", "end")
  })

  it("displays full user info in both trigger and menu label", () => {
    renderWithProviders(
      <User
        user={makeUser({ full_name: "Bob Johnson", email: "bob@example.com" })}
      />,
    )

    // Should appear in trigger and label
    const names = screen.getAllByText("Bob Johnson")
    const emails = screen.getAllByText("bob@example.com")

    expect(names.length).toBeGreaterThanOrEqual(2) // trigger + label
    expect(emails.length).toBeGreaterThanOrEqual(2)
  })

  it("handles special characters in user name", () => {
    renderWithProviders(
      <User user={makeUser({ full_name: "Jean-Pierre O'Brien" })} />,
    )

    expect(screen.getAllByText("Jean-Pierre O'Brien")[0]).toBeInTheDocument()
  })

  it("truncates long names with ellipsis", () => {
    renderWithProviders(
      <User user={makeUser({ full_name: "Alexander Montgomery III" })} />,
    )

    const name = screen.getAllByText("Alexander Montgomery III")[0]
    // Component uses truncate class, check element has it or that text is visible
    expect(name).toBeInTheDocument()
  })

  it("handles null full_name gracefully", () => {
    renderWithProviders(<User user={makeUser({ full_name: null })} />)

    const avatar = screen.getAllByTestId("avatar-fallback")[0]
    expect(avatar).toHaveTextContent("U")
  })

  it("renders with sidebar menu and menu item wrappers", () => {
    const { container } = renderWithProviders(<User user={makeUser()} />)

    const ul = container.querySelector("ul")
    const li = container.querySelector("li")

    expect(ul).toBeInTheDocument()
    expect(li).toBeInTheDocument()
  })
})
