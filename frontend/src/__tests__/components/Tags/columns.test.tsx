import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { columns } from "@/components/Tags/columns"
import { makeTag } from "@/test/helpers"

// Mock TagActionsMenu
vi.mock("@/components/Tags/TagActionsMenu", () => ({
  TagActionsMenu: ({ tag }: any) => (
    <div data-testid={`actions-${tag.id}`}>Actions for {tag.id}</div>
  ),
}))

describe("Tags columns", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("defines three columns", () => {
    expect(columns).toHaveLength(3)
  })

  it("first column has accessorKey 'name'", () => {
    expect(columns[0].accessorKey).toBe("name")
  })

  it("first column header is 'Name'", () => {
    expect(columns[0].header).toBe("Name")
  })

  it("second column has accessorKey 'created_at'", () => {
    expect(columns[1].accessorKey).toBe("created_at")
  })

  it("second column header is 'Created'", () => {
    expect(columns[1].header).toBe("Created")
  })

  it("third column has id 'actions'", () => {
    expect(columns[2].id).toBe("actions")
  })

  it("renders name cell with tag color dot", () => {
    const tag = makeTag({
      id: "t1",
      name: "Friends",
      color: "#3b82f6",
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    expect(screen.getByText("Friends")).toBeInTheDocument()

    const colorDot = container.querySelector("div.size-3.rounded-full")
    expect(colorDot).toBeInTheDocument()
    expect(colorDot).toHaveStyle({ backgroundColor: "#3b82f6" })
  })

  it("renders color dot with correct size", () => {
    const tag = makeTag({
      id: "t1",
      name: "Work",
      color: "#ef4444",
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    const colorDot = container.querySelector("div.size-3.rounded-full")
    expect(colorDot).toHaveClass("size-3")
    expect(colorDot).toHaveClass("rounded-full")
  })

  it("renders without color dot when color is null", () => {
    const tag = makeTag({
      id: "t1",
      name: "Uncolored",
      color: null,
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    expect(screen.getByText("Uncolored")).toBeInTheDocument()
    const colorDots = container.querySelectorAll("div.size-3.rounded-full")
    expect(colorDots.length).toBe(0)
  })

  it("renders name with correct styling", () => {
    const tag = makeTag({
      id: "t1",
      name: "Important",
      color: "#fbbf24",
    })

    const { cell } = columns[0]
    render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    const nameSpan = screen.getByText("Important")
    expect(nameSpan).toHaveClass("font-medium")
  })

  it("renders created date in correct format", () => {
    const tag = makeTag({
      id: "t1",
      name: "Test",
      color: null,
    })

    // Override created_at with a specific date - use today's date
    const today = new Date()
    tag.created_at = today.toISOString()

    const { cell } = columns[1]
    render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    // Just verify that some date is rendered
    const dateElements = screen.getAllByText(/\d+\/\d+\/\d{4}|\d{4}-\d{2}-\d{2}/)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it("renders TagActionsMenu in actions cell", () => {
    const tag = makeTag({ id: "t789" })

    const { cell } = columns[2]
    render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("actions-t789")).toBeInTheDocument()
  })

  it("renders name cell with flex layout", () => {
    const tag = makeTag({
      id: "t1",
      name: "Category",
      color: "#10b981",
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    const flexContainer = container.querySelector(".flex")
    expect(flexContainer).toHaveClass("flex")
    expect(flexContainer).toHaveClass("items-center")
    expect(flexContainer).toHaveClass("gap-2")
  })

  it("renders with various tag names", () => {
    const tagNames = ["Friends", "Family", "Work", "Personal", "Urgent"]

    for (const name of tagNames) {
      const tag = makeTag({
        id: `t-${name}`,
        name,
        color: "#3b82f6",
      })

      const { cell } = columns[0]
      const { unmount } = render(
        <div>
          {cell!({
            row: { original: tag },
          } as any)}
        </div>
      )

      expect(screen.getByText(name)).toBeInTheDocument()
      unmount()
    }
  })

  it("renders with various colors", () => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"]

    for (const color of colors) {
      const tag = makeTag({
        id: `t-${color}`,
        name: "Tag",
        color,
      })

      const { cell } = columns[0]
      const { container, unmount } = render(
        <div>
          {cell!({
            row: { original: tag },
          } as any)}
        </div>
      )

      const colorDot = container.querySelector("div.size-3.rounded-full")
      expect(colorDot).toHaveStyle({ backgroundColor: color })
      unmount()
    }
  })

  it("renders date for different years", () => {
    const dates = [
      "2024-01-01T00:00:00Z",
      "2023-12-31T00:00:00Z",
      "2025-06-15T00:00:00Z",
    ]

    for (const date of dates) {
      const tag = makeTag({
        id: `t-${date}`,
        name: "Tag",
      })
      tag.created_at = date

      const { cell } = columns[1]
      const { unmount } = render(
        <div>
          {cell!({
            row: { original: tag },
          } as any)}
        </div>
      )

      expect(screen.getByText(/\d+\/\d+\/\d{4}|\d{4}-\d{2}-\d{2}/)).toBeInTheDocument()
      unmount()
    }
  })

  it("handles tag name with special characters", () => {
    const tag = makeTag({
      id: "t1",
      name: "Project #123 & Tasks",
      color: "#3b82f6",
    })

    const { cell } = columns[0]
    render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    expect(screen.getByText("Project #123 & Tasks")).toBeInTheDocument()
  })

  it("handles very long tag names", () => {
    const longName = "A".repeat(100)
    const tag = makeTag({
      id: "t1",
      name: longName,
      color: "#3b82f6",
    })

    const { cell } = columns[0]
    render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    expect(screen.getByText(longName)).toBeInTheDocument()
  })

  it("color dot doesn't render for undefined color", () => {
    const tag = makeTag({
      id: "t1",
      name: "NoColor",
      color: undefined as any,
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: tag },
        } as any)}
      </div>
    )

    const colorDots = container.querySelectorAll("div.size-3.rounded-full")
    expect(colorDots.length).toBe(0)
  })
})
