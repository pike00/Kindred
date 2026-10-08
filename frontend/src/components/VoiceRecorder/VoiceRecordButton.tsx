import { useMutation, useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { type VoiceCapturePublic, TranscribeService, VoiceCapturesService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { Loader2, Mic, Square } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { VoiceReviewModal } from "./VoiceReviewModal"

type RecordingState = "idle" | "requesting" | "recording" | "processing"

function getSupportedMimeType(): { mimeType?: string; extension: string } {
  if (typeof MediaRecorder === "undefined") return { extension: "webm" }
  const types = [
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp4", extension: "mp4" },
    { mimeType: "audio/aac", extension: "aac" },
    { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  ]
  return types.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType)) ?? { extension: "webm" }
}

async function listAllCaptures(): Promise<VoiceCapturePublic[]> {
  const pageSize = 100
  const captures: VoiceCapturePublic[] = []
  let count = Number.POSITIVE_INFINITY
  while (captures.length < count) {
    const page = await VoiceCapturesService.listVoiceCaptures({ skip: captures.length, limit: pageSize })
    captures.push(...page.data)
    count = page.count
    if (page.data.length === 0) break
  }
  return captures
}

export function VoiceRecordButton({
  onCaptureCommitted,
}: {
  onCaptureCommitted?: (capture: VoiceCapturePublic) => void
}) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [captureId, setCaptureId] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const stateRef = useRef<RecordingState>("idle")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const extensionRef = useRef("webm")
  const { showErrorToast } = useCustomToast()

  useEffect(() => { stateRef.current = recordingState }, [recordingState])
  const drafts = useQuery({
    queryKey: ["voice-captures"],
    queryFn: listAllCaptures,
    staleTime: 30_000,
  })
  const latestDraft = drafts.data
    ?.filter((item) => item.status === "draft" || item.status === "ready")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]

  const cleanupStream = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop()
    streamRef.current = null
    recorderRef.current = null
  }, [])
  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setElapsedSeconds(0)
  }, [])
  useEffect(() => () => { clearTimer(); cleanupStream() }, [clearTimer, cleanupStream])

  const transcribe = useMutation({
    mutationFn: async (file: File) => TranscribeService.transcribeAudio({
      formData: { file, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    }),
    onSuccess: (result) => {
      setPendingFile(null)
      setCaptureId(result.capture_id)
      setRecordingState("idle")
    },
    onError: (cause: Error) => {
      setRecordingState("idle")
      showErrorToast(`Transcription failed: ${cause.message}`)
    },
  })

  const stopRecording = useCallback(() => {
    clearTimer()
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop()
    } else {
      cleanupStream()
      setRecordingState("idle")
    }
  }, [clearTimer, cleanupStream])

  const startRecording = useCallback(async () => {
    if (stateRef.current !== "idle") return
    setRecordingState("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const { mimeType, extension } = getSupportedMimeType()
      extensionRef.current = extension
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm"
        const blob = new Blob(chunksRef.current, { type })
        cleanupStream()
        if (!blob.size) { setRecordingState("idle"); return }
        const file = new File([blob], `recording.${extensionRef.current}`, { type })
        setPendingFile(file)
        setRecordingState("processing")
        transcribe.mutate(file)
      }
      recorder.start(250)
      setRecordingState("recording")
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds((seconds) => {
        if (seconds >= 180) { stopRecording(); return seconds }
        return seconds + 1
      }), 1000)
    } catch (cause) {
      cleanupStream()
      clearTimer()
      showErrorToast(cause instanceof Error && cause.name === "NotAllowedError"
        ? "Microphone access denied. Please allow microphone permissions."
        : "Could not access microphone.")
      setRecordingState("idle")
    }
  }, [cleanupStream, clearTimer, showErrorToast, stopRecording, transcribe])

  const finishReview = (capture: VoiceCapturePublic) => {
    onCaptureCommitted?.(capture)
    setCaptureId(null)
    drafts.refetch()
  }
  const formatTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, "0")}`

  return <>
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {recordingState === "recording" && <div className="rounded-full bg-red-600 px-3 py-1.5 text-sm text-white">Recording {formatTime}</div>}
      {recordingState === "processing" && <div role="status" className="flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 text-sm text-white"><Loader2 className="size-4 animate-spin" />Transcribing audio…</div>}
      {recordingState === "requesting" && <div role="status" className="flex items-center gap-2 rounded-full border bg-muted px-3 py-1.5 text-sm"><Loader2 className="size-4 animate-spin" />Starting microphone…</div>}
      <Button size="lg" className={cn("h-16 w-16 rounded-full shadow-lg", recordingState === "recording" && "bg-red-600 hover:bg-red-700", recordingState === "processing" && "bg-amber-500")} onClick={() => recordingState === "recording" ? stopRecording() : void startRecording()} disabled={recordingState === "processing" || recordingState === "requesting"} aria-label={recordingState === "recording" ? "Stop recording" : recordingState === "processing" ? "Processing transcription..." : recordingState === "requesting" ? "Starting recording..." : "Start voice recording"}>
        {recordingState === "processing" || recordingState === "requesting" ? <Loader2 className="size-6 animate-spin" /> : recordingState === "recording" ? <Square className="size-6 fill-current" /> : <Mic className="size-6" />}
      </Button>
    </div>
    {pendingFile && recordingState === "idle" && <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-md border bg-background p-2 shadow-lg">
      <span className="text-sm">Transcription did not complete.</span>
      <Button size="sm" disabled={transcribe.isPending} onClick={() => { setRecordingState("processing"); transcribe.mutate(pendingFile) }}>Retry transcription</Button>
      <Button size="sm" variant="ghost" aria-label="Discard failed recording" onClick={() => setPendingFile(null)}>Discard</Button>
    </div>}
    {latestDraft && !captureId && <Button className="fixed bottom-6 right-24 z-50" variant="outline" onClick={() => setCaptureId(latestDraft.id)}>
      Resume draft ({new Date(latestDraft.updated_at).toLocaleDateString()} · {latestDraft.timezone})
    </Button>}
    {captureId && <VoiceReviewModal captureId={captureId} onComplete={finishReview} onClose={() => { setCaptureId(null); drafts.refetch() }} />}
  </>
}
