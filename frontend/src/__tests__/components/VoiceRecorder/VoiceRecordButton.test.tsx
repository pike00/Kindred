import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { VoiceRecordButton } from "@/components/VoiceRecorder/VoiceRecordButton"
import { renderWithProviders } from "@/test/helpers"
import * as ClientModule from "@/client"

const mockErrors = vi.hoisted(() => ({ show: vi.fn() }))
vi.mock("@/client", async () => {
  const actual = await vi.importActual<typeof import("@/client")>("@/client")
  return {
    ...actual,
    TranscribeService: { transcribeAudio: vi.fn() },
    VoiceCapturesService: { listVoiceCaptures: vi.fn() },
  }
})
vi.mock("@/hooks/useCustomToast", () => ({ default: () => ({ showErrorToast: mockErrors.show }) }))
vi.mock("@/components/VoiceRecorder/VoiceReviewModal", () => ({
  VoiceReviewModal: ({ captureId, onClose, onComplete }: { captureId: string; onClose: () => void; onComplete: (capture: any) => void }) => <div data-testid="voice-review-modal">
    <span data-testid="capture-id">{captureId}</span><button type="button" onClick={onClose}>Close capture</button>
    <button type="button" onClick={() => onComplete({ id: captureId, status: "committed" })}>Commit capture</button>
  </div>,
}))

class MockMediaRecorder {
  state: "inactive" | "recording" = "inactive"
  mimeType = "audio/webm"
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  static isTypeSupported = vi.fn().mockReturnValue(true)
  static emitEmpty = false
  static reportedMimeType = "audio/webm"
  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) { this.mimeType = MockMediaRecorder.reportedMimeType }
  start() { this.state = "recording" }
  stop() {
    this.state = "inactive"
    this.ondataavailable?.({ data: MockMediaRecorder.emitEmpty ? new Blob([]) : new Blob(["recorded audio"], { type: "audio/webm" }) })
    this.onstop?.()
  }
}

describe("VoiceRecordButton", () => {
  let trackStop: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.clearAllMocks()
    MockMediaRecorder.emitEmpty = false
    MockMediaRecorder.reportedMimeType = "audio/webm"
    MockMediaRecorder.isTypeSupported.mockReturnValue(true)
    trackStop = vi.fn()
    Object.defineProperty(globalThis, "MediaRecorder", { writable: true, value: MockMediaRecorder })
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }) },
    })
    vi.mocked(ClientModule.VoiceCapturesService.listVoiceCaptures).mockResolvedValue({ data: [], count: 0 })
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it("keeps accessible recording controls and opens the durable capture returned by transcription", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValue({
      text: "Original speech", capture_id: "capture-42",
    })
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    expect(await screen.findByTestId("capture-id")).toHaveTextContent("capture-42")
    expect(ClientModule.TranscribeService.transcribeAudio).toHaveBeenCalledWith({
      formData: expect.objectContaining({ file: expect.any(File), timezone: expect.any(String) }),
    })
    expect(trackStop).toHaveBeenCalled()
  })

  it("notifies the layout after the review commits", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValue({ text: "Words", capture_id: "capture-done" })
    const onCaptureCommitted = vi.fn()
    renderWithProviders(<VoiceRecordButton onCaptureCommitted={onCaptureCommitted} />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Commit capture" })) })
    expect(onCaptureCommitted).toHaveBeenCalledWith({ id: "capture-done", status: "committed" })
    expect(screen.queryByTestId("voice-review-modal")).not.toBeInTheDocument()
  })

  it("retains the recording and offers retry after a transcription failure", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio)
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({ text: "Words", capture_id: "capture-retry" })
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    expect(await screen.findByRole("button", { name: "Retry transcription" })).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry transcription" })) })
    expect(await screen.findByTestId("capture-id")).toHaveTextContent("capture-retry")
    expect(ClientModule.TranscribeService.transcribeAudio).toHaveBeenCalledTimes(2)
  })

  it("allows discarding a failed recording without retrying", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockRejectedValue(new Error("offline"))
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Discard failed recording" })) })
    expect(screen.queryByRole("button", { name: "Retry transcription" })).not.toBeInTheDocument()
    expect(ClientModule.TranscribeService.transcribeAudio).toHaveBeenCalledTimes(1)
  })

  it("returns to idle without uploading an empty recording", async () => {
    MockMediaRecorder.emitEmpty = true
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    expect(await screen.findByRole("button", { name: "Start voice recording" })).toBeInTheDocument()
    expect(ClientModule.TranscribeService.transcribeAudio).not.toHaveBeenCalled()
  })

  it("uses the generic webm format when the browser reports no supported mime type", async () => {
    MockMediaRecorder.isTypeSupported.mockReturnValue(false)
    MockMediaRecorder.reportedMimeType = ""
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValue({ text: "Words", capture_id: "fallback" })
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    await screen.findByTestId("capture-id")
    expect(vi.mocked(ClientModule.TranscribeService.transcribeAudio).mock.calls[0][0].formData.file).toBeInstanceOf(File)
  })

  it("shows a recoverable message when MediaRecorder is unavailable", async () => {
    Object.defineProperty(globalThis, "MediaRecorder", { writable: true, value: undefined })
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    expect(mockErrors.show).toHaveBeenCalledWith("Could not access microphone.")
  })

  it("shows a specific message when microphone permission is denied", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(Object.assign(new Error("denied"), { name: "NotAllowedError" }))
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    expect(mockErrors.show).toHaveBeenCalledWith("Microphone access denied. Please allow microphone permissions.")
  })

  it("updates the recording timer and stops automatically at three minutes", async () => {
    vi.useFakeTimers()
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValue({ text: "Timed recording", capture_id: "timer-stop" })
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByText("Recording 0:01")).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(180_000) })
    expect(screen.getByTestId("capture-id")).toHaveTextContent("timer-stop")
    expect(trackStop).toHaveBeenCalled()
  })

  it("closes a capture and refreshes the saved capture list", async () => {
    vi.mocked(ClientModule.TranscribeService.transcribeAudio).mockResolvedValue({ text: "Words", capture_id: "capture-close" })
    renderWithProviders(<VoiceRecordButton />)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start voice recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Stop recording" })) })
    await act(async () => { fireEvent.click(await screen.findByRole("button", { name: "Close capture" })) })
    expect(screen.queryByTestId("voice-review-modal")).not.toBeInTheDocument()
    expect(ClientModule.VoiceCapturesService.listVoiceCaptures).toHaveBeenCalledTimes(2)
  })

  it("finds a resumable capture on a later page and only opens it after user selection", async () => {
    const committedPage = Array.from({ length: 100 }, (_, index) => ({
      id: `old-${index}`, status: "committed", updated_at: "2026-01-01T00:00:00Z",
    }))
    vi.mocked(ClientModule.VoiceCapturesService.listVoiceCaptures)
      .mockResolvedValueOnce({ data: committedPage, count: 101 } as never)
      .mockResolvedValueOnce({ data: [
        { id: "older-draft", status: "draft", updated_at: "2026-10-06T12:00:00Z", timezone: "America/Chicago" },
        { id: "later-draft", status: "draft", updated_at: "2026-10-07T12:00:00Z", timezone: "America/Chicago" },
      ], count: 102 } as never)
    renderWithProviders(<VoiceRecordButton />)
    const resume = await screen.findByRole("button", { name: /Resume draft/ })
    expect(screen.queryByTestId("voice-review-modal")).not.toBeInTheDocument()
    expect(ClientModule.VoiceCapturesService.listVoiceCaptures).toHaveBeenCalledWith({ skip: 100, limit: 100 })
    await act(async () => { fireEvent.click(resume) })
    await waitFor(() => expect(screen.getByTestId("capture-id")).toHaveTextContent("later-draft"))
  })
})
