import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { VoiceRecordButton } from "@/components/VoiceRecorder/VoiceRecordButton"
import { renderWithProviders } from "@/test/helpers"
import * as ClientModule from "@/client"

// Mock TranscribeService
vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    TranscribeService: {
      transcribeAudio: vi.fn(),
    },
    ContactsService: {
      listContacts: vi.fn().mockResolvedValue({ data: [], count: 0 }),
    },
    InteractionsService: {
      createInteractionRoute: vi.fn(),
    },
  }
})

// Mock toast hook
const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()
vi.mock("@/hooks/useCustomToast", () => ({
  default: vi.fn(() => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  })),
}))

// Mock VoiceReviewModal
vi.mock("@/components/VoiceRecorder/VoiceReviewModal", () => ({
  VoiceReviewModal: ({
    transcribedText,
    onComplete,
    onCancel,
  }: {
    transcribedText: string
    onComplete: (data: any) => void
    onCancel: () => void
  }) => (
    <div data-testid="voice-review-modal">
      <span data-testid="transcribed-text">{transcribedText}</span>
      <button
        type="button"
        data-testid="complete-review-btn"
        onClick={() =>
          onComplete({
            id: "int-1",
            notes: transcribedText,
            channel: "in_person",
            occurred_at: "2026-08-23T20:00:00Z",
            attendee_ids: [],
          })
        }
      >
        Complete
      </button>
      <button
        type="button"
        data-testid="cancel-review-btn"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  ),
}))

class MockMediaRecorder {
  state: "inactive" | "recording" | "paused" = "inactive"
  mimeType = "audio/webm"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  static isTypeSupported = vi.fn().mockReturnValue(true)

  start() {
    this.state = "recording"
  }

  stop() {
    this.state = "inactive"
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(["fake-audio-chunk"], { type: "audio/webm" }) })
    }
    if (this.onstop) {
      this.onstop()
    }
  }
}

describe("VoiceRecordButton", () => {
  let mockMediaStream: { getTracks: () => Array<{ stop: () => void }> }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMediaStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    }

    Object.defineProperty(globalThis, "MediaRecorder", {
      writable: true,
      value: MockMediaRecorder,
    })

    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders idle voice record button with initial accessibility label", () => {
    renderWithProviders(<VoiceRecordButton />)

    const button = screen.getByRole("button", { name: "Start voice recording" })
    expect(button).toBeInTheDocument()
  })

  it("starts recording on click and displays recording indicator", async () => {
    renderWithProviders(<VoiceRecordButton />)

    const button = screen.getByRole("button", { name: "Start voice recording" })
    await act(async () => {
      fireEvent.click(button)
    })

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(await screen.findByText(/Recording 0:00/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument()
  })

  it("handles microphone permission denied error gracefully", async () => {
    const notAllowedError = new Error("Permission denied")
    notAllowedError.name = "NotAllowedError"
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(notAllowedError)

    renderWithProviders(<VoiceRecordButton />)

    const button = screen.getByRole("button", { name: "Start voice recording" })
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Microphone access denied. Please allow microphone permissions.",
      )
    })
  })

  it("stops recording on click, sends audio to TranscribeService, and opens review modal on success", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValueOnce({
      text: "Discussed quarterly roadmap with Sarah.",
      language: "en",
      duration: 3.5,
    } as any)

    renderWithProviders(<VoiceRecordButton />)

    const button = screen.getByRole("button", { name: "Start voice recording" })
    await act(async () => {
      fireEvent.click(button)
    })

    const stopButton = await screen.findByRole("button", { name: "Stop recording" })
    await act(async () => {
      fireEvent.click(stopButton)
    })

    await waitFor(() => {
      expect(ClientModule.TranscribeService.transcribeAudio).toHaveBeenCalled()
    })

    expect(await screen.findByTestId("voice-review-modal")).toBeInTheDocument()
    expect(screen.getByTestId("transcribed-text")).toHaveTextContent(
      "Discussed quarterly roadmap with Sarah.",
    )
  })

  it("shows error toast when transcription detects no speech", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValueOnce({
      text: "   ",
      language: "en",
    } as any)

    renderWithProviders(<VoiceRecordButton />)

    const button = screen.getByRole("button", { name: "Start voice recording" })
    await act(async () => {
      fireEvent.click(button)
    })

    const stopButton = await screen.findByRole("button", { name: "Stop recording" })
    await act(async () => {
      fireEvent.click(stopButton)
    })

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "No speech detected in audio recording.",
      )
    })
    expect(screen.queryByTestId("voice-review-modal")).not.toBeInTheDocument()
  })

  it("shows error toast when TranscribeService fails", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockRejectedValueOnce(
      new Error("Whisper container unavailable"),
    )

    renderWithProviders(<VoiceRecordButton />)

    const button = screen.getByRole("button", { name: "Start voice recording" })
    await act(async () => {
      fireEvent.click(button)
    })

    const stopButton = await screen.findByRole("button", { name: "Stop recording" })
    await act(async () => {
      fireEvent.click(stopButton)
    })

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalledWith(
        "Transcription failed: Whisper container unavailable",
      )
    })
  })
})
