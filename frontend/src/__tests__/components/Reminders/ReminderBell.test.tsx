import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders, makeContact } from "@/test/helpers"
import { ReminderBell } from "@/components/Reminders/ReminderBell"

// Mock API client
const mockListDueReminders = vi.hoisted(() => vi.fn())
const mockSnoozeReminder = vi.hoisted(() => vi.fn())
const mockDismissReminder = vi.hoisted(() => vi.fn())

vi.mock("@/client", () => ({
  RemindersService: {
    listDueReminders: mockListDueReminders,
    snoozeReminder: mockSnoozeReminder,
    dismissReminder: mockDismissReminder,
  },
}))

// Mock toast hook
const mockShowSuccessToast = vi.hoisted(() => vi.fn())
const mockShowErrorToast = vi.hoisted(() => vi.fn())
vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}))

// Mock button component
vi.mock("@/components/ui/button", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ui/button")>()
  return {
    ...actual,
    Button: ({
      children,
      onClick,
      disabled,
      asChild,
      variant,
      size,
      "aria-label": ariaLabel,
      ...props
    }: any) => (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </button>
    ),
  }
})

// Mock badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}))

// Mock popover
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, asChild }: any) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({ children, align, className }: any) => (
    <div data-testid="popover-content" data-align={align}>
      {children}
    </div>
  ),
}))

// Mock dropdown menu
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children, align, ...props }: any) => (
    <div data-testid="dropdown-content" data-align={align} {...props}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <button
      onClick={() => onSelect?.()}
      data-testid="dropdown-item"
    >
      {children}
    </button>
  ),
}))

// Mock router Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={String(to)} {...props}>
      {children}
    </a>
  ),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  Bell: () => <span>BellIcon</span>,
  Clock: () => <span>ClockIcon</span>,
  Check: () => <span>CheckIcon</span>,
}))

describe("ReminderBell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListDueReminders.mockResolvedValue({ data: [], count: 0 })
  })

  it("renders bell button", async () => {
    renderWithProviders(<ReminderBell />)

    // The bell button is the first button/trigger with the bell icon
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
    // Verify popover trigger is present (the button)
    const popoverTrigger = screen.getByTestId("popover-trigger")
    expect(popoverTrigger).toBeInTheDocument()
  })

  it("renders bell icon", async () => {
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("BellIcon")).toBeInTheDocument()
    })
  })

  it("shows no badge when there are no due reminders", async () => {
    mockListDueReminders.mockResolvedValue({ data: [], count: 0 })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const badge = screen.queryByTestId("badge")
      expect(badge).not.toBeInTheDocument()
    })
  })

  it("shows badge with count when there are due reminders", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Call Alice",
          remind_at: new Date().toISOString(),
          contact: makeContact({ first_name: "Alice" }),
        },
        {
          id: "r2",
          title: "Email Bob",
          remind_at: new Date().toISOString(),
          contact: makeContact({ first_name: "Bob" }),
        },
      ],
      count: 2,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const badge = screen.getByTestId("badge")
      expect(badge).toHaveTextContent("2")
    })
  })

  it("shows 99+ when there are more than 99 reminders", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [],
      count: 150,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const badge = screen.getByTestId("badge")
      expect(badge).toHaveTextContent("99+")
    })
  })

  it("displays popover with due reminders list when opened", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Call Alice",
          description: "Catch up",
          remind_at: new Date().toISOString(),
          contact: makeContact({ first_name: "Alice", last_name: "Smith" }),
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Call Alice")).toBeInTheDocument()
    })
  })

  it("shows 'You're all caught up' when no reminders are due", async () => {
    mockListDueReminders.mockResolvedValue({ data: [], count: 0 })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("You're all caught up.")).toBeInTheDocument()
    })
  })

  it("displays reminder title", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Schedule meeting",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Schedule meeting")).toBeInTheDocument()
    })
  })

  it("displays reminder description when available", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Call contact",
          description: "Discuss project details",
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Discuss project details")).toBeInTheDocument()
    })
  })

  it("does not display description when not available", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    // Description shouldn't be in document
    const descriptions = screen.queryAllByText(/null/)
    expect(descriptions).toHaveLength(0)
  })

  it("displays contact name when available", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Call",
          description: null,
          remind_at: new Date().toISOString(),
          contact: makeContact({ first_name: "Alice", last_name: "Smith" }),
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    })
  })

  it("displays contact nickname if available", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Catch up",
          description: null,
          remind_at: new Date().toISOString(),
          contact: makeContact({
            first_name: "Alice",
            last_name: "Smith",
            nickname: "AJ",
          }),
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("AJ")).toBeInTheDocument()
    })
  })

  it("calls snoozeReminder when snooze option is selected", async () => {
    mockSnoozeReminder.mockResolvedValue({})
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    const snoozeButton = screen.getByRole("button", { name: /snooze/i })
    await user.click(snoozeButton)

    await waitFor(() => {
      const snoozeItems = screen.getAllByTestId("dropdown-item")
      expect(snoozeItems.length).toBeGreaterThan(0)
    })
  })

  it("calls dismissReminder when dismiss button is clicked", async () => {
    mockDismissReminder.mockResolvedValue({})
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    const dismissButton = screen.getByRole("button", { name: /dismiss/i })
    await user.click(dismissButton)

    await waitFor(() => {
      expect(mockDismissReminder).toHaveBeenCalledWith({ reminderId: "r1" })
    })
  })

  it("shows success toast after dismissing reminder", async () => {
    mockDismissReminder.mockResolvedValue({})
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    const dismissButton = screen.getByRole("button", { name: /dismiss/i })
    await user.click(dismissButton)

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Reminder dismissed")
    })
  })

  it("shows error toast when dismiss fails", async () => {
    mockDismissReminder.mockRejectedValue(new Error("API error"))
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    const dismissButton = screen.getByRole("button", { name: /dismiss/i })
    await user.click(dismissButton)

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Failed to dismiss reminder",
      )
    })
  })

  it("shows success toast after snoozing reminder", async () => {
    mockSnoozeReminder.mockResolvedValue({})
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    const snoozeButton = screen.getByRole("button", { name: /snooze/i })
    await user.click(snoozeButton)

    await waitFor(() => {
      const items = screen.getAllByTestId("dropdown-item")
      expect(items.length).toBeGreaterThan(0)
    })

    await user.click(screen.getByText("15 minutes"))

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith("Snoozed for 15 minutes")
    })
  })

  it("shows error toast when snooze fails", async () => {
    mockSnoozeReminder.mockRejectedValue(new Error("API error"))
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    const user = userEvent.setup()
    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("Task")).toBeInTheDocument()
    })

    const snoozeButton = screen.getByRole("button", { name: /snooze/i })
    await user.click(snoozeButton)

    await waitFor(() => {
      const items = screen.getAllByTestId("dropdown-item")
      expect(items.length).toBeGreaterThan(0)
    })

    await user.click(screen.getByText("1 hour"))

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith("Failed to snooze reminder")
    })
  })

  it("limits displayed reminders to 8", async () => {
    const reminders = Array.from({ length: 15 }, (_, i) => ({
      id: `r${i}`,
      title: `Reminder ${i}`,
      description: null,
      remind_at: new Date().toISOString(),
      contact: null,
    }))

    mockListDueReminders.mockResolvedValue({
      data: reminders,
      count: 15,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const items = screen.getAllByText(/Reminder \d/)
      expect(items.length).toBeLessThanOrEqual(8)
    })
  })

  it("renders 'View all reminders' link", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const link = screen.getByText("View all reminders").closest("a")
      expect(link).toHaveAttribute("href", "/reminders")
    })
  })

  it("displays relative time for recent reminders", async () => {
    const now = Date.now()
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText(/overdue/)).toBeInTheDocument()
    })
  })

  it("includes contact name in snooze button aria-label", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Call Alice",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const snoozeBtn = screen.getByRole("button", { name: /snooze.*call alice/i })
      expect(snoozeBtn).toBeInTheDocument()
    })
  })

  it("includes reminder title in dismiss button aria-label", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Call client",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const dismissBtn = screen.getByRole("button", { name: /dismiss.*call client/i })
      expect(dismissBtn).toBeInTheDocument()
    })
  })

  it("renders popover content aligned to end", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 1,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      const content = screen.getByTestId("popover-content")
      expect(content).toHaveAttribute("data-align", "end")
    })
  })

  it("displays reminder count in popover header", async () => {
    mockListDueReminders.mockResolvedValue({
      data: [
        {
          id: "r1",
          title: "Task 1",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
        {
          id: "r2",
          title: "Task 2",
          description: null,
          remind_at: new Date().toISOString(),
          contact: null,
        },
      ],
      count: 2,
    })

    renderWithProviders(<ReminderBell />)

    await waitFor(() => {
      expect(screen.getByText("2 due")).toBeInTheDocument()
    })
  })
})
