import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { columns } from "@/components/Reminders/columns"
import { makeReminder } from "@/test/helpers"
import type { ReactNode } from "react"

type CellFn = (props: any) => ReactNode

// Mock icons
vi.mock("@/lib/icons", () => ({
  Bell: ({ className }: any) => (
    <div className={className} data-testid="bell-icon" />
  ),
  Clock: ({ className }: any) => (
    <div className={className} data-testid="clock-icon" />
  ),
}))

// Mock ReminderActionsMenu
vi.mock("@/components/Reminders/ReminderActionsMenu", () => ({
  ReminderActionsMenu: ({ reminder }: any) => (
    <div data-testid={`actions-${reminder.id}`}>Actions for {reminder.id}</div>
  ),
}))

describe("Reminders columns", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("defines three columns", () => {
    expect(columns).toHaveLength(3)
  })

  it("first column has accessorKey 'title'", () => {
    expect((columns[0] as { accessorKey?: string }).accessorKey).toBe("title")
  })

  it("first column header is 'Reminder'", () => {
    expect(columns[0].header).toBe("Reminder")
  })

  it("second column has accessorKey 'remind_at'", () => {
    expect((columns[1] as { accessorKey?: string }).accessorKey).toBe("remind_at")
  })

  it("second column header is 'Scheduled'", () => {
    expect(columns[1].header).toBe("Scheduled")
  })

  it("third column has id 'actions'", () => {
    expect(columns[2].id).toBe("actions")
  })

  it("renders title cell with Bell icon", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Call John",
    })

    const { cell } = columns[0]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("bell-icon")).toBeInTheDocument()
    expect(screen.getByText("Call John")).toBeInTheDocument()
  })

  it("renders title cell with correct styling", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Task reminder",
    })

    const { cell } = columns[0]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    const titleSpan = screen.getByText("Task reminder")
    expect(titleSpan).toHaveClass("font-medium")
  })

  it("renders scheduled cell with date and time when remind_at is present", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Test",
      remind_at: "2024-05-20T14:30:00Z",
    })

    const { cell } = columns[1]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("clock-icon")).toBeInTheDocument()
    expect(screen.getByText(/5\/20\/2024|20\/5\/2024|2024-05-20/)).toBeInTheDocument()
    // Time format depends on locale, just check that time is present
    const timeElements = screen.getAllByText(/\d+:\d+/)
    expect(timeElements.length).toBeGreaterThan(0)
  })

  it("renders dash when remind_at is null", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Test",
      remind_at: null as any,
    })

    const { cell } = columns[1]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("formats time when remind_at is provided", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Test",
      remind_at: "2024-05-20T09:05:00Z",
    })

    const { cell } = columns[1]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    // Just verify time is present in HH:MM format
    const timeElements = screen.getAllByText(/\d+:\d+/)
    expect(timeElements.length).toBeGreaterThan(0)
  })

  it("renders ReminderActionsMenu in actions cell", () => {
    const reminder = makeReminder({ id: "r456" })

    const { cell } = columns[2]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("actions-r456")).toBeInTheDocument()
  })

  it("scheduled cell has correct styling", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Test",
      remind_at: "2024-05-20T14:30:00Z",
    })

    const { cell } = columns[1]
    const { container } = render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    const schedDiv = container.querySelector(".flex")
    expect(schedDiv).toHaveClass("flex")
    expect(schedDiv).toHaveClass("items-center")
    expect(schedDiv).toHaveClass("gap-1")
    expect(schedDiv).toHaveClass("text-sm")
  })

  it("renders with various reminder titles", () => {
    const titles = ["Call Mom", "Dentist appointment", "Project deadline", "Review PRs"]

    for (const title of titles) {
      const reminder = makeReminder({
        id: `r-${title}`,
        title,
      })

      const { cell } = columns[0]
      const { unmount } = render(
        <div>
          {(cell as CellFn)({
            row: { original: reminder },
          } as any)}
        </div>
      )

      expect(screen.getByText(title)).toBeInTheDocument()
      unmount()
    }
  })

  it("renders date and time for future reminders", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    const reminder = makeReminder({
      id: "r1",
      title: "Future reminder",
      remind_at: futureDate.toISOString(),
    })

    const { cell } = columns[1]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("clock-icon")).toBeInTheDocument()
  })

  it("bell icon has correct styling", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Test",
    })

    const { cell } = columns[0]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    const bellIcon = screen.getByTestId("bell-icon")
    expect(bellIcon).toHaveClass("h-4")
    expect(bellIcon).toHaveClass("w-4")
    expect(bellIcon).toHaveClass("text-muted-foreground")
  })

  it("clock icon has correct styling", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "Test",
      remind_at: "2024-05-20T14:30:00Z",
    })

    const { cell } = columns[1]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    const clockIcon = screen.getByTestId("clock-icon")
    expect(clockIcon).toHaveClass("h-3")
    expect(clockIcon).toHaveClass("w-3")
  })

  it("handles reminders with empty title string", () => {
    const reminder = makeReminder({
      id: "r1",
      title: "",
    })

    const { cell } = columns[0]
    render(
      <div>
        {(cell as CellFn)({
          row: { original: reminder },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("bell-icon")).toBeInTheDocument()
  })
})
