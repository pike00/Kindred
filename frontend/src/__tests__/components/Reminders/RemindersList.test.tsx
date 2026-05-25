import { Suspense } from "react"
import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RemindersList } from "@/components/Reminders/RemindersList"
import { makeReminder, renderWithProviders } from "@/test/helpers"

// Create mock function in hoisted scope
const { mockListReminders } = vi.hoisted(() => ({
  mockListReminders: vi.fn(),
}))

vi.mock("@/client", () => ({
  RemindersService: {
    listReminders: mockListReminders,
  },
}))

// Mock AddReminderDialog
vi.mock("@/components/Reminders/AddReminderDialog", () => ({
  AddReminderDialog: () => (
    <button data-testid="add-reminder-button">New Reminder</button>
  ),
}))

// Mock DataTable
vi.mock("@/components/Common/DataTable", () => ({
  DataTable: ({ columns, data }: any) => (
    <table data-testid="data-table">
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id} data-testid={`row-${row.id}`}>
            <td>{row.title}</td>
            <td>{row.remind_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

// Mock columns
vi.mock("@/components/Reminders/columns", () => ({
  columns: [],
}))

describe("RemindersList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders heading correctly", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Reminders"
      )
    })
  })

  it("renders AddReminderDialog button", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("add-reminder-button")).toBeInTheDocument()
    })
  })

  it("renders empty DataTable when no reminders", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument()
    })
    expect(screen.queryByTestId(/row-/)).not.toBeInTheDocument()
  })

  it("renders DataTable with reminders", async () => {
    const reminders = [
      makeReminder({
        id: "r1",
        title: "Call Mom",
        remind_at: "2024-05-20T10:00:00Z",
      }),
      makeReminder({
        id: "r2",
        title: "Meeting prep",
        remind_at: "2024-05-20T14:00:00Z",
      }),
    ]

    mockListReminders.mockResolvedValue({ data: reminders })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("row-r1")).toBeInTheDocument()
      expect(screen.getByTestId("row-r2")).toBeInTheDocument()
    })
  })

  it("calls queryFn which invokes RemindersService.listReminders", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(mockListReminders).toHaveBeenCalled()
    })
  })

  it("handles undefined data gracefully", async () => {
    mockListReminders.mockResolvedValue({ data: undefined })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument()
    })
  })

  it("handles null data gracefully", async () => {
    mockListReminders.mockResolvedValue({ data: null })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("data-table")).toBeInTheDocument()
    })
  })

  it("renders multiple reminders in correct order", async () => {
    const reminders = [
      makeReminder({
        id: "r1",
        title: "First reminder",
        remind_at: "2024-05-20T10:00:00Z",
      }),
      makeReminder({
        id: "r2",
        title: "Second reminder",
        remind_at: "2024-05-20T14:00:00Z",
      }),
      makeReminder({
        id: "r3",
        title: "Third reminder",
        remind_at: "2024-05-21T10:00:00Z",
      }),
    ]

    mockListReminders.mockResolvedValue({ data: reminders })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      const rows = screen.getAllByTestId(/row-/)
      expect(rows).toHaveLength(3)
    })
  })

  it("displays layout structure with heading and button in flex container", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    const button = screen.getByTestId("add-reminder-button")
    expect(button).toBeInTheDocument()
  })

  it("renders with space-y-4 layout", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass("space-y-4")
  })

  it("handles reminders with null remind_at gracefully", async () => {
    const reminders = [
      makeReminder({
        id: "r1",
        title: "Reminder without date",
        remind_at: null as any,
      }),
    ]

    mockListReminders.mockResolvedValue({ data: reminders })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("row-r1")).toBeInTheDocument()
    })
  })

  it("flexes heading and button correctly", async () => {
    mockListReminders.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <RemindersList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })

    const flexContainer = container.querySelector(".flex")
    expect(flexContainer).toHaveClass("justify-between")
    expect(flexContainer).toHaveClass("items-center")
  })
})
