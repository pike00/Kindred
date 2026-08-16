import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TimelineItemActions } from "@/components/Timeline/TimelineItemActions"
import { renderWithProviders } from "@/test/helpers"

// Service mocks — only the delete methods matter for these tests.
const mockDeleteInteraction = vi.hoisted(() => vi.fn())
const mockDeleteNote = vi.hoisted(() => vi.fn())
const mockDeleteGift = vi.hoisted(() => vi.fn())
const mockDeleteLifeEvent = vi.hoisted(() => vi.fn())
const mockDeleteDebt = vi.hoisted(() => vi.fn())

vi.mock("@/client", () => ({
  InteractionsService: { deleteInteraction: mockDeleteInteraction },
  NotesService: { deleteNote: mockDeleteNote },
  GiftsService: { deleteGift: mockDeleteGift },
  LifeEventsService: { deleteLifeEvent: mockDeleteLifeEvent },
  DebtsService: { deleteDebt: mockDeleteDebt },
}))

// Simplify the dropdown to plain buttons so the test exercises dispatch logic,
// not Radix portal/pointer behavior.
vi.mock("@/components/Common/RowActionsMenu", () => ({
  RowActionsMenu: ({ items }: any) => (
    <div>
      {items.map((it: any) => (
        <button key={it.label} type="button" onClick={it.onSelect}>
          {it.label}
        </button>
      ))}
    </div>
  ),
}))

// Stub each edit dialog to a marker that only renders when open.
vi.mock("@/components/Interactions/EditInteractionDialog", () => ({
  EditInteractionDialog: ({ open }: any) =>
    open ? <div>edit-interaction-open</div> : null,
}))
vi.mock("@/components/Notes/NotesCard", () => ({
  EditNoteDialog: ({ open }: any) => (open ? <div>edit-note-open</div> : null),
}))
vi.mock("@/components/Gifts/AddGift", () => ({
  EditGiftDialog: ({ open }: any) => (open ? <div>edit-gift-open</div> : null),
}))
vi.mock("@/components/Contacts/LifeEventsCard", () => ({
  EditLifeEventDialog: ({ open }: any) =>
    open ? <div>edit-life-event-open</div> : null,
}))
vi.mock("@/components/Debts/AddDebt", () => ({
  EditDebtDialog: ({ open }: any) => (open ? <div>edit-debt-open</div> : null),
}))

vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

const makeEvent = (type: string, id: string) =>
  ({ type, id, date: "2024-01-01T00:00:00Z", payload: { id } }) as any

describe("TimelineItemActions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteInteraction.mockResolvedValue(undefined)
    mockDeleteNote.mockResolvedValue(undefined)
    mockDeleteGift.mockResolvedValue(undefined)
    mockDeleteLifeEvent.mockResolvedValue(undefined)
    mockDeleteDebt.mockResolvedValue(undefined)
  })

  it("renders Edit and Delete actions", () => {
    renderWithProviders(
      <TimelineItemActions event={makeEvent("note", "n1")} contactId="c1" />,
    )
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()
  })

  it("opens the matching edit dialog per type", async () => {
    const user = userEvent.setup()
    const cases: Array<[string, string]> = [
      ["interaction", "edit-interaction-open"],
      ["note", "edit-note-open"],
      ["gift", "edit-gift-open"],
      ["life_event", "edit-life-event-open"],
      ["debt", "edit-debt-open"],
    ]
    for (const [type, marker] of cases) {
      const { unmount } = renderWithProviders(
        <TimelineItemActions event={makeEvent(type, "x1")} contactId="c1" />,
      )
      await user.click(screen.getByRole("button", { name: "Edit" }))
      expect(screen.getByText(marker)).toBeInTheDocument()
      unmount()
    }
  })

  it("deletes via the correct service when confirmed", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()

    renderWithProviders(
      <TimelineItemActions event={makeEvent("gift", "g1")} contactId="c1" />,
    )
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(mockDeleteGift).toHaveBeenCalledWith({ giftId: "g1" })
    })
    confirmSpy.mockRestore()
  })

  it("does not delete when confirmation is cancelled", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()

    renderWithProviders(
      <TimelineItemActions event={makeEvent("debt", "d1")} contactId="c1" />,
    )
    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(mockDeleteDebt).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it("routes delete to the interaction service for interactions", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()

    renderWithProviders(
      <TimelineItemActions
        event={makeEvent("interaction", "ix1")}
        contactId="c1"
      />,
    )
    await user.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(mockDeleteInteraction).toHaveBeenCalledWith({
        interactionId: "ix1",
      })
    })
    confirmSpy.mockRestore()
  })
})
