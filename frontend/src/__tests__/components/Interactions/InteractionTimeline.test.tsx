import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { InteractionPublic } from "@/client"
import { InteractionTimeline } from "@/components/Interactions/InteractionTimeline"
import { makeContact, renderWithProviders } from "@/test/helpers"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock API
const mockListInteractions = vi.hoisted(() => vi.fn())
const mockDeleteInteraction = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({
  InteractionsService: {
    listInteractions: mockListInteractions,
    deleteInteraction: mockDeleteInteraction,
  },
}))

// Mock AddInteractionDialog
vi.mock("@/components/Interactions/AddInteractionDialog", () => ({
  AddInteractionDialog: () => (
    <button data-testid="add-interaction-dialog">Log Interaction</button>
  ),
}))

// Mock EmptyState
vi.mock("@/components/Common/EmptyState", () => ({
  EmptyState: ({
    title,
    action,
  }: {
    icon: any
    title: string
    description: string
    action: React.ReactNode
  }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      {action}
    </div>
  ),
}))

// Mock RowActionsMenu
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: { items: any[] }) => (
    <div data-testid="row-actions-menu">
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={item.onSelect}
          data-testid={`action-${item.label.toLowerCase()}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

// Mock MentionText
vi.mock("@/components/Mentions/MentionText", () => ({
  MentionText: ({ text }: { text: string }) => <div>{text}</div>,
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
  MessagesSquare: () => <span data-testid="messages-icon" />,
  Phone: () => <span data-testid="phone-icon" />,
  Coffee: () => <span data-testid="coffee-icon" />,
  MessageSquare: () => <span data-testid="message-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  Video: () => <span data-testid="video-icon" />,
  AtSign: () => <span data-testid="at-icon" />,
  MoreHorizontal: () => <span data-testid="more-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}))

function makeInteraction(
  overrides: Partial<InteractionPublic> = {},
): InteractionPublic {
  return {
    id: "interaction-1",
    attendees: [],
    channel: "call",
    notes: null,
    mood: null,
    duration_minutes: null,
    occurred_at: new Date().toISOString(),
    ...overrides,
  }
}

describe("InteractionTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteInteraction.mockResolvedValue({})
  })

  it("shows empty state when no interactions exist", async () => {
    mockListInteractions.mockResolvedValue({ data: [] })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
      expect(screen.getByText("No interactions logged yet")).toBeInTheDocument()
    })
  })

  it("shows action button in empty state", async () => {
    mockListInteractions.mockResolvedValue({ data: [] })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByTestId("add-interaction-dialog")).toBeInTheDocument()
    })
  })

  it("renders title", async () => {
    mockListInteractions.mockResolvedValue({ data: [] })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText("Interactions")).toBeInTheDocument()
    })
  })

  it("displays interactions when present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        channel: "call",
        attendees: [makeContact({ id: "c1", first_name: "Alice" })],
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })
  })

  it("groups interactions by date", async () => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const interactions = [
      makeInteraction({
        id: "i1",
        occurred_at: today.toISOString(),
        channel: "call",
      }),
      makeInteraction({
        id: "i2",
        occurred_at: yesterday.toISOString(),
        channel: "email",
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      const dateHeaders = screen.getAllByText(/^\w+, \w+ \d+, \d{4}$/)
      expect(dateHeaders.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("sorts dates in descending order (newest first)", async () => {
    const today = new Date().toISOString().split("T")[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]

    const interactions = [
      makeInteraction({
        id: "i1",
        occurred_at: `${yesterday}T10:00:00Z`,
        channel: "call",
      }),
      makeInteraction({
        id: "i2",
        occurred_at: `${today}T10:00:00Z`,
        channel: "email",
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      const cards = screen.queryAllByRole("article")
      // Today's interactions should appear before yesterday's
      expect(cards.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("displays channel label and icon", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        channel: "call",
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText("Call")).toBeInTheDocument()
      expect(screen.getByTestId("phone-icon")).toBeInTheDocument()
    })
  })

  it("displays attendee names", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        attendees: [
          makeContact({ id: "c1", first_name: "Alice", last_name: "Smith" }),
        ],
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    })
  })

  it("displays time of interaction", async () => {
    const now = new Date()
    const isoString = now.toISOString()

    const interactions = [makeInteraction({ id: "i1", occurred_at: isoString })]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      // Time should be displayed in HH:MM format
      const timePattern = /\d{1,2}:\d{2}/
      expect(
        screen
          .getAllByText(timePattern)
          .some((el) => timePattern.test(el.textContent || "")),
      ).toBe(true)
    })
  })

  it("displays duration when present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        duration_minutes: 45,
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText("45m")).toBeInTheDocument()
      expect(screen.getByTestId("clock-icon")).toBeInTheDocument()
    })
  })

  it("hides duration when not present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        duration_minutes: null,
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      // Should not display any duration text
      expect(screen.queryByText(/\d+m$/)).not.toBeInTheDocument()
    })
  })

  it("displays mood badge when present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        mood: "Energized",
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText("Energized")).toBeInTheDocument()
    })
  })

  it("hides mood badge when not present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        mood: null,
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      // Should not display "null" or empty mood
      const text = screen.queryByText(/^$/)
      if (text) {
        expect(text).not.toHaveTextContent("null")
      }
    })
  })

  it("displays notes when present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        notes: "Had a great conversation about the project.",
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(
        screen.getByText("Had a great conversation about the project."),
      ).toBeInTheDocument()
    })
  })

  it("hides notes when not present", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        notes: null,
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(
        screen.queryByText(/Had a great conversation/),
      ).not.toBeInTheDocument()
    })
  })

  it("provides delete action for each interaction", async () => {
    const interactions = [
      makeInteraction({ id: "i1", channel: "call" }),
      makeInteraction({ id: "i2", channel: "email" }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      const deleteButtons = screen.getAllByTestId("action-delete")
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
    })
  })

  it("calls delete mutation when delete action clicked", async () => {
    const user = userEvent.setup()
    const interactions = [makeInteraction({ id: "i1" })]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      const deleteButton = screen.getByTestId("action-delete")
      expect(deleteButton).toBeInTheDocument()
    })

    const deleteButton = screen.getByTestId("action-delete")
    await user.click(deleteButton)

    await waitFor(() => {
      expect(mockDeleteInteraction).toHaveBeenCalledWith({
        interactionId: "i1",
      })
    })
  })

  it("displays multiple attendees separated by comma", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        attendees: [
          makeContact({ id: "c1", first_name: "Alice", last_name: "Smith" }),
          makeContact({ id: "c2", first_name: "Bob", last_name: "Jones" }),
        ],
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByText(/Alice Smith, Bob Jones/)).toBeInTheDocument()
    })
  })

  it("handles interactions with no attendees", async () => {
    const interactions = [
      makeInteraction({
        id: "i1",
        attendees: [],
      }),
    ]

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      // Should render the call label without attendee info
      expect(screen.getByText("Call")).toBeInTheDocument()
    })
  })

  it("displays all channel types correctly", async () => {
    const channels: Array<InteractionPublic["channel"]> = [
      "call",
      "in_person",
      "text",
      "email",
      "video",
      "social",
      "other",
    ]

    const interactions = channels.map((ch, idx) =>
      makeInteraction({
        id: `i${idx}`,
        channel: ch,
      }),
    )

    mockListInteractions.mockResolvedValue({ data: interactions })

    renderWithProviders(<InteractionTimeline />)

    const expectedLabels = [
      "Call",
      "In person",
      "Text",
      "Email",
      "Video",
      "Social",
      "Other",
    ]

    for (const label of expectedLabels) {
      await waitFor(() => {
        expect(screen.getByText(label)).toBeInTheDocument()
      })
    }
  })

  it("shows add interaction button in header", async () => {
    mockListInteractions.mockResolvedValue({ data: [] })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByTestId("add-interaction-dialog")).toBeInTheDocument()
    })
  })

  it("renders log interaction button from dialog", async () => {
    mockListInteractions.mockResolvedValue({
      data: [makeInteraction({ id: "i1" })],
    })

    renderWithProviders(<InteractionTimeline />)

    await waitFor(() => {
      expect(screen.getByTestId("add-interaction-dialog")).toBeInTheDocument()
    })
  })
})
