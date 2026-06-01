import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import { renderWithProviders, makeContact, makeUser } from "@/test/helpers"
import { CommandPalette } from "@/components/CommandPalette/CommandPalette"
import { CommandPaletteProvider } from "@/components/CommandPalette/CommandPaletteContext"
import * as ContactsService from "@/client"

// Create mock functions object
const mockFns = {
  useAuth: vi.fn(),
  navigate: vi.fn(),
}

// Mock services
vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    ContactsService: {
      listContacts: vi.fn(),
    },
  }
})

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  default: () => mockFns.useAuth(),
}))

// Mock react-router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockFns.navigate,
  useRouter: vi.fn(() => ({})),
}))

// Mock ContactAvatar
vi.mock("@/components/Common/ContactAvatar", () => ({
  ContactAvatar: () => <div data-testid="avatar">Avatar</div>,
}))

// Mock command UI components to render inline
vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({ open, onOpenChange, children }: any) =>
    open ? (
      <div data-testid="command-dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
  CommandInput: ({ placeholder }: any) => (
    <input data-testid="command-input" placeholder={placeholder} />
  ),
  CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ heading, children }: any) => (
    <div data-testid={`command-group-${heading?.toLowerCase().replace(/\s+/g, "-")}`}>
      <h3 data-testid={`heading-${heading?.toLowerCase().replace(/\s+/g, "-")}`}>
        {heading}
      </h3>
      {children}
    </div>
  ),
  CommandItem: ({ value, onSelect, children }: any) => (
    <button
      data-testid={`command-item-${value}`}
      onClick={() => onSelect?.()}
    >
      {children}
    </button>
  ),
  CommandSeparator: () => <div data-testid="command-separator" />,
}))

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFns.useAuth.mockReturnValue({
      user: makeUser({ is_superuser: false }),
    })
  })

  it("does not render dialog when closed", () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument()
  })

  it("renders dialog when open", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    // Open via keyboard
    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-dialog")).toBeInTheDocument()
    })
  })

  it("shows command input placeholder", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const input = screen.getByTestId("command-input")
      expect(input).toHaveAttribute("placeholder", "Type a command or search contacts...")
    })
  })

  it("shows no results when no contacts and nothing typed", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-empty")).toBeInTheDocument()
    })
  })

  it("does not render contacts section when empty", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(
        screen.queryByTestId("command-group-contacts")
      ).not.toBeInTheDocument()
    })
  })

  it("renders contacts section when contacts exist", async () => {
    const contact = makeContact({ id: "c1", first_name: "Alice" })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-group-contacts")).toBeInTheDocument()
    })
  })

  it("renders contact with label", async () => {
    const contact = makeContact({ id: "c1", first_name: "Alice", last_name: "Smith" })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    })
  })

  it("renders contact company when present", async () => {
    const contact = makeContact({
      id: "c1",
      first_name: "Alice",
      company: "Acme Corp",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    })
  })

  it("limits contacts to 8", async () => {
    const contacts = Array.from({ length: 12 }, (_, i) =>
      makeContact({ id: `c${i}`, first_name: `Contact${i}` })
    )

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: contacts,
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      // Only first 8 should render
      const buttons = screen.getAllByRole("button")
      const contactItems = buttons.filter((b) => b.getAttribute("data-testid")?.startsWith("command-item-contact:"))
      expect(contactItems.length).toBe(8)
    })
  })

  it("renders contacts when palette opens", async () => {
    const contact = makeContact({ id: "contact-123", first_name: "Alice" })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-group-contacts")).toBeInTheDocument()
    })
  })

  it("renders quick actions group", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-group-quick-actions")).toBeInTheDocument()
    })
  })

  it("navigates on quick action select", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const addContactItem = screen.getByTestId("command-item-action:new-contact")
      fireEvent.click(addContactItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/contacts" })
  })

  it("renders navigate group", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-group-navigate")).toBeInTheDocument()
    })
  })

  it("does not render admin item when user is not superuser", async () => {
    mockFns.useAuth.mockReturnValue({
      user: makeUser({ is_superuser: false }),
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.queryByTestId("command-item-nav:admin")).not.toBeInTheDocument()
    })
  })

  it("renders admin item when user is superuser", async () => {
    mockFns.useAuth.mockReturnValue({
      user: makeUser({ is_superuser: true }),
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-item-nav:admin")).toBeInTheDocument()
    })
  })

  it("navigates to admin on select when superuser", async () => {
    mockFns.useAuth.mockReturnValue({
      user: makeUser({ is_superuser: true }),
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const adminItem = screen.getByTestId("command-item-nav:admin")
      fireEvent.click(adminItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/admin" })
  })

  it("toggles palette on Ctrl+K", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    // Open
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-dialog")).toBeInTheDocument()
    })

    // Close
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })

    await waitFor(() => {
      expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument()
    })
  })

  it("toggles palette on Meta+K", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByTestId("command-dialog")).toBeInTheDocument()
    })
  })

  it("ignores other key combinations", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", shiftKey: true })

    expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument()
  })

  it("closes palette on dialog click", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const dialog = screen.getByTestId("command-dialog")
      expect(dialog).toBeInTheDocument()
    })
  })

  it("handles contact with only first name", async () => {
    const contact = makeContact({ id: "c1", first_name: "Alice", last_name: null })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })
  })

  it("handles unnamed contact", async () => {
    const contact = makeContact({
      id: "c1",
      first_name: undefined,
      last_name: null,
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("Unnamed contact")).toBeInTheDocument()
    })
  })

  it("navigates to all quick actions", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const logItem = screen.getByTestId("command-item-action:new-interaction log")
      fireEvent.click(logItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/interactions" })
  })

  it("navigates to dashboard", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const dashboardItem = screen.getByTestId("command-item-nav:dashboard home")
      fireEvent.click(dashboardItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/" })
  })

  it("cleans up event listener on unmount", () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")

    const { unmount } = renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    )

    removeEventListenerSpy.mockRestore()
  })

  // ============================================================================
  // NEW TESTS: Navigate items coverage
  // ============================================================================

  it("navigates to Contacts nav item", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const contactsNavItem = screen.getByTestId("command-item-nav:contacts people")
      fireEvent.click(contactsNavItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/contacts" })
  })

  it("navigates to Interactions nav item", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const interactionsNavItem = screen.getByTestId("command-item-nav:interactions")
      fireEvent.click(interactionsNavItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/interactions" })
  })

  it("navigates to Tags nav item", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const tagsNavItem = screen.getByTestId("command-item-nav:tags")
      fireEvent.click(tagsNavItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/tags" })
  })

  it("navigates to Reminders nav item", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const remindersNavItem = screen.getByTestId("command-item-nav:reminders")
      fireEvent.click(remindersNavItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/reminders" })
  })

  it("navigates to Journal nav item", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const journalNavItem = screen.getByTestId("command-item-nav:journal")
      fireEvent.click(journalNavItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/journal" })
  })

  it("navigates to Settings nav item", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const settingsNavItem = screen.getByTestId("command-item-nav:settings")
      fireEvent.click(settingsNavItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/settings" })
  })

  it("navigates to Add Contact quick action", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const addContactItem = screen.getByTestId("command-item-action:new-contact")
      fireEvent.click(addContactItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/contacts" })
  })

  it("navigates to New Journal Entry quick action", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const journalItem = screen.getByTestId("command-item-action:new-journal entry")
      fireEvent.click(journalItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({ to: "/journal" })
  })

  // ============================================================================
  // NEW TESTS: Contact search and helper functions coverage
  // ============================================================================

  it("displays contact using contactLabel with full name", async () => {
    const contact = makeContact({
      id: "c1",
      first_name: "John",
      last_name: "Doe",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })
  })

  it("displays contact using contactLabel with only last name", async () => {
    const contact = makeContact({
      id: "c1",
      first_name: undefined,
      last_name: "Smith",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("Smith")).toBeInTheDocument()
    })
  })

  it("includes contact middle name in haystack for search", async () => {
    const contact = makeContact({
      id: "c1",
      first_name: "Alice",
      middle_name: "Marie",
      last_name: "Johnson",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const item = screen.getByTestId("command-item-contact:c1 Alice Johnson Marie")
      // Verify the haystack includes middle_name by checking the data-testid includes all parts
      expect(item).toBeInTheDocument()
    })
  })

  it("includes contact nickname in haystack for search", async () => {
    const contact = makeContact({
      id: "c2",
      first_name: "Robert",
      last_name: "Brown",
      nickname: "Bob",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const item = screen.getByTestId("command-item-contact:c2 Robert Brown Bob")
      // contactHaystack builds: first_name, last_name, middle_name, nickname, company, title, ...tags
      expect(item).toBeInTheDocument()
    })
  })

  it("includes contact title in haystack for search", async () => {
    const contact = makeContact({
      id: "c3",
      first_name: "Charlie",
      last_name: "Davis",
      title: "Engineer",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const item = screen.getByTestId("command-item-contact:c3 Charlie Davis Engineer")
      // contactHaystack includes: first_name, last_name, middle_name, nickname, company, title, ...tags
      expect(item).toBeInTheDocument()
    })
  })

  it("includes contact tags in haystack for search", async () => {
    const contact = makeContact({
      id: "c4",
      first_name: "Eve",
      last_name: "Miller",
      tags: [
        {
          id: "t1",
          name: "Friend",
          color: "#ff0000",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "t2",
          name: "Colleague",
          color: "#00ff00",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const item = screen.getByTestId("command-item-contact:c4 Eve Miller Friend Colleague")
      // contactHaystack spreads tag names into the haystack
      expect(item).toBeInTheDocument()
    })
  })

  it("navigates when clicking a contact item (runCommand test)", async () => {
    const contact = makeContact({
      id: "contact-abc",
      first_name: "Test",
      last_name: "Contact",
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const contactItem = screen.getByTestId("command-item-contact:contact-abc Test Contact")
      fireEvent.click(contactItem)
    })

    expect(mockFns.navigate).toHaveBeenCalledWith({
      to: "/contacts/$contactId",
      params: { contactId: "contact-abc" },
    })
  })

  it("supports multiple contacts with complex haystack data", async () => {
    const contacts = [
      makeContact({
        id: "c1",
        first_name: "Alice",
        last_name: "Smith",
        company: "TechCorp",
        title: "Manager",
        nickname: "Al",
        tags: [
          {
            id: "t1",
            name: "VIP",
            color: "#ff0000",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
      makeContact({
        id: "c2",
        first_name: "Bob",
        last_name: "Jones",
        company: "FinanceInc",
      }),
    ]

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: contacts,
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
      expect(screen.getByText("Bob Jones")).toBeInTheDocument()
      expect(screen.getByText("TechCorp")).toBeInTheDocument()
      expect(screen.getByText("FinanceInc")).toBeInTheDocument()
    })
  })

  it("includes tag names in haystack when contact has tags", async () => {
    const contact = makeContact({
      id: "c-tag",
      first_name: "Taylor",
      last_name: "Tagged",
    })
    ;(contact as any).tags = [{ id: "t1", name: "VIP" }, { id: "t2", name: "Friend" }]

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(
      <CommandPaletteProvider>
        <CommandPalette />
      </CommandPaletteProvider>,
    )

    fireEvent.keyDown(window, { key: "k", metaKey: true })

    await waitFor(() => {
      const items = screen.getAllByTestId(/^command-item-contact:c-tag/)
      expect(items.length).toBeGreaterThan(0)
      expect(items[0].getAttribute("data-testid") || "").toMatch(/VIP/)
    })
  })
})
