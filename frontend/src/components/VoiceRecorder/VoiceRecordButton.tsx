import { useMutation } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { type InteractionPublic, TranscribeService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { Loader2, Mic, Square } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { VoiceReviewModal } from "./VoiceReviewModal"

interface VoiceRecordButtonProps {
  onInteractionCreated?: (interaction: InteractionPublic) => void
}

type RecordingState = "idle" | "requesting" | "recording" | "processing"

function getSupportedMimeType(): { mimeType?: string; extension: string } {
  if (typeof MediaRecorder === "undefined") {
    return { extension: "webm" }
  }
  const candidateTypes = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp4", extension: "mp4" },
    { mimeType: "audio/aac", extension: "aac" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  ]
  for (const candidate of candidateTypes) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate
    }
  }
  return { extension: "webm" }
}

export function VoiceRecordButton({
  onInteractionCreated,
}: VoiceRecordButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [transcribedText, setTranscribedText] = useState<string>("")
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingStateRef = useRef<RecordingState>("idle")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileExtensionRef = useRef<string>("webm")
  const pressStartTimeRef = useRef<number>(0)

  const { showSuccessToast, showErrorToast } = useCustomToast()

  // Keep ref in sync for event listeners and callbacks
  useEffect(() => {
    recordingStateRef.current = recordingState
  }, [recordingState])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setElapsedSeconds(0)
  }, [])

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    mediaRecorderRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      cleanupStream()
    }
  }, [clearTimer, cleanupStream])

  const transcribeMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await TranscribeService.transcribeAudio({
        formData: {
          file: file as unknown as string,
        },
      })
      return response as { text?: string; language?: string; duration?: number }
    },
    onSuccess: (data) => {
      const text = data?.text?.trim() || ""
      if (!text) {
        showErrorToast("No speech detected in audio recording.")
        setRecordingState("idle")
        return
      }
      setTranscribedText(text)
      setShowReviewModal(true)
      setRecordingState("idle")
    },
    onError: (error: Error) => {
      showErrorToast(`Transcription failed: ${error.message}`)
      setRecordingState("idle")
    },
  })

  const stopRecording = useCallback(() => {
    clearTimer()
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop()
    } else {
      cleanupStream()
      setRecordingState("idle")
    }
  }, [clearTimer, cleanupStream])

  const startRecording = useCallback(async () => {
    if (recordingStateRef.current !== "idle") return

    setRecordingState("requesting")
    pressStartTimeRef.current = Date.now()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const { mimeType, extension } = getSupportedMimeType()
      fileExtensionRef.current = extension

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const detectedMimeType =
          mediaRecorder.mimeType || mimeType || "audio/webm"
        const audioBlob = new Blob(chunksRef.current, {
          type: detectedMimeType,
        })

        cleanupStream()

        if (audioBlob.size === 0) {
          setRecordingState("idle")
          return
        }

        const ext = fileExtensionRef.current
        const file = new File([audioBlob], `recording.${ext}`, {
          type: detectedMimeType,
        })

        setRecordingState("processing")
        transcribeMutation.mutate(file)
      }

      mediaRecorder.start(250) // Request chunks every 250ms
      setRecordingState("recording")

      setElapsedSeconds(0)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= 180) {
            // Auto stop after 3 minutes
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (error) {
      console.error("Failed to start recording:", error)
      cleanupStream()
      clearTimer()
      const errorMsg =
        error instanceof Error && error.name === "NotAllowedError"
          ? "Microphone access denied. Please allow microphone permissions."
          : "Could not access microphone."
      showErrorToast(errorMsg)
      setRecordingState("idle")
    }
  }, [
    cleanupStream,
    clearTimer,
    showErrorToast,
    stopRecording,
    transcribeMutation,
  ])

  const handleClick = () => {
    if (recordingState === "idle") {
      startRecording()
    } else if (recordingState === "recording") {
      stopRecording()
    }
  }

  const handleReviewComplete = (interaction: InteractionPublic) => {
    setShowReviewModal(false)
    setTranscribedText("")
    showSuccessToast("Interaction logged from voice!")
    onInteractionCreated?.(interaction)
  }

  const handleReviewCancel = () => {
    setShowReviewModal(false)
    setTranscribedText("")
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Floating status badge */}
        {recordingState === "recording" && (
          <div className="flex items-center gap-2 rounded-full bg-red-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-lg animate-pulse">
            <span className="size-2 rounded-full bg-white" />
            <span>Recording {formatTime(elapsedSeconds)}</span>
            <span className="text-xs text-red-200">(Click to stop)</span>
          </div>
        )}

        {recordingState === "processing" && (
          <div className="flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-sm font-medium text-white shadow-lg">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Transcribing audio...</span>
          </div>
        )}

        {recordingState === "requesting" && (
          <div className="flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground shadow-lg border">
            <Loader2 className="size-3.5 animate-spin" />
            <span>Starting microphone...</span>
          </div>
        )}

        <Button
          size="lg"
          className={cn(
            "rounded-full w-16 h-16 shadow-lg transition-all duration-200",
            recordingState === "recording" &&
              "bg-red-600 hover:bg-red-700 scale-110 shadow-red-500/50",
            recordingState === "processing" &&
              "bg-amber-500 hover:bg-amber-600",
          )}
          onClick={handleClick}
          disabled={
            recordingState === "processing" || recordingState === "requesting"
          }
          aria-label={
            recordingState === "recording"
              ? "Stop recording"
              : recordingState === "processing"
                ? "Processing transcription..."
                : recordingState === "requesting"
                  ? "Starting recording..."
                  : "Start voice recording"
          }
        >
          {recordingState === "processing" ||
          recordingState === "requesting" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : recordingState === "recording" ? (
            <Square className="size-6 fill-current" />
          ) : (
            <Mic className="size-6" />
          )}
        </Button>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <VoiceReviewModal
          transcribedText={transcribedText}
          onComplete={handleReviewComplete}
          onCancel={handleReviewCancel}
        />
      )}
    </>
  )
}
