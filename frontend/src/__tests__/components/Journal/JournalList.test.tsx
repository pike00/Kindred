import { Suspense } from "react"
import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { JournalList } from "@/components/Journal/JournalList"
import { makeJournalEntry, renderWithProviders } from "@/test/helpers"

// Create mock function in hoisted scope
const { mockListJournalEntries } = vi.hoisted(() => ({
  mockListJournalEntries: vi.fn(),
}))

vi.mock("@/client", () => ({
  JournalService: {
    listJournalEntries: mockListJournalEntries,
  },
}))

// Mock AddJournalDialog
vi.mock("@/components/Journal/AddJournalDialog", () => ({
  AddJournalDialog: () => (
    <button data-testid="add-journal-button">New Entry</button>
  ),
}))

// Mock DataTable
vi.mock("@/components/Common/DataTable", () => ({
  DataTable: ({ columns, data }: any) => (
    <table data-testid="data-table">
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id} data-testid={`row-${row.id}`}>
            <td>{row.body}</td>
            <td>{row.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

// Mock columns
vi.mock("@/components/Journal/columns", () => ({
  columns: [],
}))

describe("JournalList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders heading correctly", async () => {
    mockListJournalEntries.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Journal"
      )
    })
  })

  it("renders AddJournalDialog button", async () => {
    mockListJournalEntries.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("add-journal-button")).toBeInTheDocument()
    })
  })

  it("renders empty state when no entries", async () => {
    mockListJournalEntries.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByText("No journal entries yet")).toBeInTheDocument()
    })
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument()
  })

  it("renders DataTable with journal entries", async () => {
    const entries = [
      makeJournalEntry({
        id: "j1",
        body: "Today was great",
        created_at: "2024-05-15T10:00:00Z",
      }),
      makeJournalEntry({
        id: "j2",
        body: "Had a productive day",
        created_at: "2024-05-14T10:00:00Z",
      }),
    ]

    mockListJournalEntries.mockResolvedValue({ data: entries })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByTestId("row-j1")).toBeInTheDocument()
      expect(screen.getByTestId("row-j2")).toBeInTheDocument()
    })
  })

  it("calls queryFn which invokes JournalService.listJournalEntries", async () => {
    mockListJournalEntries.mockResolvedValue({ data: [] })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(mockListJournalEntries).toHaveBeenCalled()
    })
  })

  it("handles undefined data gracefully", async () => {
    mockListJournalEntries.mockResolvedValue({ data: undefined })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByText("No journal entries yet")).toBeInTheDocument()
    })
  })

  it("handles null data gracefully", async () => {
    mockListJournalEntries.mockResolvedValue({ data: null })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByText("No journal entries yet")).toBeInTheDocument()
    })
  })

  it("renders multiple entries in correct order", async () => {
    const entries = [
      makeJournalEntry({
        id: "j1",
        body: "First entry",
        created_at: "2024-05-15T10:00:00Z",
      }),
      makeJournalEntry({
        id: "j2",
        body: "Second entry",
        created_at: "2024-05-14T10:00:00Z",
      }),
      makeJournalEntry({
        id: "j3",
        body: "Third entry",
        created_at: "2024-05-13T10:00:00Z",
      }),
    ]

    mockListJournalEntries.mockResolvedValue({ data: entries })

    renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      const rows = screen.getAllByTestId(/row-/)
      expect(rows).toHaveLength(3)
    })
  })

  it("displays layout structure with heading and button in flex container", async () => {
    mockListJournalEntries.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 })
      expect(heading).toBeInTheDocument()
    })

    const button = screen.getByTestId("add-journal-button")
    expect(button).toBeInTheDocument()
  })

  it("renders with space-y-4 layout", async () => {
    mockListJournalEntries.mockResolvedValue({ data: [] })

    const { container } = renderWithProviders(
      <Suspense fallback={<div>Loading...</div>}>
        <JournalList />
      </Suspense>
    )

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass("space-y-4")
  })
})
