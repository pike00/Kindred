import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import {
  type BirthdayFieldChange,
  type ContactPublic,
  type ContactUpdateAction,
  type InteractionAction,
  type ReminderAction,
  type VoiceCapturePublic,
  ApiError,
  ContactsService,
  VoiceCapturesService,
} from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, RotateCcw, Trash2, X } from "@/lib/icons"
import {
  createManualAction,
  dateTimeLocalToIso,
  isoToDateTimeLocal,
  type VoiceAction,
  validateActions,
} from "./voiceCaptureUtils"

interface VoiceReviewModalProps {
  captureId: string
  onComplete: (capture: VoiceCapturePublic) => void
  onClose: () => void
}

const contactFields = [
  "company",
  "department",
  "title",
  "nickname",
  "pronouns",
  "how_we_met",
] as const

function contactLabel(contact: ContactPublic): string {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ")
}

function ContactName({ contactId }: { contactId: string }) {
  const { data } = useQuery({
    queryKey: ["contacts", contactId],
    queryFn: () => ContactsService.getContact({ contactId }),
    retry: false,
  })
  return <span>{data ? contactLabel(data) : `Unresolved contact (${contactId.slice(0, 8)})`}</span>
}

function ContactPicker({
  value,
  onChange,
  multiple = false,
  optional = false,
}: {
  value: string | string[] | null | undefined
  onChange: (value: string | string[] | null) => void
  multiple?: boolean
  optional?: boolean
}) {
  const [search, setSearch] = useState("")
  const [skip, setSkip] = useState(0)
  const { data, isFetching } = useQuery({
    queryKey: ["voice-contact-search", search, skip],
    queryFn: () =>
      ContactsService.listContacts({ search: search.trim() || null, skip, limit: 20 }),
    placeholderData: (previous) => previous,
  })
  const selectedIds = Array.isArray(value) ? value : value ? [value] : []
  const selected = (id: string) => selectedIds.includes(id)
  const change = (contact: ContactPublic) => {
    if (multiple) {
      const ids = selectedIds.includes(contact.id)
        ? selectedIds.filter((id) => id !== contact.id)
        : [...selectedIds, contact.id]
      onChange(ids)
    } else {
      onChange(contact.id)
      setSearch(contactLabel(contact))
    }
  }
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {multiple ? "Contacts" : "Contact"}
        {!optional && <span aria-hidden="true"> *</span>}
      </label>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-2">
              <ContactName contactId={id} />
              <button
                type="button"
                aria-label="Remove contact"
                onClick={() =>
                  onChange(multiple ? selectedIds.filter((item) => item !== id) : null)
                }
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {selectedIds.length === 0 && (
        <p className="text-xs text-amber-800" role="status">
          {multiple ? "No attendees selected yet." : optional ? "No contact selected (optional)." : "No contact selected. Choose the intended contact before committing."}
        </p>
      )}
      <Input
        aria-label={multiple ? "Search contacts to add" : "Search contacts"}
        placeholder="Search contacts"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          setSkip(0)
        }}
      />
      <div className="max-h-36 overflow-y-auto rounded-md border" aria-live="polite">
        {data?.data.map((contact) => (
          <button
            key={contact.id}
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            aria-pressed={selected(contact.id)}
            onClick={() => change(contact)}
          >
            {contactLabel(contact) || "Unnamed contact"}
            {selected(contact.id) ? " (selected)" : ""}
          </button>
        ))}
        {data && data.data.length === 0 && !isFetching && (
          <p className="px-3 py-2 text-sm text-muted-foreground">No matching contacts.</p>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{data?.count ?? 0} matches</span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 20))}>
            Previous
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={!data || skip + 20 >= data.count} onClick={() => setSkip(skip + 20)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export function VoiceReviewModal({ captureId, onComplete, onClose }: VoiceReviewModalProps) {
  const [capture, setCapture] = useState<VoiceCapturePublic | null>(null)
  const [correctedText, setCorrectedText] = useState("")
  const [actions, setActions] = useState<VoiceAction[]>([])
  const [error, setError] = useState("")
  const [conflict, setConflict] = useState(false)
  const [commitOutcomeUncertain, setCommitOutcomeUncertain] = useState(false)
  const [reconciliationNotice, setReconciliationNotice] = useState("")
  const [busy, setBusy] = useState<"analyze" | "save" | "commit" | "delete" | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const initialized = useRef(false)
  const busyRef = useRef(false)
  const retryCommitRef = useRef<{ captureId: string; requestBody: { revision: number; corrected_text: string; actions: VoiceAction[] } } | null>(null)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["voice-capture", captureId],
    queryFn: () => VoiceCapturesService.getVoiceCapture({ captureId }),
    retry: false,
  })

  useEffect(() => {
    if (!query.data || initialized.current) return
    initialized.current = true
    setCapture(query.data)
    setCorrectedText(query.data.corrected_text)
    setActions(query.data.actions)
  }, [query.data])

  useEffect(() => {
    if (!capture || capture.status !== "draft" || capture.actions.length > 0 || initialized.current !== true) return
    // A capture with no analyzed actions is analyzed once; failed analysis stays reviewable.
    if (capture.analysis_error || busyRef.current || analyzeStarted.current) return
    analyzeStarted.current = true
    void analyze(capture, correctedText)
  }, [capture])

  const dirty = Boolean(capture && (
    correctedText !== capture.corrected_text || JSON.stringify(actions) !== JSON.stringify(capture.actions)
  ))

  async function analyze(current: VoiceCapturePublic, text: string) {
    if (busyRef.current || commitOutcomeUncertain) return
    busyRef.current = true
    setBusy("analyze")
    setError("")
    try {
      const updated = await VoiceCapturesService.analyzeVoiceCapture({
        captureId,
        requestBody: { revision: current.revision, text },
      })
      setCapture(updated)
      setCorrectedText(updated.corrected_text || text)
      setActions(updated.actions)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Analysis failed. You can retry or add cards manually."
      setError(message)
      setCapture({ ...current, analysis_error: message })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const analyzeStarted = useRef(false)

  async function saveDraft(): Promise<boolean> {
    if (commitOutcomeUncertain) {
      setError("Check the commit status or retry the exact commit before saving this draft.")
      return false
    }
    if (!capture || busyRef.current) return false
    if (!dirty) {
      setSavedNotice(true)
      return true
    }
    busyRef.current = true
    setBusy("save")
    setError("")
    setConflict(false)
    try {
      const updated = await VoiceCapturesService.updateVoiceCapture({
        captureId,
        requestBody: { revision: capture.revision, corrected_text: correctedText, actions },
      })
      setCapture(updated)
      setCorrectedText(updated.corrected_text)
      setActions(updated.actions)
      setSavedNotice(true)
      return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save this draft."
      setError(message)
      if (cause instanceof ApiError && cause.status === 409) {
        setConflict(true)
        try {
          const latest = await VoiceCapturesService.getVoiceCapture({ captureId })
          setCapture(latest)
        } catch {
          // Keep all local review edits visible when the refresh also fails.
        }
      }
      return false
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  async function handleClose() {
    if (commitOutcomeUncertain) {
      setError("Check the commit status or retry the exact commit before closing this capture.")
      return
    }
    if (busyRef.current) return
    if (dirty && !(await saveDraft())) return
    onClose()
  }

  async function invalidateCommittedQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["contacts"] }),
      queryClient.invalidateQueries({ queryKey: ["interactions"] }),
      queryClient.invalidateQueries({ queryKey: ["notes"] }),
      queryClient.invalidateQueries({ queryKey: ["life-events"] }),
      queryClient.invalidateQueries({ queryKey: ["lifeEvents"] }),
      queryClient.invalidateQueries({ queryKey: ["reminders"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["voice-captures"] }),
    ])
  }

  async function reconcilePendingCommit() {
    if (!capture || !retryCommitRef.current || busyRef.current) return
    busyRef.current = true
    setBusy("commit")
    setError("")
    setReconciliationNotice("")
    try {
      const latest = await VoiceCapturesService.getVoiceCapture({ captureId })
      setCapture(latest)
      if (latest.status === "committed") {
        retryCommitRef.current = null
        setCommitOutcomeUncertain(false)
        await invalidateCommittedQueries()
        onComplete(latest)
        return
      }
      retryCommitRef.current = null
      setCommitOutcomeUncertain(false)
      setReconciliationNotice("The capture is still uncommitted. Your visible edits are preserved, and a new commit will use those edits.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check whether the commit completed.")
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  async function commit(exactRetry = false) {
    if (!capture || busyRef.current) return
    const pendingRetry = retryCommitRef.current?.captureId === capture.id
      ? retryCommitRef.current
      : null
    if (exactRetry && !pendingRetry) return
    if (!exactRetry && pendingRetry) {
      setError("Check the commit status or retry the exact submitted commit before sending changed edits.")
      return
    }
    if (!exactRetry) {
      const problems = validateActions(actions)
      if (problems.length) {
        setError(problems.join(" "))
        return
      }
    }
    const request = exactRetry
      ? pendingRetry!.requestBody
      : { revision: capture.revision, corrected_text: correctedText, actions }
    if (!exactRetry) retryCommitRef.current = { captureId: capture.id, requestBody: request }
    busyRef.current = true
    setBusy("commit")
    setError("")
    setConflict(false)
    setReconciliationNotice("")
    try {
      const result = await VoiceCapturesService.commitVoiceCapture({ captureId, requestBody: request })
      if (result.status === "committed") {
        retryCommitRef.current = null
        setCommitOutcomeUncertain(false)
        await invalidateCommittedQueries()
        onComplete(result)
      } else {
        retryCommitRef.current = null
        setCommitOutcomeUncertain(false)
        setCapture(result)
        setCorrectedText(result.corrected_text)
        setActions(result.actions)
        setReconciliationNotice("The capture is still uncommitted. Review the returned draft before committing again.")
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not commit the reviewed actions."
      setError(message)
      if (cause instanceof ApiError && cause.status === 409) {
        setConflict(true)
        retryCommitRef.current = null
        setCommitOutcomeUncertain(false)
        try {
          setCapture(await VoiceCapturesService.getVoiceCapture({ captureId }))
        } catch {
          // Keep local edits so the user can copy or retry after restoring connectivity.
        }
      } else if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500) {
        // An HTTP rejection confirms this request did not commit, so corrections may be submitted.
        retryCommitRef.current = null
        setCommitOutcomeUncertain(false)
      } else {
        // A transport error or server failure can lose the response after the transaction commits.
        // Keep the exact request body until the user retries it or reconciles against the server.
        setCommitOutcomeUncertain(true)
      }
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  async function deleteDraft() {
    if (!capture || capture.status === "committed" || busyRef.current || commitOutcomeUncertain) return
    if (!window.confirm("Delete this uncommitted voice draft?")) return
    busyRef.current = true
    setBusy("delete")
    setError("")
    try {
      await VoiceCapturesService.deleteVoiceCapture({ captureId })
      await queryClient.invalidateQueries({ queryKey: ["voice-captures"] })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this draft.")
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const editAction = (id: string, update: (action: VoiceAction) => VoiceAction) => {
    setSavedNotice(false)
    setActions((current) => current.map((action) => action.id === id ? update(action) : action))
  }

  const actionLabel = (action: VoiceAction) => ({
    interaction: "Interaction",
    note: "Note",
    contact_update: "Contact update",
    life_event: "Life event",
    reminder: "Reminder",
  })[action.kind]

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void handleClose() }}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto" onEscapeKeyDown={(event) => { if (busyRef.current) event.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>Review voice capture</DialogTitle>
          <DialogDescription>
            Edit the transcript and each action before saving or committing. Times are interpreted in {capture?.timezone ?? "your browser timezone"}.
          </DialogDescription>
        </DialogHeader>

        {query.isLoading && <p role="status">Loading saved voice capture…</p>}
        {query.isError && <p role="alert">Could not load this voice capture. {query.error.message}</p>}
        {capture && (
          <div className="space-y-5">
            <fieldset disabled={commitOutcomeUncertain || busy !== null} className="min-w-0 space-y-2 border-0 p-0">
            <section className="space-y-2">
              <h3 className="font-semibold">Original transcript</h3>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{capture.raw_text}</pre>
              <label className="block space-y-1 text-sm font-medium">
                Reviewed transcript
                <Textarea aria-label="Reviewed transcript" value={correctedText} onChange={(event) => { setCorrectedText(event.target.value); setSavedNotice(false) }} rows={4} />
              </label>
              <p className="text-xs text-muted-foreground">Recorded {new Date(capture.recorded_at).toLocaleString()} ({capture.timezone})</p>
            </section>
            </fieldset>

            {capture.warnings.map((warning) => <p key={warning} className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">{warning}</p>)}
            {capture.analysis_error && <p className="rounded-md bg-destructive/10 p-3 text-sm" role="alert">Review could not be completed: {capture.analysis_error}</p>}
            {error && <p className="rounded-md bg-destructive/10 p-3 text-sm" role="alert">{conflict ? "This capture changed elsewhere. Your local edits are preserved; review the latest saved version before saving again. " : ""}{error}</p>}
            {commitOutcomeUncertain && (
              <section className="space-y-2 rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950" role="alert" aria-labelledby="uncertain-commit-title">
                <h3 id="uncertain-commit-title" className="font-semibold">Commit status is uncertain</h3>
                <p>We could not confirm whether this commit completed. The editor is locked until status is checked. Retrying the exact submitted actions avoids duplicate records; refresh the saved status before making or submitting changed edits.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void commit(true)}>
                    {busy === "commit" && <Loader2 className="mr-2 size-4 animate-spin" />}Retry exact commit
                  </Button>
                  <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void reconcilePendingCommit()}>
                    {busy === "commit" && <Loader2 className="mr-2 size-4 animate-spin" />}Refresh status before submitting edits
                  </Button>
                </div>
              </section>
            )}
            {reconciliationNotice && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{reconciliationNotice}</p>}
            {savedNotice && <p role="status" className="text-sm text-emerald-700">Draft saved.</p>}

            <fieldset disabled={commitOutcomeUncertain || busy !== null} className="min-w-0 border-0 p-0">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Actions to review</h3>
                <Button type="button" variant="outline" size="sm" disabled={busy !== null || commitOutcomeUncertain} onClick={() => capture && void analyze(capture, correctedText)}>
                  {busy === "analyze" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCcw className="mr-2 size-4" />}
                  Retry analysis
                </Button>
              </div>
              {actions.map((action, index) => (
                <article key={action.id} className={`space-y-3 rounded-lg border p-4 ${action.enabled === false ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{actionLabel(action)} {index + 1}</h4>
                      <Badge variant="outline">{action.enabled === false ? "Skipped" : "Included"}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => editAction(action.id, (item) => ({ ...item, enabled: item.enabled === false }))}>
                        {action.enabled === false ? "Keep" : "Skip"}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${actionLabel(action).toLowerCase()}`} onClick={() => { setSavedNotice(false); setActions((current) => current.filter((item) => item.id !== action.id)) }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {action.evidence && <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">Source: “{action.evidence}”</blockquote>}
                  {action.review_warning && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">{action.review_warning}</p>}
                  <ActionEditor action={action} onChange={(next) => editAction(action.id, () => next)} />
                </article>
              ))}
              {actions.length === 0 && <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">No actions found. Add cards below or retry analysis.</p>}
              <div className="flex flex-wrap gap-2">
                {(["interaction", "note", "contact_update", "life_event", "reminder"] as const).map((kind) => (
                  <Button key={kind} type="button" variant="outline" size="sm" onClick={() => { setActions((current) => [...current, createManualAction(kind)]); setSavedNotice(false) }}>
                    <Plus className="mr-1 size-4" /> Add {kind.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </section>
            </fieldset>

            {capture.status === "committed" ? (
              <section className="space-y-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-semibold">This capture is already committed.</p>
                <p>{resultSummary(capture.results)}</p>
              </section>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <Button type="button" variant="ghost" className="text-destructive" disabled={busy !== null || commitOutcomeUncertain} onClick={() => void deleteDraft()}>
                  Delete draft
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={busy !== null || commitOutcomeUncertain} onClick={() => void handleClose()}>
                    Save draft and close
                  </Button>
                  <Button type="button" variant="outline" disabled={busy !== null || commitOutcomeUncertain} onClick={() => void saveDraft()}>
                    {busy === "save" && <Loader2 className="mr-2 size-4 animate-spin" />}Save draft
                  </Button>
                  <Button type="button" disabled={busy !== null || commitOutcomeUncertain || actions.every((action) => action.enabled === false)} onClick={() => void commit()}>
                    {busy === "commit" && <Loader2 className="mr-2 size-4 animate-spin" />}Commit reviewed actions
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function resultSummary(results: VoiceCapturePublic["results"]): string {
  if (!results || typeof results !== "object") return "Saved results are available on this capture."
  const singularLabels: Record<string, string> = {
    contacts: "contact",
    interactions: "interaction",
    notes: "note",
    life_events: "life event",
    reminders: "reminder",
  }
  const entries = Object.entries(results).flatMap(([key, value]) =>
    Array.isArray(value) && value.length > 0
      ? [`${value.length} ${singularLabels[key] ?? key.replace(/s$/, "")}${value.length === 1 ? "" : "s"}`]
      : [],
  )
  return entries.length ? `Created ${entries.join(", ")}.` : "No records were created."
}

function ActionEditor({ action, onChange }: { action: VoiceAction; onChange: (action: VoiceAction) => void }) {
  const contactId = "contact_id" in action ? action.contact_id : undefined
  const currentContact = useCurrentContact(contactId)
  const input = (label: string, value: string, set: (value: string) => void, type = "text") => (
    <label className="block space-y-1 text-sm font-medium">{label}<Input aria-label={label} type={type} value={value} onChange={(event) => set(event.target.value)} /></label>
  )
  const text = (label: string, value: string, set: (value: string) => void) => (
    <label className="block space-y-1 text-sm font-medium">{label}<Textarea aria-label={label} value={value} onChange={(event) => set(event.target.value)} /></label>
  )
  const target = (value: string | string[] | null | undefined, set: (value: string | string[] | null) => void, multiple = false, optional = false) => (
    <ContactPicker value={value} onChange={set} multiple={multiple} optional={optional} />
  )
  switch (action.kind) {
    case "interaction":
      return <div className="space-y-3">
        {target(action.attendee_ids ?? [], (value) => onChange({ ...action, attendee_ids: Array.isArray(value) ? value : [] }), true)}
        <label className="block space-y-1 text-sm font-medium">Channel<select aria-label="Channel" className="w-full rounded-md border bg-background p-2" value={action.channel ?? ""} onChange={(event) => onChange({ ...action, channel: event.target.value as InteractionAction["channel"] })}>
          {["call", "in_person", "text", "email", "video", "social", "other"].map((channel) => <option key={channel} value={channel}>{channel.replace("_", " ")}</option>)}
        </select></label>
        {input("Occurred at", isoToDateTimeLocal(action.occurred_at), (value) => onChange({ ...action, occurred_at: dateTimeLocalToIso(value) }), "datetime-local")}
        {text("Interaction notes", action.notes ?? "", (notes) => onChange({ ...action, notes }))}
        {input("Duration in minutes", action.duration_minutes?.toString() ?? "", (value) => onChange({ ...action, duration_minutes: value ? Number(value) : null }), "number")}
        {input("Location", action.location_label ?? "", (location_label) => onChange({ ...action, location_label: location_label || null }))}
      </div>
    case "note":
      return <div className="space-y-3">{target(action.contact_id, (value) => onChange({ ...action, contact_id: typeof value === "string" ? value : null }))}{text("Note text", action.body, (body) => onChange({ ...action, body }))}</div>
    case "contact_update": {
      const setField = (field: string, value: string | null) => {
        const fields = action.fields.filter((entry) => entry.field !== field)
        const entry = field === "birthday"
          ? ({ field: "birthday", value } satisfies BirthdayFieldChange)
          : ({ field: field as (typeof contactFields)[number], value } satisfies ContactUpdateAction["fields"][number])
        onChange({ ...action, fields: [...fields, entry] })
      }
      return <div className="space-y-3">
        {target(action.contact_id, (value) => onChange({ ...action, contact_id: typeof value === "string" ? value : null }))}
        {action.contact_id && action.fields.map((entry) => <p key={entry.field} className="text-xs text-muted-foreground">Current {entry.field}: {String(currentContact?.[entry.field as keyof ContactPublic] ?? "Empty")}</p>)}
        {action.fields.map((entry) => (
          <div key={entry.field} className="space-y-1">
            {input(`${entry.field} value`, entry.value ?? "", (value) => setField(entry.field, value), entry.field === "birthday" ? "date" : "text")}
            {entry.value === null && <p className="text-xs text-amber-800" role="status">This will clear {entry.field}.</p>}
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={entry.value === null}
              onClick={() => setField(entry.field, entry.value === null ? "" : null)}
            >
              {entry.value === null ? `Undo clear ${entry.field}` : `Clear ${entry.field}`}
            </Button>
          </div>
        ))}
        <label className="block space-y-1 text-sm font-medium">Add field<select aria-label="Add field" defaultValue="" onChange={(event) => { if (event.target.value) setField(event.target.value, "") }}>
          <option value="">Choose a field</option>{[...contactFields, "birthday"].filter((field) => !action.fields.some((item) => item.field === field)).map((field) => <option key={field} value={field}>{field.replace("_", " ")}</option>)}
        </select></label>
      </div>
    }
    case "life_event":
      return <div className="space-y-3">
        {target(action.contact_id, (value) => onChange({ ...action, contact_id: typeof value === "string" ? value : null }))}
        {input("Event type", action.event_type, (event_type) => onChange({ ...action, event_type }))}
        {input("Event title", action.title, (title) => onChange({ ...action, title }))}
        {input("Event date", action.occurred_at ?? "", (occurred_at) => onChange({ ...action, occurred_at: occurred_at || null }), "date")}
        {text("Event description", action.description ?? "", (description) => onChange({ ...action, description: description || null }))}
      </div>
    case "reminder":
      return <div className="space-y-3">
        {target(action.contact_id, (value) => onChange({ ...action, contact_id: typeof value === "string" ? value : null }), false, true)}
        {input("Reminder title", action.title, (title) => onChange({ ...action, title }))}
        {input("Remind at", isoToDateTimeLocal(action.remind_at), (value) => onChange({ ...action, remind_at: dateTimeLocalToIso(value) }), "datetime-local")}
        {text("Reminder description", action.description ?? "", (description) => onChange({ ...action, description: description || null }))}
        <label className="block space-y-1 text-sm font-medium">Frequency<select aria-label="Frequency" className="w-full rounded-md border bg-background p-2" value={action.frequency ?? "once"} onChange={(event) => onChange({ ...action, frequency: event.target.value as ReminderAction["frequency"] })}>
          {["once", "daily", "weekly", "monthly", "yearly"].map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
        </select></label>
      </div>
  }
}

function useCurrentContact(contactId: string | null | undefined): ContactPublic | undefined {
  const query = useQuery({
    queryKey: ["contacts", contactId],
    queryFn: () => ContactsService.getContact({ contactId: contactId as string }),
    enabled: Boolean(contactId),
    retry: false,
  })
  return query.data
}
