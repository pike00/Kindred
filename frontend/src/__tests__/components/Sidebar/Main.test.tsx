import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Item } from "@/components/Sidebar/Main"
import { Main } from "@/components/Sidebar/Main"
import type { LucideIcon } from "@/lib/icons"
import { renderWithProviders } from "@/test/helpers"

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
    SidebarGroup: ({ children }: any) => (
      <div data-testid="sidebar-group">{children}</div>
    ),
    SidebarGroupContent: ({ children }: any) => (
      <div data-testid="sidebar-group-content">{children}</div>
    ),
    SidebarMenu: ({ children }: any) => <ul>{children}</ul>,
    SidebarMenuItem: ({ children }: any) => <li>{children}</li>,
    SidebarMenuButton: ({
      children,
      onClick,
      isActive,
      tooltip,
      asChild,
      ...props
    }: any) => (
      <button
        onClick={onClick}
        data-active={isActive}
        title={tooltip}
        {...props}
      >
        {children}
      </button>
    ),
  }
})

const { mockUseRouterState } = vi.hoisted(() => ({
  mockUseRouterState: vi.fn(() => ({
    location: { pathname: "/" },
  })),
}))

// Mock router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={String(to)} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useRouterState: mockUseRouterState,
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  Home: () => <span>HomeIcon</span>,
  Users: () => <span>UsersIcon</span>,
  MessagesSquare: () => <span>MessagesIcon</span>,
  Tag: () => <span>TagIcon</span>,
  Bell: () => <span>BellIcon</span>,
  CalendarHeart: () => <span>CalendarIcon</span>,
  NotebookPen: () => <span>NotebookIcon</span>,
  Loader2: () => <span>LoaderIcon</span>,
}))

describe("Main", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRouterState.mockReturnValue({ location: { pathname: "/" } })
    mockUseSidebar.mockReturnValue({
      isMobile: false,
      setOpenMobile: mockSetOpenMobile,
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    })
  })

  const mockItems: Item[] = [
    {
      icon: (() => <span>HomeIcon</span>) as unknown as LucideIcon,
      title: "Dashboard",
      path: "/",
    },
    {
      icon: (() => <span>UsersIcon</span>) as unknown as LucideIcon,
      title: "Contacts",
      path: "/contacts",
    },
    {
      icon: (() => <span>MessagesIcon</span>) as unknown as LucideIcon,
      title: "Interactions",
      path: "/interactions",
    },
  ]

  it("renders sidebar group structure", () => {
    renderWithProviders(<Main items={mockItems} />)

    expect(screen.getByTestId("sidebar-group")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-group-content")).toBeInTheDocument()
  })

  it("renders all navigation items", () => {
    renderWithProviders(<Main items={mockItems} />)

    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Contacts")).toBeInTheDocument()
    expect(screen.getByText("Interactions")).toBeInTheDocument()
  })

  it("renders menu items as list items", () => {
    renderWithProviders(<Main items={mockItems} />)

    const listItems = screen.getAllByRole("listitem")
    expect(listItems).toHaveLength(3)
  })

  it("renders navigation links with correct href", () => {
    renderWithProviders(<Main items={mockItems} />)

    const dashboardLink = screen.getByText("Dashboard").closest("a")
    const contactsLink = screen.getByText("Contacts").closest("a")
    const interactionsLink = screen.getByText("Interactions").closest("a")

    expect(dashboardLink).toHaveAttribute("href", "/")
    expect(contactsLink).toHaveAttribute("href", "/contacts")
    expect(interactionsLink).toHaveAttribute("href", "/interactions")
  })

  it("renders tooltips for navigation items", () => {
    renderWithProviders(<Main items={mockItems} />)

    const dashboardButton = screen.getByText("Dashboard").closest("button")
    const contactsButton = screen.getByText("Contacts").closest("button")

    expect(dashboardButton).toHaveAttribute("title", "Dashboard")
    expect(contactsButton).toHaveAttribute("title", "Contacts")
  })

  it("marks current path as active", () => {
    mockUseRouterState.mockReturnValue({
      location: { pathname: "/contacts" },
    } as any)

    renderWithProviders(<Main items={mockItems} />)

    const dashboardButton = screen.getByText("Dashboard").closest("button")
    const contactsButton = screen.getByText("Contacts").closest("button")

    expect(dashboardButton).toHaveAttribute("data-active", "false")
    expect(contactsButton).toHaveAttribute("data-active", "true")
  })

  it("marks pending target path as pending and active during router transition", () => {
    mockUseRouterState.mockReturnValue({
      status: "pending",
      location: { pathname: "/" },
      pendingLocation: { pathname: "/contacts" },
    } as any)

    renderWithProviders(<Main items={mockItems} />)

    const contactsButton = screen.getByText("Contacts").closest("button")
    const dashboardButton = screen.getByText("Dashboard").closest("button")

    expect(contactsButton).toHaveAttribute("data-active", "true")
    expect(screen.getByText("LoaderIcon")).toBeInTheDocument()
    expect(dashboardButton).toHaveAttribute("data-active", "true")
  })

  it("does not call setOpenMobile on desktop when clicking item", async () => {
    const user = userEvent.setup()
    renderWithProviders(<Main items={mockItems} />)

    const dashboardLink = screen.getByText("Dashboard").closest("a")
    await user.click(dashboardLink!)

    expect(mockSetOpenMobile).not.toHaveBeenCalled()
  })

  it("calls setOpenMobile(false) on mobile when clicking item", async () => {
    const mockSetOpenMobileLocal = vi.fn()
    mockUseSidebar.mockReturnValue({
      isMobile: true,
      setOpenMobile: mockSetOpenMobileLocal,
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    })

    const user = userEvent.setup()
    renderWithProviders(<Main items={mockItems} />)

    const dashboardLink = screen.getByText("Dashboard").closest("a")
    await user.click(dashboardLink!)

    expect(mockSetOpenMobileLocal).toHaveBeenCalledWith(false)
  })

  it("renders empty list when no items provided", () => {
    renderWithProviders(<Main items={[]} />)

    const listItems = screen.queryAllByRole("listitem")
    expect(listItems).toHaveLength(0)
  })

  it("handles multiple active paths correctly", () => {
    // Test with /interactions path
    mockUseRouterState.mockReturnValue({
      location: { pathname: "/interactions" },
    } as any)

    renderWithProviders(<Main items={mockItems} />)

    const dashboardButton = screen.getByText("Dashboard").closest("button")
    const contactsButton = screen.getByText("Contacts").closest("button")
    const interactionsButton = screen
      .getByText("Interactions")
      .closest("button")

    expect(dashboardButton).toHaveAttribute("data-active", "false")
    expect(contactsButton).toHaveAttribute("data-active", "false")
    expect(interactionsButton).toHaveAttribute("data-active", "true")
  })

  it("marks parent menu item as active when navigating to sub-path", () => {
    mockUseRouterState.mockReturnValue({
      location: { pathname: "/contacts/detail" },
    } as any)

    renderWithProviders(<Main items={mockItems} />)

    const contactsButton = screen.getByText("Contacts").closest("button")
    expect(contactsButton).toHaveAttribute("data-active", "true")
  })

  it("handles items with special characters in titles", () => {
    const specialItems: Item[] = [
      {
        icon: (() => <span>Icon</span>) as unknown as LucideIcon,
        title: "Home & Garden",
        path: "/",
      },
      {
        icon: (() => <span>Icon</span>) as unknown as LucideIcon,
        title: "Q&A",
        path: "/qa",
      },
    ]

    renderWithProviders(<Main items={specialItems} />)

    expect(screen.getByText("Home & Garden")).toBeInTheDocument()
    expect(screen.getByText("Q&A")).toBeInTheDocument()
  })

  it("renders icons for each item", () => {
    renderWithProviders(<Main items={mockItems} />)

    const icons = screen.getAllByText(/Icon/)
    expect(icons.length).toBeGreaterThanOrEqual(3)
  })

  it("preserves item order", () => {
    renderWithProviders(<Main items={mockItems} />)

    const listItems = screen.getAllByRole("listitem")
    expect(listItems[0]).toHaveTextContent("Dashboard")
    expect(listItems[1]).toHaveTextContent("Contacts")
    expect(listItems[2]).toHaveTextContent("Interactions")
  })
})
