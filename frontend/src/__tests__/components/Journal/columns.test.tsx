import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { columns } from "@/components/Journal/columns"
import { makeJournalEntry } from "@/test/helpers"

// Mock MentionText
vi.mock("@/components/Mentions/MentionText", () => ({
  MentionText: ({ text, className }: any) => (
    <div className={className} data-testid="mention-text">
      {text}
    </div>
  ),
}))

// Mock icons
vi.mock("@/lib/icons", () => ({
  NotebookPen: ({ className }: any) => (
    <div className={className} data-testid="notebook-icon" />
  ),
}))

// Mock JournalActionsMenu
vi.mock("@/components/Journal/JournalActionsMenu", () => ({
  JournalActionsMenu: ({ entry }: any) => (
    <div data-testid={`actions-${entry.id}`}>Actions for {entry.id}</div>
  ),
}))

describe("Journal columns", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("defines three columns", () => {
    expect(columns).toHaveLength(3)
  })

  it("first column has accessorKey 'body'", () => {
    expect(columns[0].accessorKey).toBe("body")
  })

  it("first column header is 'Entry'", () => {
    expect(columns[0].header).toBe("Entry")
  })

  it("second column has accessorKey 'created_at'", () => {
    expect(columns[1].accessorKey).toBe("created_at")
  })

  it("second column header is 'Date'", () => {
    expect(columns[1].header).toBe("Date")
  })

  it("third column has id 'actions'", () => {
    expect(columns[2].id).toBe("actions")
  })

  it("renders entry body cell with MentionText", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "Test journal entry",
      mood: null,
    })

    const { cell } = columns[0]
    const rendered = render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("mention-text")).toHaveTextContent(
      "Test journal entry"
    )
  })

  it("renders notebook icon in body cell", () => {
    const entry = makeJournalEntry()

    const { cell } = columns[0]
    render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("notebook-icon")).toBeInTheDocument()
  })

  it("renders mood when present in body cell", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "Great day",
      mood: "Happy",
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    expect(screen.getByText("Mood: Happy")).toBeInTheDocument()
  })

  it("does not render mood section when mood is null", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "Regular day",
      mood: null,
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    expect(screen.queryByText(/Mood:/)).not.toBeInTheDocument()
  })

  it("formats date in date cell", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "Test",
      created_at: "2024-05-15T10:30:00Z",
    })

    const { cell } = columns[1]
    render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    const dateText = screen.getByText(/5\/15\/2024|15\/5\/2024|2024-05-15/)
    expect(dateText).toBeInTheDocument()
  })

  it("renders JournalActionsMenu in actions cell", () => {
    const entry = makeJournalEntry({ id: "j123" })

    const { cell } = columns[2]
    render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("actions-j123")).toBeInTheDocument()
  })

  it("displays correct mood text with various moods", () => {
    const moods = ["Happy", "Sad", "Neutral", "Excited"]

    for (const mood of moods) {
      const entry = makeJournalEntry({
        id: `j-${mood}`,
        body: "Test",
        mood,
      })

      const { cell } = columns[0]
      const { unmount } = render(
        <div>
          {cell!({
            row: { original: entry },
          } as any)}
        </div>
      )

      expect(screen.getByText(`Mood: ${mood}`)).toBeInTheDocument()
      unmount()
    }
  })

  it("body cell has correct CSS classes", () => {
    const entry = makeJournalEntry()

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    const mentionText = screen.getByTestId("mention-text")
    expect(mentionText).toHaveClass("text-sm")
    expect(mentionText).toHaveClass("text-muted-foreground")
    expect(mentionText).toHaveClass("line-clamp-2")
  })

  it("renders date for different timezones consistently", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "Test",
      created_at: "2024-12-31T23:59:59Z",
    })

    const { cell } = columns[1]
    render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    const dateElement = screen.getByText(/12\/31\/2024|31\/12\/2024/)
    expect(dateElement).toBeInTheDocument()
  })

  it("renders entry with empty body string", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "",
      mood: null,
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    expect(screen.getByTestId("mention-text")).toBeInTheDocument()
  })

  it("mood section has correct styling", () => {
    const entry = makeJournalEntry({
      id: "j1",
      body: "Test",
      mood: "Reflective",
    })

    const { cell } = columns[0]
    const { container } = render(
      <div>
        {cell!({
          row: { original: entry },
        } as any)}
      </div>
    )

    // Find the mood text
    expect(screen.getByText("Mood: Reflective")).toBeInTheDocument()

    // Find the parent div by checking for all divs with text-xs class
    const styledDivs = container.querySelectorAll("div.text-xs")
    const moodDiv = Array.from(styledDivs).find((div) =>
      div.textContent?.includes("Mood: Reflective")
    )

    expect(moodDiv).toHaveClass("text-muted-foreground")
    expect(moodDiv).toHaveClass("mt-1")
  })
})
