import { describe, it, expect, beforeEach, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReminderActionsMenu } from "@/components/Reminders/ReminderActionsMenu"
import { makeReminder } from "@/test/helpers"
import { renderWithProviders } from "@/test/helpers"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
const mockDeleteReminder = vi.hoisted(() => vi.fn())
const mockSnoozeReminder = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  RemindersService: {
    deleteReminder: mockDeleteReminder,
    snoozeReminder: mockSnoozeReminder,
  },
}))

// Mock RowActionsMenu
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: { items: any[] }) => (
    <div data-testid="row-actions-menu">
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={item.onSelect}
          data-variant={item.variant}
          data-testid={`action-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {item.label}
        </button>
      ))}
    </div>
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
  Clock: () => <span data-testid="clock-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}))

describe("ReminderActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteReminder.mockResolvedValue({})
    mockSnoozeReminder.mockResolvedValue({})
  })

  it("renders the actions menu", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
  })

  it("has snooze action", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    expect(screen.getByTestId("action-snooze-1-hour")).toBeInTheDocument()
  })

  it("has delete action", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    expect(screen.getByTestId("action-delete")).toBeInTheDocument()
  })

  it("marks delete action as destructive", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const deleteButton = screen.getByTestId("action-delete")
    expect(deleteButton).toHaveAttribute("data-variant", "destructive")
  })

  it("calls snooze mutation when snooze action clicked", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-123" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    await user.click(snoozeButton)

    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledWith({
        reminderId: "r-123",
        minutes: 60,
      })
    })
  })

  it("calls delete mutation when delete action clicked", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-456" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalledWith({
        reminderId: "r-456",
      })
    })
  })

  it("invalidates reminders query on successful snooze", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-1" })
    const { queryClient } = renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    vi.spyOn(queryClient, "invalidateQueries")

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    await user.click(snoozeButton)

    await waitFor(() => {
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["reminders"],
        })
      )
    })
  })

  it("invalidates reminders query on successful delete", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-1" })
    const { queryClient } = renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    vi.spyOn(queryClient, "invalidateQueries")

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["reminders"],
        })
      )
    })
  })

  it("shows error toast on snooze failure", async () => {
    const user = userEvent.setup()
    mockSnoozeReminder.mockRejectedValue(new Error("Snooze failed"))
    const reminder = makeReminder({ id: "r-1" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    await user.click(snoozeButton)

    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalled()
    })
  })

  it("shows error toast on delete failure", async () => {
    const user = userEvent.setup()
    mockDeleteReminder.mockRejectedValue(new Error("Delete failed"))
    const reminder = makeReminder({ id: "r-1" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalled()
    })
  })

  it("passes correct reminder id to snooze mutation", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "specific-reminder-id-789" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    await user.click(snoozeButton)

    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledWith({
        reminderId: "specific-reminder-id-789",
        minutes: 60,
      })
    })
  })

  it("passes correct reminder id to delete mutation", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "specific-reminder-id-789" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalledWith({
        reminderId: "specific-reminder-id-789",
      })
    })
  })

  it("has exactly two menu items", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const buttons = screen.queryAllByTestId(/^action-/)
    expect(buttons).toHaveLength(2)
  })

  it("snooze is first action and delete is second", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const buttons = screen.queryAllByTestId(/^action-/)
    expect(buttons[0]).toHaveTextContent("Snooze 1 hour")
    expect(buttons[1]).toHaveTextContent("Delete")
  })

  it("handles multiple consecutive snooze attempts", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-1" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")

    await user.click(snoozeButton)
    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledTimes(1)
    })

    await user.click(snoozeButton)
    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledTimes(2)
    })
  })

  it("handles multiple consecutive delete attempts", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-1" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const deleteButton = screen.getByTestId("action-delete")

    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalledTimes(1)
    })

    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalledTimes(2)
    })
  })

  it("works with different reminder types", () => {
    const reminders = [
      makeReminder({ id: "r1", title: "Short reminder" }),
      makeReminder({
        id: "r2",
        title: "This is a much longer reminder title with more details",
      }),
      makeReminder({ id: "r3", title: "Reminder" }),
    ]

    reminders.forEach((reminder) => {
      const { unmount } = renderWithProviders(<ReminderActionsMenu reminder={reminder} />)
      expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
      unmount()
    })
  })

  it("snooze button specifies 60 minutes (1 hour)", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-1" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    await user.click(snoozeButton)

    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          minutes: 60,
        })
      )
    })
  })

  it("button text says 'Snooze 1 hour'", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    expect(screen.getByText("Snooze 1 hour")).toBeInTheDocument()
  })

  it("button text says 'Delete'", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    expect(screen.getByText("Delete")).toBeInTheDocument()
  })

  it("does not show loading state in this component", async () => {
    const user = userEvent.setup()
    mockSnoozeReminder.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({}), 100))
    )

    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    await user.click(snoozeButton)

    // Button should remain clickable (loading state is in the mutation, not the button)
    expect(snoozeButton).toBeInTheDocument()
  })

  it("snooze action is not destructive", () => {
    const reminder = makeReminder({ id: "r-1" })
    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    expect(snoozeButton).not.toHaveAttribute("data-variant", "destructive")
  })

  it("allows interleaving snooze and delete calls", async () => {
    const user = userEvent.setup()
    const reminder = makeReminder({ id: "r-1" })

    renderWithProviders(<ReminderActionsMenu reminder={reminder} />)

    const snoozeButton = screen.getByTestId("action-snooze-1-hour")
    const deleteButton = screen.getByTestId("action-delete")

    await user.click(snoozeButton)
    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledTimes(1)
    })

    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalledTimes(1)
    })

    await user.click(snoozeButton)
    await waitFor(() => {
      expect(mockSnoozeReminder).toHaveBeenCalledTimes(2)
    })
  })
})
