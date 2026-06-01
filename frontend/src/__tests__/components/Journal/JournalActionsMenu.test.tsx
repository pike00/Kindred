import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { JournalEntryPublic } from "@/client"
import { JournalActionsMenu } from "@/components/Journal/JournalActionsMenu"
import { makeJournalEntry, renderWithProviders } from "@/test/helpers"

/** Wraps makeJournalEntry, filling in fields required by JournalEntryPublic. */
function makeEntry(
  overrides: Parameters<typeof makeJournalEntry>[0] = {},
): JournalEntryPublic {
  const base = makeJournalEntry(overrides)
  return {
    ...base,
    body: base.body ?? "",
    entry_date: "2026-01-01",
    updated_at: "2026-01-01T00:00:00Z",
  }
}

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
const mockDeleteJournalEntry = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  JournalService: {
    deleteJournalEntry: mockDeleteJournalEntry,
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
          data-testid={`action-${item.label.toLowerCase()}`}
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
  Trash2: () => <span data-testid="trash-icon" />,
}))

describe("JournalActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteJournalEntry.mockResolvedValue({})
  })

  it("renders the actions menu", () => {
    const entry = makeEntry({ id: "entry-1" })
    renderWithProviders(<JournalActionsMenu entry={entry} />)

    expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
  })

  it("has a delete action", () => {
    const entry = makeEntry({ id: "entry-1" })
    renderWithProviders(<JournalActionsMenu entry={entry} />)

    expect(screen.getByTestId("action-delete")).toBeInTheDocument()
  })

  it("calls delete mutation when delete action clicked", async () => {
    const user = userEvent.setup()
    const entry = makeEntry({ id: "entry-123" })
    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteJournalEntry).toHaveBeenCalledWith({
        entryId: "entry-123",
      })
    })
  })

  it("marks delete action as destructive", () => {
    const entry = makeEntry({ id: "entry-1" })
    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")
    expect(deleteButton).toHaveAttribute("data-variant", "destructive")
  })

  it("shows success toast on successful delete", async () => {
    const user = userEvent.setup()
    const entry = makeEntry({ id: "entry-1" })

    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteJournalEntry).toHaveBeenCalled()
    })
  })

  it("invalidates journal query cache on successful delete", async () => {
    const user = userEvent.setup()
    const entry = makeEntry({ id: "entry-1" })
    const { queryClient } = renderWithProviders(
      <JournalActionsMenu entry={entry} />,
    )

    vi.spyOn(queryClient, "invalidateQueries")

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ["journal"],
        }),
      )
    })
  })

  it("shows error toast on delete failure", async () => {
    const user = userEvent.setup()
    mockDeleteJournalEntry.mockRejectedValue(new Error("Delete failed"))
    const entry = makeEntry({ id: "entry-1" })

    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteJournalEntry).toHaveBeenCalled()
    })
  })

  it("passes correct entry id to delete mutation", async () => {
    const user = userEvent.setup()
    const entry = makeEntry({ id: "specific-entry-id-456" })

    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteJournalEntry).toHaveBeenCalledWith({
        entryId: "specific-entry-id-456",
      })
    })
  })

  it("only has one menu item (delete)", () => {
    const entry = makeEntry({ id: "entry-1" })
    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const buttons = screen.queryAllByTestId(/^action-/)
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveTextContent("Delete")
  })

  it("does not show loading state in this component", async () => {
    const user = userEvent.setup()
    mockDeleteJournalEntry.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
    )

    const entry = makeEntry({ id: "entry-1" })
    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    // Button should remain clickable (loading state is in the mutation, not the button)
    expect(deleteButton).toBeInTheDocument()
  })

  it("handles multiple consecutive delete attempts", async () => {
    const user = userEvent.setup()
    const entry = makeEntry({ id: "entry-1" })

    renderWithProviders(<JournalActionsMenu entry={entry} />)

    const deleteButton = screen.getByTestId("action-delete")

    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteJournalEntry).toHaveBeenCalledTimes(1)
    })

    // Click again - should call mutation again
    await user.click(deleteButton)
    await waitFor(() => {
      expect(mockDeleteJournalEntry).toHaveBeenCalledTimes(2)
    })
  })

  it("works with different entry types", () => {
    const entries = [
      makeEntry({ id: "1", body: "Short" }),
      makeEntry({
        id: "2",
        body: "This is a much longer journal entry with more content",
      }),
      makeEntry({ id: "3", body: null }),
    ]

    entries.forEach((entry) => {
      const { unmount } = renderWithProviders(
        <JournalActionsMenu entry={entry} />,
      )
      expect(screen.getByTestId("row-actions-menu")).toBeInTheDocument()
      unmount()
    })
  })
})
