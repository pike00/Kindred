import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ContactsService, InteractionsService } from "@/client"
import { VoiceReviewModal } from "@/components/VoiceRecorder/VoiceReviewModal"

vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    ContactsService: {
      listContacts: vi.fn(),
    },
    InteractionsService: {
      createInteractionRoute: vi.fn(),
    },
  }
})

const mockContacts = [
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    first_name: "Nora",
    last_name: "Taylor",
    owner_id: "owner-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    first_name: "Lucas",
    last_name: "Maeda",
    owner_id: "owner-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("VoiceReviewModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ContactsService.listContacts).mockResolvedValue({
      data: mockContacts,
      count: mockContacts.length,
    } as any)
  })

  it("automatically identifies attendee, channel, and cleans notes from voice transcription", async () => {
    const rawVoice =
      "at that I called Nora Taylor and followed up with her about X, Y, Z"
    const onComplete = vi.fn()
    const onCancel = vi.fn()

    renderWithQueryClient(
      <VoiceReviewModal
        transcribedText={rawVoice}
        onComplete={onComplete}
        onCancel={onCancel}
      />,
    )

    // Wait for contacts to load and populate the form
    await waitFor(() => {
      expect(screen.getByText("Nora Taylor")).toBeInTheDocument()
    })

    // Check that Nora Taylor badge is rendered
    expect(screen.getByText("Nora Taylor")).toBeInTheDocument()
    expect(screen.getByText("Identified from voice")).toBeInTheDocument()

    // Notes should be cleaned
    const notesTextarea = screen.getByPlaceholderText(
      "What did you talk about?",
    ) as HTMLTextAreaElement
    expect(notesTextarea.value).toBe("Followed up with her about X, Y, Z.")

    // Channel should be "Call"
    const callButton = screen.getByRole("button", { name: "Call" })
    expect(callButton).toHaveClass("bg-primary")
  })

  it("allows toggling between cleaned notes and original raw transcript", async () => {
    const rawVoice =
      "at that I called Nora Taylor and followed up with her about X, Y, Z"
    const onComplete = vi.fn()
    const onCancel = vi.fn()

    renderWithQueryClient(
      <VoiceReviewModal
        transcribedText={rawVoice}
        onComplete={onComplete}
        onCancel={onCancel}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Nora Taylor")).toBeInTheDocument()
    })

    const toggleButton = screen.getByRole("button", {
      name: /show original transcription/i,
    })
    fireEvent.click(toggleButton)

    const notesTextarea = screen.getByPlaceholderText(
      "What did you talk about?",
    ) as HTMLTextAreaElement
    expect(notesTextarea.value).toBe(rawVoice)

    // Toggle back to cleaned text
    const cleanButton = screen.getByRole("button", {
      name: /use cleaned text/i,
    })
    fireEvent.click(cleanButton)
    expect(notesTextarea.value).toBe("Followed up with her about X, Y, Z.")
  })

  it("submits the interaction with extracted details", async () => {
    const rawVoice =
      "at that I called Nora Taylor and followed up with her about X, Y, Z"
    const onComplete = vi.fn()
    const onCancel = vi.fn()

    vi.mocked(InteractionsService.createInteractionRoute).mockResolvedValue({
      id: "interaction-1",
      attendee_ids: ["a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"],
      channel: "call",
      notes: "Followed up with her about X, Y, Z.",
      occurred_at: "2026-08-24T12:00:00Z",
      duration_minutes: null,
      created_at: "2026-08-24T12:00:00Z",
      updated_at: "2026-08-24T12:00:00Z",
    } as any)

    renderWithQueryClient(
      <VoiceReviewModal
        transcribedText={rawVoice}
        onComplete={onComplete}
        onCancel={onCancel}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Nora Taylor")).toBeInTheDocument()
    })

    const saveButton = screen.getByRole("button", { name: /save interaction/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(
        InteractionsService.createInteractionRoute,
      ).toHaveBeenCalledWith({
        requestBody: expect.objectContaining({
          attendee_ids: ["a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"],
          channel: "call",
          notes: "Followed up with her about X, Y, Z.",
        }),
      })
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
