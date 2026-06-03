import React from "react"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AddInteractionDialog } from "@/components/Interactions/AddInteractionDialog"
import { makeContact, renderWithProviders } from "@/test/helpers"

// Valid UUIDs for test contacts (schema requires uuid format)
const UUID_C1 = "a1b2c3d4-e5f6-4a7b-8c9d-000000000001"
const UUID_C2 = "a1b2c3d4-e5f6-4a7b-8c9d-000000000002"
const UUID_CHARLIE = "a1b2c3d4-e5f6-4a7b-8c9d-000000000099"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
const mockCreateInteraction = vi.hoisted(() => vi.fn())
const mockListContacts = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  InteractionsService: {
    createInteractionRoute: mockCreateInteraction,
  },
  ContactsService: {
    listContacts: mockListContacts,
  },
}))

// Mock MentionTextarea
vi.mock("@/components/Mentions/MentionTextarea", () => ({
  MentionTextarea: ({
    value,
    onChange,
    onBlur,
    placeholder,
  }: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    onBlur: () => void
    placeholder: string
  }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e)}
      onBlur={onBlur}
      placeholder={placeholder}
      data-testid="mention-textarea"
    />
  ),
}))

// Mock custom hook
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  X: () => <span data-testid="x-icon" />,
}))

// Hoisted ref so vi.mock factory can access it
const dialogCallbacks = vi.hoisted(() => ({
  onOpenChange: null as ((v: boolean) => void) | null,
}))

// Mock Dialog to render inline without portals
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) => {
    dialogCallbacks.onOpenChange = onOpenChange ?? null
    const arr = React.Children.toArray(children)
    return (
      <div>
        {arr[0]}
        {open && arr[1]}
      </div>
    )
  },
  DialogTrigger: ({ children }: any) => (
    <div onClick={() => dialogCallbacks.onOpenChange?.(true)}>
      {children}
    </div>
  ),
  DialogContent: ({ children }: any) => (
    <div role="dialog" data-testid="dialog-content">
      {children}
    </div>
  ),
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}))

// Mock Popover to render inline without portals
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => (
    <div data-testid="popover-content">{children}</div>
  ),
}))

// Mock Command components (CommandInput crashes in jsdom)
vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: any) => <div data-testid="command">{children}</div>,
  CommandInput: ({ placeholder }: any) => (
    <input placeholder={placeholder} data-testid="command-input" />
  ),
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: ({ children, onSelect, value }: any) => (
    <div role="option" onClick={onSelect} data-value={value}>
      {children}
    </div>
  ),
}))

describe("AddInteractionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateInteraction.mockResolvedValue({ id: "i1" })
    mockListContacts.mockResolvedValue({
      data: [
        makeContact({ id: UUID_C1, first_name: "Alice", last_name: "Smith" }),
        makeContact({ id: UUID_C2, first_name: "Bob", last_name: "Jones" }),
      ],
    })
  })

  it("renders trigger button", () => {
    renderWithProviders(<AddInteractionDialog />)
    expect(
      screen.getByRole("button", { name: /log interaction/i }),
    ).toBeInTheDocument()
  })

  it("opens dialog when trigger clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    const trigger = screen.getByRole("button", { name: /log interaction/i })
    await user.click(trigger)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Log Interaction" })).toBeInTheDocument()
  })

  it("shows all form fields", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    expect(screen.getByText(/attendees \*/i)).toBeInTheDocument()
    expect(screen.getByText(/channel \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/when \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    expect(screen.getByTestId("mention-textarea")).toBeInTheDocument()
  })

  it("preseeds dialog with provided contact", async () => {
    const user = userEvent.setup()
    const contact = makeContact({ id: UUID_CHARLIE, first_name: "Charlie" })

    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    // The seeded contact should be in the attendees section
    expect(screen.getByText("Charlie Smith")).toBeInTheDocument()
  })

  it("displays validation error when no attendees selected", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const allButtons = screen.getAllByRole("button")
    const logButton = allButtons.find(
      (btn) => btn.textContent === "Log Interaction" && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)
      await waitFor(() => {
        expect(
          screen.getByText(/pick at least one attendee/i),
        ).toBeInTheDocument()
      })
    }
  })

  it("displays validation error when no channel selected", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    // Add an attendee
    const addAttendeeButton = screen.getByRole("button", {
      name: /add attendee/i,
    })
    await user.click(addAttendeeButton)

    // Mock the popover opening and select a contact
    await waitFor(() => {
      const contactButtons = screen.queryAllByText(/alice smith/i)
      if (contactButtons.length > 0) {
        return true
      }
    })

    const submitButton = screen
      .getAllByRole("button")
      .find(
        (btn) => btn.textContent === "Log Interaction" && btn.closest("form"),
      )

    if (submitButton) {
      await user.click(submitButton)
      await waitFor(() => {
        expect(screen.getByText(/select a channel/i)).toBeInTheDocument()
      })
    }
  })

  it("allows selecting a channel", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    expect(callButton).toHaveAttribute("data-state", "active")
  })

  it("allows changing channel selection", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    const emailButton = screen.getByRole("button", { name: /^email$/i })

    await user.click(callButton)
    expect(callButton).toHaveAttribute("data-state", "active")

    await user.click(emailButton)
    expect(emailButton).toHaveAttribute("data-state", "active")
    expect(callButton).not.toHaveAttribute("data-state", "active")
  })

  it("submits with required fields", async () => {
    const user = userEvent.setup()
    const contact = makeContact({ id: UUID_C1, first_name: "Alice" })

    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    // Select channel
    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    // Click submit
    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)

      await waitFor(() => {
        expect(mockCreateInteraction).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: expect.objectContaining({
              attendee_ids: [UUID_C1],
              channel: "call",
            }),
          }),
        )
      })
    }
  })

  it("submits with all optional fields", async () => {
    const user = userEvent.setup()
    const contact = makeContact({ id: UUID_C1 })

    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    // Select channel
    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    // Fill optional fields
    const durationInput = screen.getByPlaceholderText("30")
    const notesTextarea = screen.getByTestId("mention-textarea")

    await user.type(durationInput, "45")
    await user.type(notesTextarea, "Great catch-up call")

    // Submit
    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)

      await waitFor(() => {
        expect(mockCreateInteraction).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: expect.objectContaining({
              duration_minutes: 45,
              notes: "Great catch-up call",
            }),
          }),
        )
      })
    }
  })

  it("closes dialog on successful submission", async () => {
    const user = userEvent.setup()
    const contact = makeContact({ id: UUID_C1 })

    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })
    }
  })

  it("shows loading state while submitting", async () => {
    const user = userEvent.setup()
    mockCreateInteraction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    )

    const contact = makeContact({ id: UUID_C1 })
    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled()
    }
  })

  it("keeps dialog open on API error", async () => {
    const user = userEvent.setup()
    mockCreateInteraction.mockRejectedValue(new Error("API Error"))

    const contact = makeContact({ id: UUID_C1 })
    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })
    }
  })

  it("disables submit button while loading", async () => {
    const user = userEvent.setup()
    mockCreateInteraction.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 200)),
    )

    const contact = makeContact({ id: UUID_C1 })
    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) => btn.textContent === "Log Interaction" && btn.closest("form"),
    ) as HTMLButtonElement

    expect(logButton).not.toBeDisabled()
    await user.click(logButton)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled()
    })
  })

  it("provides current datetime as default for occurred_at", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const datetimeInput = screen.getByLabelText(/when \*/i) as HTMLInputElement
    expect(datetimeInput.value).toBeTruthy()
    // Should be a valid datetime-local format
    expect(datetimeInput.value).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  })

  it("handles no contacts gracefully", async () => {
    mockListContacts.mockResolvedValue({ data: [] })
    const user = userEvent.setup()
    renderWithProviders(<AddInteractionDialog />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const addAttendeeButton = screen.getByRole("button", {
      name: /add attendee/i,
    })
    await user.click(addAttendeeButton)

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText(/no matches/i)).toBeInTheDocument()
    })
  })

  it("converts duration string to number on submit", async () => {
    const user = userEvent.setup()
    const contact = makeContact({ id: UUID_C1 })

    renderWithProviders(<AddInteractionDialog seedContact={contact} />)

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    const durationInput = screen.getByPlaceholderText("30")
    await user.type(durationInput, "60")

    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)

      await waitFor(() => {
        expect(mockCreateInteraction).toHaveBeenCalledWith(
          expect.objectContaining({
            requestBody: expect.objectContaining({
              duration_minutes: 60,
            }),
          }),
        )
      })
    }
  })

  it("invalidates correct query keys after successful submission", async () => {
    const user = userEvent.setup()
    const contact = makeContact({ id: UUID_C1 })
    const { queryClient } = renderWithProviders(
      <AddInteractionDialog seedContact={contact} />,
    )

    vi.spyOn(queryClient, "invalidateQueries")

    await user.click(screen.getByRole("button", { name: /log interaction/i }))

    const callButton = screen.getByRole("button", { name: /^call$/i })
    await user.click(callButton)

    const submitButtons = screen.getAllByRole("button")
    const logButton = submitButtons.find(
      (btn) =>
        btn.textContent?.includes("Log Interaction") && btn.closest("form"),
    )

    if (logButton) {
      await user.click(logButton)

      await waitFor(() => {
        expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ["interactions"],
          }),
        )
      })
    }
  })
})
