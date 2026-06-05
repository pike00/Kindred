import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AppSidebar from "@/components/Sidebar/AppSidebar"
import { makeUser, renderWithProviders } from "@/test/helpers"

// Mock sidebar UI components
vi.mock("@/components/ui/sidebar", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/ui/sidebar")>()
  return {
    ...actual,
    useSidebar: () => ({
      isMobile: false,
      setOpenMobile: vi.fn(),
      open: true,
      setOpen: vi.fn(),
      toggleSidebar: vi.fn(),
    }),
    Sidebar: ({ children }: any) => <div data-testid="sidebar">{children}</div>,
    SidebarContent: ({ children }: any) => (
      <div data-testid="sidebar-content">{children}</div>
    ),
    SidebarHeader: ({ children }: any) => (
      <div data-testid="sidebar-header">{children}</div>
    ),
    SidebarFooter: ({ children }: any) => (
      <div data-testid="sidebar-footer">{children}</div>
    ),
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
      asChild,
      ...props
    }: any) => (
      <button onClick={onClick} data-active={isActive} {...props}>
        {children}
      </button>
    ),
  }
})

// Mock Logo component
vi.mock("@/components/Common/Logo", () => ({
  Logo: ({ variant }: any) => (
    <div data-testid="logo" data-variant={variant}>
      Logo
    </div>
  ),
}))

// Mock SidebarAppearance component
vi.mock("@/components/Common/Appearance", () => ({
  SidebarAppearance: () => (
    <div data-testid="sidebar-appearance">Appearance</div>
  ),
}))

// Mock User component (we'll test it separately)
vi.mock("@/components/Sidebar/User", () => ({
  User: ({ user }: any) => <div data-testid="sidebar-user">{user?.email}</div>,
}))

// Mock Main component (we'll test it separately)
vi.mock("@/components/Sidebar/Main", () => ({
  Main: ({ items }: any) => (
    <div data-testid="sidebar-main">
      {items.map((item: any) => (
        <div key={item.title} data-testid={`nav-item-${item.title}`}>
          {item.title}
        </div>
      ))}
    </div>
  ),
}))

// Mock SmartLists (renders TanStack Router Links + fetches saved filters;
// tested separately). Without this it crashes on the missing router context.
vi.mock("@/components/Sidebar/SmartLists", () => ({
  SmartLists: () => <div data-testid="sidebar-smart-lists" />,
}))

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  default: vi.fn(() => ({
    user: makeUser({ is_superuser: false }),
    logout: vi.fn(),
    loginMutation: { mutate: vi.fn(), isPending: false },
    signUpMutation: { mutate: vi.fn(), isPending: false },
  })),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  Activity: () => <span>ActivityIcon</span>,
  Home: () => <span>HomeIcon</span>,
  Users: () => <span>UsersIcon</span>,
  UsersRound: () => <span>UsersRoundIcon</span>,
  MessagesSquare: () => <span>MessagesIcon</span>,
  Tag: () => <span>TagIcon</span>,
  Bell: () => <span>BellIcon</span>,
  CalendarHeart: () => <span>CalendarIcon</span>,
  Gift: () => <span>GiftIcon</span>,
  NotebookPen: () => <span>NotebookIcon</span>,
  ShieldCheck: () => <span>ShieldIcon</span>,
}))

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders sidebar with header, content, and footer", () => {
    renderWithProviders(<AppSidebar />)

    expect(screen.getByTestId("sidebar")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-header")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument()
  })

  it("renders Logo in header", () => {
    renderWithProviders(<AppSidebar />)

    const logo = screen.getByTestId("logo")
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute("data-variant", "responsive")
  })

  it("renders all base navigation items", () => {
    renderWithProviders(<AppSidebar />)

    expect(screen.getByTestId("nav-item-Dashboard")).toBeInTheDocument()
    expect(screen.getByTestId("nav-item-Contacts")).toBeInTheDocument()
    expect(screen.getByTestId("nav-item-Interactions")).toBeInTheDocument()
    expect(screen.getByTestId("nav-item-Tags")).toBeInTheDocument()
    expect(screen.getByTestId("nav-item-Reminders")).toBeInTheDocument()
    expect(screen.getByTestId("nav-item-Calendar")).toBeInTheDocument()
  })

  it("does not render Admin item in the sidebar (moved to user popout)", () => {
    renderWithProviders(<AppSidebar />)

    expect(screen.queryByTestId("nav-item-Admin")).not.toBeInTheDocument()
  })

  it("renders SidebarAppearance in footer", () => {
    renderWithProviders(<AppSidebar />)

    expect(screen.getByTestId("sidebar-appearance")).toBeInTheDocument()
  })

  it("renders User component in footer", () => {
    renderWithProviders(<AppSidebar />)

    const sidebarUser = screen.getByTestId("sidebar-user")
    expect(sidebarUser).toBeInTheDocument()
    expect(sidebarUser).toHaveTextContent("alice@example.com")
  })

  it("renders Main component with correct items for non-superuser", () => {
    renderWithProviders(<AppSidebar />)

    const mainComponent = screen.getByTestId("sidebar-main")
    expect(mainComponent).toBeInTheDocument()
    // 9 base items: Journal removed, Activity added; Admin lives in the user popout
    expect(
      mainComponent.querySelectorAll("[data-testid^='nav-item-']"),
    ).toHaveLength(9)
  })

  it("does not add an Admin nav item for superuser (Admin moved to user popout)", async () => {
    const useAuthModule = await import("@/hooks/useAuth")
    vi.mocked(useAuthModule.default).mockReturnValueOnce({
      user: makeUser({ is_superuser: true }),
      logout: vi.fn(),
      loginMutation: { mutate: vi.fn(), isPending: false },
      signUpMutation: { mutate: vi.fn(), isPending: false },
    } as unknown as ReturnType<typeof useAuthModule.default>)

    renderWithProviders(<AppSidebar />)

    const mainComponent = screen.getByTestId("sidebar-main")
    // Still 9 items — Admin is not in the sidebar for anyone
    expect(
      mainComponent.querySelectorAll("[data-testid^='nav-item-']"),
    ).toHaveLength(9)
    expect(screen.queryByTestId("nav-item-Admin")).not.toBeInTheDocument()
  })

  it("renders with collapsible icon mode", () => {
    renderWithProviders(<AppSidebar />)

    const sidebar = screen.getByTestId("sidebar")
    expect(sidebar).toBeInTheDocument()
    // The sidebar component is rendered as expected
  })
})
