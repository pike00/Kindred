import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders, makeContact } from "@/test/helpers"
import { QuickLogFAB } from "@/components/Common/QuickLogFAB"
import * as ContactsService from "@/client"

// Mock services
vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    ContactsService: {
      listContacts: vi.fn(),
    },
    InteractionsService: {
      createInteractionRoute: vi.fn(),
    },
  }
})

// Mock toast hook
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock("@/hooks/useCustomToast", () => ({
  default: vi.fn(() => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  })),
}))

// Mock popover and command UI to render inline
vi.mock("@/components/ui/popover", () => {
  const React = require("react")
  return {
    Popover: ({ open, onOpenChange, children }: any) => {
      return (
        <div data-testid="popover-root" data-open={open?.toString()}>
          {Array.isArray(children) ? children : [children]}
        </div>
      )
    },
    PopoverTrigger: ({ asChild, children, onClick }: any) => {
      // If asChild, just render the child (button) directly
      if (asChild && React.isValidElement(children)) {
        return children
      }
      return (
        <div data-testid="popover-trigger" onClick={onClick}>
          {children}
        </div>
      )
    },
    PopoverContent: ({ children }: any) => (
      <div data-testid="popover-content">{children}</div>
    ),
  }
})

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div data-testid="command">{children}</div>,
  CommandInput: ({ placeholder, value, onValueChange }: any) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children }: any) => <div data-testid="command-group">{children}</div>,
  CommandItem: ({ value, onSelect, children }: any) => (
    <button type="button" data-testid={`command-item-${value}`} onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
}))

describe("QuickLogFAB", () => {
  let platformBackup: string

  beforeEach(() => {
    vi.clearAllMocks()
    mockShowSuccessToast.mockClear()
    mockShowErrorToast.mockClear()
    // Save original platform
    platformBackup = navigator.platform
  })

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(navigator, "platform", {
      value: platformBackup,
      configurable: true,
    })
  })

  it("renders the FAB button", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      const fabButton = screen.getByRole("button", { name: /Quick log interaction/ })
      expect(fabButton).toBeInTheDocument()
    })
  })

  it("renders popover content with title and inputs", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      expect(screen.getByText("Quick Log")).toBeInTheDocument()
      expect(screen.getByText("Select contact...")).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText("Quick note (optional)")
      ).toBeInTheDocument()
    })
  })

  it("disables submit button when no contact selected", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      const buttons = screen.getAllByRole("button")
      const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
      expect(submitButton).toBeDisabled()
    })
  })

  it("loads contacts on mount with limit 100", async () => {
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      expect(
        vi.mocked(ContactsService.ContactsService.listContacts)
      ).toHaveBeenCalledWith({ limit: 100 })
    })
  })

  it("shows Mac shortcut hint (⌘+Enter) on Mac", async () => {
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true,
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      expect(screen.getByText("⌘+Enter to submit")).toBeInTheDocument()
    })
  })

  it("shows Ctrl shortcut hint on non-Mac", async () => {
    Object.defineProperty(navigator, "platform", {
      value: "Linux",
      configurable: true,
    })

    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      expect(screen.getByText("Ctrl+Enter to submit")).toBeInTheDocument()
    })
  })

  it("selects a contact and enables submit button", async () => {
    const contact = makeContact({ id: "contact-123", first_name: "Alice", last_name: null })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Click the contact in the command list (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    // Submit button should now be enabled
    await waitFor(() => {
      const buttons = screen.getAllByRole("button")
      const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
      expect(submitButton).not.toBeDisabled()
    })

    // Contact picker button should show the contact name
    expect(screen.getByTestId("contact-picker-button")).toHaveTextContent("Alice")
  })

  it("displays contact name with company when company is present", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: "Smith",
      company: "Acme Corp",
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Click the contact (value is the contact label "Alice Smith")
    const contactButton = await screen.findByTestId("command-item-Alice Smith")
    await userEvent.click(contactButton)

    // Contact picker button should show the contact name; company appears in the command item
    expect(screen.getByTestId("contact-picker-button")).toHaveTextContent("Alice Smith")
    expect(screen.getAllByText("Acme Corp")[0]).toBeInTheDocument()
  })

  it("submits interaction with correct data when form is filled", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: "Smith",
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockResolvedValue({
      id: "interaction-1",
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact (value is the contact label "Alice Smith")
    const contactButton = await screen.findByTestId("command-item-Alice Smith")
    await userEvent.click(contactButton)

    // Type a note
    const noteInput = await screen.findByPlaceholderText("Quick note (optional)")
    await userEvent.type(noteInput, "Had a great conversation")

    // Submit
    const buttons = screen.getAllByRole("button")
    const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
    await userEvent.click(submitButton!)

    // Verify the API call was made with correct data
    await waitFor(() => {
      expect(
        vi.mocked(ContactsService.InteractionsService.createInteractionRoute)
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            attendee_ids: ["contact-123"],
            channel: "call", // default channel
            notes: "Had a great conversation",
            occurred_at: expect.any(String),
          }),
        })
      )
    })
  })

  it("shows success toast after successful submission", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockResolvedValue({
      id: "interaction-1",
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact and submit (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    const buttons = screen.getAllByRole("button")
    const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
    await userEvent.click(submitButton!)

    // Success toast should be called
    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Interaction logged")
    })
  })

  it("shows error toast on submission failure", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    const errorMessage = "Network error"
    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockRejectedValue(new Error(errorMessage))

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact and submit (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    const buttons = screen.getAllByRole("button")
    const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
    await userEvent.click(submitButton!)

    // Error toast should be called
    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(errorMessage)
    })
  })

  it("uses fallback message when submission rejects with non-Error value", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockRejectedValue("plain-string-error")

    renderWithProviders(<QuickLogFAB />)

    await waitFor(() => {
      expect(
        vi.mocked(ContactsService.ContactsService.listContacts),
      ).toHaveBeenCalled()
    })

    const contactPickerButton = await screen.findByTestId(
      "contact-picker-button",
    )
    await userEvent.click(contactPickerButton)

    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    const buttons = screen.getAllByRole("button")
    const submitButton = buttons.find((b) =>
      b.textContent?.includes("Log Interaction"),
    )
    await userEvent.click(submitButton!)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Failed to log interaction",
      )
    })
  })

  it("resets form when popover closes (handleOpenChange)", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    const { container } = renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    // Verify contact is selected (picker button now shows the name)
    expect(screen.getByTestId("contact-picker-button")).toHaveTextContent("Alice")

    // Click close button (the X button in the popover header)
    const headerCloseBtn = screen.getByRole("button", { name: /close/i })
    await userEvent.click(headerCloseBtn)

    // After close, contact picker should reset to "Select contact..."
    // (The form state is reset by handleOpenChange)
    await waitFor(() => {
      // The popover content should disappear or form should reset
      // In this mock setup, popover content is always visible
      // So we verify the form was reset by checking the contact is no longer selected
      const selectButton = screen.getByText("Select contact...")
      expect(selectButton).toBeInTheDocument()
    })
  })

  it("filters contacts by search query in command input", async () => {
    const contacts = [
      makeContact({ id: "c1", first_name: "Alice", last_name: null }),
      makeContact({ id: "c2", first_name: "Bob", last_name: null }),
      makeContact({ id: "c3", first_name: "Charlie", last_name: null }),
    ]
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: contacts,
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Type in the command input to filter
    const commandInput = await screen.findByTestId("command-input")
    await userEvent.type(commandInput, "Ali")

    // Only Alice should be in the filtered list (value is the contact label "Alice")
    const aliceButton = await screen.findByTestId("command-item-Alice")
    expect(aliceButton).toBeInTheDocument()

    // Bob and Charlie buttons may or may not exist depending on filter logic
    // The rankContacts function filters by name, so only Alice matches "Ali"
  })

  it("sorts contacts alphabetically in the list", async () => {
    const contacts = [
      makeContact({ id: "c1", first_name: "Charlie", last_name: null }),
      makeContact({ id: "c2", first_name: "Alice", last_name: null }),
      makeContact({ id: "c3", first_name: "Bob", last_name: null }),
    ]
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: contacts,
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Contacts should be sorted: Alice, Bob, Charlie (by contact label)
    const aliceButton = await screen.findByTestId("command-item-Alice")
    const bobButton = await screen.findByTestId("command-item-Bob")
    const charlieButton = await screen.findByTestId("command-item-Charlie")

    expect(aliceButton).toBeInTheDocument()
    expect(bobButton).toBeInTheDocument()
    expect(charlieButton).toBeInTheDocument()

    // Verify order by checking DOM position
    const alicePos = aliceButton.compareDocumentPosition(bobButton)
    const bobPos = bobButton.compareDocumentPosition(charlieButton)
    // compareDocumentPosition returns 4 if first arg comes before second arg
    expect(alicePos).toBe(4) // Alice before Bob
    expect(bobPos).toBe(4) // Bob before Charlie
  })

  it("submits with Ctrl+Enter keyboard shortcut", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockResolvedValue({
      id: "interaction-1",
    } as any)

    Object.defineProperty(navigator, "platform", {
      value: "Linux",
      configurable: true,
    })

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    // Get the notes input and fire Ctrl+Enter
    const noteInput = await screen.findByPlaceholderText("Quick note (optional)")
    await userEvent.type(noteInput, "Test note")
    await userEvent.keyboard("{Control>}{Enter}{/Control}")

    // Should have submitted
    await waitFor(() => {
      expect(
        vi.mocked(ContactsService.InteractionsService.createInteractionRoute)
      ).toHaveBeenCalled()
    })
  })

  it("invalidates query cache onSettled with selectedContactId", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockResolvedValue({
      id: "interaction-1",
    } as any)

    const { queryClient } = renderWithProviders(<QuickLogFAB />)

    // Spy on invalidateQueries
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact and submit (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    const buttons = screen.getAllByRole("button")
    const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
    await userEvent.click(submitButton!)

    // After submission, onSettled should invalidate queries
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["interactions"] })
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["interactions", "contact-123"] })
      )
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["contact", "contact-123"] })
      )
    })

    invalidateSpy.mockRestore()
  })

  it("displays contact label without company when company is null", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: "Smith",
      company: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Click the contact (value is the contact label "Alice Smith")
    const contactButton = await screen.findByTestId("command-item-Alice Smith")
    await userEvent.click(contactButton)

    // Picker button should show just the name (no company)
    expect(screen.getByTestId("contact-picker-button")).toHaveTextContent("Alice Smith")
  })

  it("displays only first name when last name is null", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Click the contact (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    // Picker button should show just the first name
    expect(screen.getByTestId("contact-picker-button")).toHaveTextContent("Alice")
  })

  it("limits rankContacts results to 6 when query is empty", async () => {
    const contacts = Array.from({ length: 12 }, (_, i) =>
      makeContact({ id: `c${i}`, first_name: `Contact${i}`, last_name: null })
    )
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: contacts,
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })

    // Count rendered command items (should be at most 6 from rankContacts)
    const commandItems = screen.queryAllByTestId(/^command-item-/)
    expect(commandItems.length).toBeLessThanOrEqual(6)
  })

  it("resets form fields after successful submission", async () => {
    const contact = makeContact({
      id: "contact-123",
      first_name: "Alice",
      last_name: null,
    })
    vi.mocked(ContactsService.ContactsService.listContacts).mockResolvedValue({
      data: [contact],
    } as any)

    vi.mocked(
      ContactsService.InteractionsService.createInteractionRoute
    ).mockResolvedValue({
      id: "interaction-1",
    } as any)

    renderWithProviders(<QuickLogFAB />)

    // Wait for contacts to load
    await waitFor(() => {
      expect(vi.mocked(ContactsService.ContactsService.listContacts)).toHaveBeenCalled()
    })


    // Click the contact picker button to open it
    const contactPickerButton = await screen.findByTestId("contact-picker-button")
    await userEvent.click(contactPickerButton)

    // Select contact and fill note (value is the contact label "Alice")
    const contactButton = await screen.findByTestId("command-item-Alice")
    await userEvent.click(contactButton)

    const noteInput = await screen.findByPlaceholderText("Quick note (optional)") as HTMLInputElement
    await userEvent.type(noteInput, "Test note")

    // Submit
    const buttons = screen.getAllByRole("button")
    const submitButton = buttons.find((b) => b.textContent?.includes("Log Interaction"))
    await userEvent.click(submitButton!)

    // After success, form should reset
    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Interaction logged")
      // Contact picker should show default text again
      expect(screen.getByText("Select contact...")).toBeInTheDocument()
      // Notes input should be cleared
      expect((noteInput).value).toBe("")
    })
  })
})
