import { useMutation } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import type { InteractionPublic } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { Loader2, Mic, MicOff } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { VoiceReviewModal } from "./VoiceReviewModal"

interface VoiceRecordButtonProps {
  onInteractionCreated?: (interaction: InteractionPublic) => void
}

type RecordingState = "idle" | "recording" | "processing" | "error"

export function VoiceRecordButton({
  onInteractionCreated,
}: VoiceRecordButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [transcribedText, setTranscribedText] = useState<string>("")
  const [showReviewModal, setShowReviewModal] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      // Convert blob to file and send to backend
      const file = new File([audioBlob], "recording.wav", { type: "audio/wav" })
      const response = await fetch("/api/v1/transcribe/", {
        method: "POST",
        body: (() => {
          const formData = new FormData()
          formData.append("file", file)
          return formData
        })(),
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || "Transcription failed")
      }
      return response.json()
    },
    onSuccess: (data) => {
      setTranscribedText(data.text || "")
      setShowReviewModal(true)
      setRecordingState("idle")
    },
    onError: (error: Error) => {
      showErrorToast(`Transcription failed: ${error.message}`)
      setRecordingState("idle")
    },
  })

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        // Stop all tracks to release microphone
        for (const track of stream.getTracks()) {
          track.stop()
        }
        // Start transcription
        setRecordingState("processing")
        transcribeMutation.mutate(audioBlob)
      }

      mediaRecorder.start()
      setRecordingState("recording")
    } catch (error) {
      console.error("Failed to start recording:", error)
      showErrorToast(
        "Microphone access denied. Please allow microphone permissions.",
      )
      setRecordingState("error")
      setTimeout(() => setRecordingState("idle"), 3000)
    }
  }, [transcribeMutation, showErrorToast])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [recordingState])

  const handleMouseDown = () => {
    if (recordingState === "idle") {
      startRecording()
    }
  }

  const handleMouseUp = () => {
    if (recordingState === "recording") {
      stopRecording()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    if (recordingState === "idle") {
      startRecording()
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    if (recordingState === "recording") {
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

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className={cn(
            "rounded-full w-16 h-16 shadow-lg transition-all duration-200",
            recordingState === "recording" &&
              "bg-red-500 hover:bg-red-600 scale-110 animate-pulse",
            recordingState === "processing" &&
              "bg-amber-500 hover:bg-amber-600",
          )}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={recordingState === "processing"}
          aria-label={
            recordingState === "recording"
              ? "Recording... release to stop"
              : recordingState === "processing"
                ? "Processing..."
                : "Hold to record voice"
          }
        >
          {recordingState === "processing" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : recordingState === "recording" ? (
            <MicOff className="size-6" />
          ) : (
            <Mic className="size-6" />
          )}
        </Button>

        {/* Visual feedback */}
        {recordingState === "recording" && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-red-500 px-3 py-1.5 text-sm text-white shadow-lg">
            Recording... release to stop
          </div>
        )}
        {recordingState === "processing" && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-500 px-3 py-1.5 text-sm text-white shadow-lg">
            Transcribing...
          </div>
        )}
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
