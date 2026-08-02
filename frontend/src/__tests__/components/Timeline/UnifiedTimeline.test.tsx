import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "@/test/helpers"
import { UnifiedTimeline } from "@/components/Timeline/UnifiedTimeline"

// Mock API client services
const mockListInteractions = vi.hoisted(() => vi.fn())
const mockListNotes = vi.hoisted(() => vi.fn())
const mockCreateNote = vi.hoisted(() => vi.fn())
const mockUpdateNote = vi.hoisted(() => vi.fn())
const mockListGifts = vi.hoisted(() => vi.fn())
const mockListLifeEvents = vi.hoisted(() => vi.fn())
const mockCreateLifeEvent = vi.hoisted(() => vi.fn())
const mockUpdateLifeEvent = vi.hoisted(() => vi.fn())
const mockListDebts = vi.hoisted(() => vi.fn())

vi.mock("@/client", () => ({
  InteractionsService: {
    listInteractions: mockListInteractions,
  },
  NotesService: {
    listNotes: mockListNotes,
    createNoteRoute: mockCreateNote,
    updateNoteRoute: mockUpdateNote,
  },
  GiftsService: {
    listGifts: mockListGifts,
  },
  LifeEventsService: {
    listLifeEvents: mockListLifeEvents,
    createLifeEventRoute: mockCreateLifeEvent,
    updateLifeEvent: mockUpdateLifeEvent,
  },
  DebtsService: {
    listDebts: mockListDebts,
  },
}))

// Mock MentionText to render simply
vi.mock("@/components/Mentions/MentionText", () => ({
  MentionText: ({ text, className }: any) => (
    <span className={className} data-testid="mention-text">
      {text}
    </span>
  ),
}))

// Mock react-router Link
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

// Mock icon import
vi.mock("@/lib/icons", () => ({
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  MessagesSquare: () => <span data-testid="icon-messages">Messages</span>,
  NotebookPen: () => <span data-testid="icon-notebook">Notebook</span>,
  HeartHandshake: () => <span data-testid="icon-gift">Gift</span>,
  CalendarHeart: () => <span data-testid="icon-calendar">Calendar</span>,
  Pencil: () => <span data-testid="icon-pencil">Pencil</span>,
  RefreshCw: () => <span data-testid="icon-refresh">Refresh</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  WifiOff: () => <span data-testid="icon-offline">Offline</span>,
  X: () => <span data-testid="icon-x">X</span>,
}))

describe("UnifiedTimeline", () => {
  const mockInteractionData = {
    data: [
      {
        id: "ix1",
        contact_id: "c1",
        occurred_at: "2024-01-15T14:30:00Z",
        channel: "call",
        notes: "Good call",
        attendees: [
          { id: "c1", first_name: "Alice", last_name: "Smith" },
          { id: "other1", first_name: "Bob", last_name: "Jones" },
        ],
        duration_minutes: 30,
      },
    ],
  }

  const mockNoteData = {
    data: [
      {
        id: "n1",
        contact_id: "c1",
        body: "Quick note about Alice",
        created_at: "2024-01-10T10:00:00Z",
        updated_at: "2024-01-10T10:00:00Z",
      },
    ],
  }

  const mockGiftData = {
    data: [
      {
        id: "g1",
        contact_id: "c1",
        name: "Book",
        gift_date: "2024-01-12T00:00:00Z",
        created_at: "2024-01-12T09:00:00Z",
        status: "given",
        occasion: "Birthday",
        value_amount: 25.99,
        description: "A good book",
      },
    ],
  }

  const mockLifeEventData = {
    data: [
      {
        id: "le1",
        contact_id: "c1",
        title: "Got promoted",
        occurred_at: "2024-01-08",
        event_type: "career",
        description: "New job title",
      },
    ],
  }

  const mockDebtData = {
    data: [
      {
        id: "d1",
        contact_id: "c1",
        amount: 50,
        direction: "they_owe",
        created_at: "2024-01-05T00:00:00Z",
        settled_at: null,
        reason: "Lunch payment",
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockListInteractions.mockResolvedValue({ data: [] })
    mockListNotes.mockResolvedValue({ data: [] })
    mockListGifts.mockResolvedValue({ data: [] })
    mockListLifeEvents.mockResolvedValue({ data: [] })
    mockListDebts.mockResolvedValue({ data: [] })
    mockCreateNote.mockResolvedValue({ id: "n2" })
    mockUpdateNote.mockResolvedValue({ id: "n1" })
    mockCreateLifeEvent.mockResolvedValue({ id: "le2" })
    mockUpdateLifeEvent.mockResolvedValue({ id: "le1" })
  })

  it("renders timeline card with title", () => {
    renderWithProviders(<UnifiedTimeline contactId="c1" />)
    expect(screen.getByText("Timeline")).toBeInTheDocument()
  })

  it("shows loading skeleton while queries are pending", async () => {
    // Make one query never resolve
    mockListInteractions.mockReturnValueOnce(
      new Promise(() => {}), // never resolves
    )
    mockListNotes.mockResolvedValueOnce({ data: [] })
    mockListGifts.mockResolvedValueOnce({ data: [] })
    mockListLifeEvents.mockResolvedValueOnce({ data: [] })
    mockListDebts.mockResolvedValueOnce({ data: [] })

    const { container } = renderWithProviders(<UnifiedTimeline contactId="c1" />)

    // Look for skeleton elements in the DOM by data-slot
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders empty state when all queries return empty", async () => {
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(
        screen.getByText(
          /Nothing here yet. Log an interaction, capture a note, or add a life event/i,
        ),
      ).toBeInTheDocument()
    })
  })

  it("renders filter toggle buttons for all event types", async () => {
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Interactions/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Notes/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Gifts/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Life events/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Debts/i })).toBeInTheDocument()
    })
  })

  it("shows event count in filter buttons when events exist", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      const interactionBtn = screen.getByRole("button", { name: /Interactions/i })
      expect(interactionBtn).toHaveTextContent("1")
    })
  })

  it("disables filter buttons with zero count", async () => {
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      const interactionBtn = screen.getByRole("button", { name: /Interactions/i })
      expect(interactionBtn).toBeDisabled()
    })
  })

  it("renders timeline events for interactions", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
      expect(screen.getByText("Good call")).toBeInTheDocument()
      expect(screen.getByText(/Bob Jones/)).toBeInTheDocument()
    })
  })

  it("renders timeline events for notes", async () => {
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Note")).toBeInTheDocument()
      expect(screen.getByText("Quick note about Alice")).toBeInTheDocument()
    })
  })

  it("adds a note from the timeline", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    const textarea = screen.getByPlaceholderText(/Jot a quick note/i)
    await user.type(textarea, "A new timeline note")
    await user.click(screen.getByRole("button", { name: "Save note" }))

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith({
        requestBody: { contact_id: "c1", body: "A new timeline note" },
      })
    })
  })

  it("adds a life event from the timeline with a custom date", async () => {
    const user = userEvent.setup()
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await user.click(screen.getByRole("button", { name: /Add life event/ }))
    const dialog = await screen.findByRole("dialog")

    await user.type(
      within(dialog).getByLabelText(/^Title/),
      "Moved to Chicago",
    )
    fireEvent.change(within(dialog).getByLabelText(/^Date/), {
      target: { value: "2012-04-03" },
    })
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockCreateLifeEvent).toHaveBeenCalledWith({
        requestBody: {
          contact_id: "c1",
          event_type: "anniversary",
          title: "Moved to Chicago",
          occurred_at: "2012-04-03",
          description: null,
          create_annual_reminder: false,
        },
      })
    })
  })

  it("edits a timeline note in place", async () => {
    const user = userEvent.setup()
    mockListNotes.mockResolvedValueOnce(mockNoteData)
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await screen.findByText("Quick note about Alice")
    await user.click(screen.getByRole("button", { name: "Edit note" }))

    const textarea = screen.getByRole("textbox", { name: "Edit note" })
    await user.clear(textarea)
    await user.type(textarea, "Updated timeline note")
    await user.click(screen.getByRole("button", { name: /Save$/ }))

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith({
        noteId: "n1",
        requestBody: { body: "Updated timeline note" },
      })
    })
  })

  it("renders timeline events for gifts", async () => {
    mockListGifts.mockResolvedValueOnce(mockGiftData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/Gift: Book/)).toBeInTheDocument()
      expect(screen.getByText("Birthday")).toBeInTheDocument()
      expect(screen.getByText("$25.99")).toBeInTheDocument()
    })
  })

  it("renders timeline events for life events", async () => {
    mockListLifeEvents.mockResolvedValueOnce(mockLifeEventData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Got promoted")).toBeInTheDocument()
      expect(screen.getByText("career")).toBeInTheDocument()
    })
  })

  it("edits the date of a prior life event from the timeline", async () => {
    const user = userEvent.setup()
    mockListLifeEvents.mockResolvedValueOnce(mockLifeEventData)
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await screen.findByText("Got promoted")
    await user.click(
      screen.getByRole("button", { name: "Edit Got promoted" }),
    )

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(/^Date/)).toHaveValue("2024-01-08")
    fireEvent.change(within(dialog).getByLabelText(/^Date/), {
      target: { value: "2001-02-03" },
    })
    await user.click(within(dialog).getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockUpdateLifeEvent).toHaveBeenCalledWith({
        eventId: "le1",
        requestBody: expect.objectContaining({ occurred_at: "2001-02-03" }),
      })
    })
  })

  it("renders timeline events for debts", async () => {
    mockListDebts.mockResolvedValueOnce(mockDebtData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/They owe \$50/)).toBeInTheDocument()
      expect(screen.getByText("Open")).toBeInTheDocument()
    })
  })

  it("shows reverse chronological order", async () => {
    mockListInteractions.mockResolvedValueOnce({
      data: [
        {
          ...mockInteractionData.data[0],
          id: "ix1",
          occurred_at: "2024-01-15T14:30:00Z",
        },
        {
          ...mockInteractionData.data[0],
          id: "ix2",
          occurred_at: "2024-01-20T10:00:00Z",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      const listItems = screen.getAllByRole("listitem")
      expect(listItems.length).toBe(2)
      // The later date should appear first (reversed)
      const firstItem = listItems[0]
      const secondItem = listItems[1]
      expect(firstItem).toBeInTheDocument()
      expect(secondItem).toBeInTheDocument()
    })
  })

  it("toggling a filter button hides events of that type", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    const user = userEvent.setup()
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
      expect(screen.getByText("Note")).toBeInTheDocument()
    })

    // Toggle off interactions
    const interactionBtn = screen.getByRole("button", { name: /Interactions/i })
    await user.click(interactionBtn)

    await waitFor(() => {
      // Interaction should be hidden
      expect(screen.queryByText("Call")).not.toBeInTheDocument()
      // Note should still be visible
      expect(screen.getByText("Note")).toBeInTheDocument()
    })
  })

  it("toggling a filter button shows events again when re-enabled", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)

    const user = userEvent.setup()
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
    })

    const interactionBtn = screen.getByRole("button", { name: /Interactions/i })

    // Toggle off
    await user.click(interactionBtn)
    await waitFor(() => {
      expect(screen.queryByText("Call")).not.toBeInTheDocument()
    })

    // Toggle on again
    await user.click(interactionBtn)
    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
    })
  })

  it("shows filtered message when all event types are toggled off", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)

    const user = userEvent.setup()
    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
    })

    // Toggle off all filter buttons
    const interactionBtn = screen.getByRole("button", { name: /Interactions/i })
    await user.click(interactionBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/All event types are filtered out/),
      ).toBeInTheDocument()
    })
  })

  it("shows event count in title when events exist", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)
    mockListNotes.mockResolvedValueOnce(mockNoteData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument()
    })
  })

  it("interaction shows attendees (excluding contact)", async () => {
    mockListInteractions.mockResolvedValueOnce({
      data: [
        {
          ...mockInteractionData.data[0],
          attendees: [
            { id: "c1", first_name: "Alice", last_name: "Smith" },
            { id: "a1", first_name: "Bob", last_name: "Jones" },
            { id: "a2", first_name: "Carol", last_name: "White" },
          ],
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/with Bob Jones, Carol White/)).toBeInTheDocument()
    })
  })

  it("interaction shows duration when present", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("30m")).toBeInTheDocument()
    })
  })

  it("note shows edited date when different from created", async () => {
    mockListNotes.mockResolvedValueOnce({
      data: [
        {
          id: "n1",
          contact_id: "c1",
          body: "Note text",
          created_at: "2024-01-10T10:00:00Z",
          updated_at: "2024-01-10T15:00:00Z",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/edited 2024-01-10/)).toBeInTheDocument()
    })
  })

  it("gift uses gift_date when available", async () => {
    mockListGifts.mockResolvedValueOnce({
      data: [
        {
          id: "g1",
          contact_id: "c1",
          name: "Book",
          gift_date: "2024-01-20T00:00:00Z",
          created_at: "2024-01-19T10:00:00Z",
          status: "given",
          occasion: "Birthday",
          value_amount: 25.99,
          description: "A good book",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      // Should show the gift entry
      expect(screen.getByText(/Gift: Book/)).toBeInTheDocument()
      expect(screen.getByText("Birthday")).toBeInTheDocument()
    })
  })

  it("gift fallback to created_at when gift_date is null", async () => {
    mockListGifts.mockResolvedValueOnce({
      data: [
        {
          ...mockGiftData.data[0],
          gift_date: null,
          created_at: "2024-01-19T10:00:00Z",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/Gift: Book/)).toBeInTheDocument()
    })
  })

  it("life event shows description when present", async () => {
    mockListLifeEvents.mockResolvedValueOnce(mockLifeEventData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("New job title")).toBeInTheDocument()
    })
  })

  it("debt shows settled badge when settled_at is present", async () => {
    mockListDebts.mockResolvedValueOnce({
      data: [
        {
          ...mockDebtData.data[0],
          settled_at: "2024-01-15T00:00:00Z",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Settled")).toBeInTheDocument()
    })
  })

  it("debt shows open badge when settled_at is null", async () => {
    mockListDebts.mockResolvedValueOnce(mockDebtData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument()
    })
  })

  it("debt shows 'I owe' when direction is not they_owe", async () => {
    mockListDebts.mockResolvedValueOnce({
      data: [
        {
          ...mockDebtData.data[0],
          direction: "i_owe",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/I owe \$50/)).toBeInTheDocument()
    })
  })

  it("handles multiple events of mixed types", async () => {
    mockListInteractions.mockResolvedValueOnce(mockInteractionData)
    mockListNotes.mockResolvedValueOnce(mockNoteData)
    mockListGifts.mockResolvedValueOnce(mockGiftData)
    mockListLifeEvents.mockResolvedValueOnce(mockLifeEventData)
    mockListDebts.mockResolvedValueOnce(mockDebtData)

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/\(5\)/)).toBeInTheDocument()
      expect(screen.getByText("Call")).toBeInTheDocument()
      expect(screen.getByText("Note")).toBeInTheDocument()
      expect(screen.getByText(/Gift: Book/)).toBeInTheDocument()
      expect(screen.getByText("Got promoted")).toBeInTheDocument()
      expect(screen.getByText(/They owe \$50/)).toBeInTheDocument()
    })
  })

  it("queries use correct contactId parameter", async () => {
    const contactId = "specific-contact-id"
    renderWithProviders(<UnifiedTimeline contactId={contactId} />)

    await waitFor(() => {
      expect(mockListInteractions).toHaveBeenCalledWith(
        expect.objectContaining({ contactId }),
      )
      expect(mockListNotes).toHaveBeenCalledWith(
        expect.objectContaining({ contactId }),
      )
      expect(mockListGifts).toHaveBeenCalledWith(
        expect.objectContaining({ contactId }),
      )
      expect(mockListLifeEvents).toHaveBeenCalledWith(
        expect.objectContaining({ contactId }),
      )
      expect(mockListDebts).toHaveBeenCalledWith(
        expect.objectContaining({ contactId }),
      )
    })
  })

  it("handles API errors gracefully", async () => {
    mockListInteractions.mockRejectedValueOnce(new Error("API Error"))
    mockListNotes.mockResolvedValueOnce({ data: [] })
    mockListGifts.mockResolvedValueOnce({ data: [] })
    mockListLifeEvents.mockResolvedValueOnce({ data: [] })
    mockListDebts.mockResolvedValueOnce({ data: [] })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      // Should still render, just without the failed data
      expect(screen.getByText("Timeline")).toBeInTheDocument()
    })
  })

  it("interaction without attendees shows only channel and date", async () => {
    mockListInteractions.mockResolvedValueOnce({
      data: [
        {
          ...mockInteractionData.data[0],
          attendees: [{ id: "c1", first_name: "Alice", last_name: "Smith" }],
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
      expect(screen.queryByText(/with/)).not.toBeInTheDocument()
    })
  })

  it("capping attendees at 3 with +N indicator", async () => {
    mockListInteractions.mockResolvedValueOnce({
      data: [
        {
          ...mockInteractionData.data[0],
          attendees: [
            { id: "c1", first_name: "Alice", last_name: "Smith" },
            { id: "a1", first_name: "Bob", last_name: "Jones" },
            { id: "a2", first_name: "Carol", last_name: "White" },
            { id: "a3", first_name: "Dave", last_name: "Brown" },
            { id: "a4", first_name: "Eve", last_name: "Green" },
          ],
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      // Check for the attendee names and the +N indicator
      expect(screen.getByText(/Bob Jones/)).toBeInTheDocument()
      expect(screen.getByText(/\+1/)).toBeInTheDocument()
    })
  })

  it("gift without status shows no status badge", async () => {
    mockListGifts.mockResolvedValueOnce({
      data: [
        {
          ...mockGiftData.data[0],
          status: null,
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/Gift: Book/)).toBeInTheDocument()
      // Status badge should not appear
      expect(screen.queryByText("given")).not.toBeInTheDocument()
    })
  })

  it("gift without value shows no amount", async () => {
    mockListGifts.mockResolvedValueOnce({
      data: [
        {
          ...mockGiftData.data[0],
          value_amount: null,
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      expect(screen.getByText(/Gift: Book/)).toBeInTheDocument()
      expect(screen.queryByText(/\$25/)).not.toBeInTheDocument()
    })
  })

  it("debt uses settled_at when available, else created_at", async () => {
    mockListDebts.mockResolvedValueOnce({
      data: [
        {
          id: "d1",
          contact_id: "c1",
          amount: 100,
          direction: "they_owe",
          created_at: "2024-01-01T00:00:00Z",
          settled_at: "2024-01-10T00:00:00Z",
          reason: "Loan",
        },
      ],
    })

    renderWithProviders(<UnifiedTimeline contactId="c1" />)

    await waitFor(() => {
      // Should show settled_at date
      expect(screen.getByText(/They owe \$100/)).toBeInTheDocument()
    })
  })
})
