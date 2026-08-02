import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, isWithinInterval, parseISO } from "date-fns"
import { useMemo, useState } from "react"

import type {
  DebtPublic,
  GiftPublic,
  InteractionPublic,
  LifeEventPublic,
  NotePublic,
} from "@/client"
import {
  DebtsService,
  GiftsService,
  InteractionsService,
  LifeEventsService,
  NotesService,
} from "@/client"
import {
  AddLifeEventDialog,
  EditLifeEventDialog,
} from "@/components/Contacts/LifeEventsCard"
import { MentionText } from "@/components/Mentions/MentionText"
import { MentionTextarea } from "@/components/Mentions/MentionTextarea"
import { QuickCapture } from "@/components/Notes/NotesCard"
import { TimelineItemActions } from "@/components/Timeline/TimelineItemActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingButton } from "@/components/ui/loading-button"
import { Skeleton } from "@/components/ui/skeleton"
import useCustomToast from "@/hooks/useCustomToast"
import {
  CalendarHeart,
  Check,
  Clock,
  HeartHandshake,
  type LucideIcon,
  MessagesSquare,
  NotebookPen,
  Pencil,
  X,
} from "@/lib/icons"
import { cn, formatDateWithRelative } from "@/lib/utils"

export type TimelineEventType =
  | "interaction"
  | "note"
  | "gift"
  | "life_event"
  | "debt"

export type TimelineEvent =
  | {
      type: "interaction"
      id: string
      date: string
      payload: InteractionPublic
    }
  | { type: "note"; id: string; date: string; payload: NotePublic }
  | { type: "gift"; id: string; date: string; payload: GiftPublic }
  | { type: "life_event"; id: string; date: string; payload: LifeEventPublic }
  | { type: "debt"; id: string; date: string; payload: DebtPublic }

type TypeMeta = {
  label: string
  icon: LucideIcon
  className: string
  dot: string
}

const TYPE_META: Record<TimelineEventType, TypeMeta> = {
  interaction: {
    label: "Interactions",
    icon: MessagesSquare,
    className: "bg-accent-blue text-accent-blue-fg",
    dot: "bg-accent-blue-fg",
  },
  note: {
    label: "Notes",
    icon: NotebookPen,
    className: "bg-accent-amber text-accent-amber-fg",
    dot: "bg-accent-amber-fg",
  },
  gift: {
    label: "Gifts",
    icon: HeartHandshake,
    className: "bg-accent-rose text-accent-rose-fg",
    dot: "bg-accent-rose-fg",
  },
  life_event: {
    label: "Life events",
    icon: CalendarHeart,
    className: "bg-accent-purple text-accent-purple-fg",
    dot: "bg-accent-purple-fg",
  },
  debt: {
    label: "Debts",
    icon: Clock,
    className: "bg-accent-teal text-accent-teal-fg",
    dot: "bg-accent-teal-fg",
  },
}

const ALL_TYPES: TimelineEventType[] = [
  "interaction",
  "note",
  "gift",
  "life_event",
  "debt",
]

const channelLabels: Record<string, string> = {
  call: "Call",
  in_person: "In person",
  text: "Text",
  email: "Email",
  video: "Video",
  social: "Social",
  other: "Other",
}

function formatDate(iso: string) {
  return formatDateWithRelative(iso)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function UnifiedTimeline({
  contactId,
  startDate,
  endDate,
}: {
  contactId: string
  startDate?: string | null
  endDate?: string | null
}) {
  const [enabled, setEnabled] = useState<Set<TimelineEventType>>(
    new Set(ALL_TYPES),
  )

  const interactions = useQuery({
    queryKey: ["interactions", contactId],
    queryFn: () => InteractionsService.listInteractions({ contactId }),
  })
  const notes = useQuery({
    queryKey: ["notes", contactId],
    queryFn: () => NotesService.listNotes({ contactId }),
  })
  const gifts = useQuery({
    queryKey: ["gifts", contactId],
    queryFn: () => GiftsService.listGifts({ contactId }),
  })
  const lifeEvents = useQuery({
    queryKey: ["life-events", contactId],
    queryFn: () => LifeEventsService.listLifeEvents({ contactId }),
  })
  const debts = useQuery({
    queryKey: ["debts", contactId],
    queryFn: () => DebtsService.listDebts({ contactId }),
  })

  const isLoading =
    interactions.isLoading ||
    notes.isLoading ||
    gifts.isLoading ||
    lifeEvents.isLoading ||
    debts.isLoading

  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = []
    for (const ix of interactions.data?.data ?? []) {
      list.push({
        type: "interaction",
        id: ix.id,
        date: ix.occurred_at,
        payload: ix,
      })
    }
    for (const n of notes.data?.data ?? []) {
      list.push({ type: "note", id: n.id, date: n.created_at, payload: n })
    }
    for (const g of gifts.data?.data ?? []) {
      list.push({
        type: "gift",
        id: g.id,
        date: g.gift_date ?? g.created_at,
        payload: g,
      })
    }
    for (const le of lifeEvents.data?.data ?? []) {
      list.push({
        type: "life_event",
        id: le.id,
        date: le.occurred_at,
        payload: le,
      })
    }
    for (const d of debts.data?.data ?? []) {
      list.push({
        type: "debt",
        id: d.id,
        date: d.settled_at ?? d.created_at,
        payload: d,
      })
    }
    list.sort((a, b) => b.date.localeCompare(a.date))
    return list
  }, [interactions.data, notes.data, gifts.data, lifeEvents.data, debts.data])

  const visible = useMemo(
    () => events.filter((e) => enabled.has(e.type)),
    [events, enabled],
  )

  // Apply date range filter if provided
  const filtered = useMemo(() => {
    if (!startDate || !endDate) return visible
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    return visible.filter((e) => {
      const d = parseISO(e.date)
      return isWithinInterval(d, { start, end })
    })
  }, [visible, startDate, endDate])

  const counts = useMemo(() => {
    const c: Record<TimelineEventType, number> = {
      interaction: 0,
      note: 0,
      gift: 0,
      life_event: 0,
      debt: 0,
    }
    for (const e of events) c[e.type]++
    return c
  }, [events])

  const toggle = (t: TimelineEventType) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Timeline
            {!isLoading && events.length > 0 && (
              <span className="text-muted-foreground font-normal">
                ({filtered.length})
              </span>
            )}
          </CardTitle>
          <AddLifeEventDialog
            contactId={contactId}
            trigger={
              <Button variant="outline" size="sm">
                <CalendarHeart className="mr-1 size-3.5" /> Add life event
              </Button>
            }
          />
        </div>
        {startDate && endDate && (
          <p className="text-xs text-muted-foreground">
            Showing events from {format(parseISO(startDate), "MMM d")} -{" "}
            {format(parseISO(endDate), "MMM d, yyyy")}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {ALL_TYPES.map((t) => {
            const meta = TYPE_META[t]
            const on = enabled.has(t)
            const count = counts[t]
            return (
              <Button
                key={t}
                type="button"
                variant={on ? "default" : "outline"}
                size="sm"
                onClick={() => toggle(t)}
                disabled={count === 0}
                className="h-7 gap-1.5 text-xs"
              >
                <meta.icon className="size-3.5" />
                {meta.label}
                <span className="text-[10px] opacity-80">{count}</span>
              </Button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <QuickCapture contactId={contactId} />
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {visible.length === 0
              ? events.length === 0
                ? "Nothing here yet. Log an interaction, capture a note, or add a life event to get started."
                : "All event types are filtered out."
              : "No events in the selected date range."}
          </p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-muted pl-5 ml-2">
            {filtered.map((e) => (
              <TimelineRow
                key={`${e.type}:${e.id}`}
                event={e}
                contactId={contactId}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineRow({
  event,
  contactId,
}: {
  event: TimelineEvent
  contactId: string
}) {
  const meta = TYPE_META[event.type]
  const Icon = meta.icon
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[1.85rem] top-1 size-3 rounded-full border-2 border-background",
          meta.dot,
        )}
      />
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            meta.className,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <TimelineRowBody event={event} contactId={contactId} />
        </div>
        <TimelineItemActions event={event} contactId={contactId} />
      </div>
    </li>
  )
}

function TimelineRowBody({
  event,
  contactId,
}: {
  event: TimelineEvent
  contactId: string
}) {
  switch (event.type) {
    case "interaction": {
      const ix = event.payload
      const others = (ix.attendees ?? []).filter((a) => a.id !== contactId)
      return (
        <>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {channelLabels[ix.channel] ?? ix.channel}
            </span>
            {others.length > 0 && (
              <span>
                with{" "}
                {others
                  .slice(0, 3)
                  .map((a) =>
                    [a.first_name, a.last_name].filter(Boolean).join(" "),
                  )
                  .join(", ")}
                {others.length > 3 && ` +${others.length - 3}`}
              </span>
            )}
            <span>·</span>
            <span>{formatDate(ix.occurred_at)}</span>
            <span>{formatTime(ix.occurred_at)}</span>
            {ix.duration_minutes != null && <span>{ix.duration_minutes}m</span>}
          </div>
          {ix.notes && (
            <MentionText
              text={ix.notes}
              className="text-sm mt-1 block whitespace-pre-wrap"
            />
          )}
        </>
      )
    }
    case "note": {
      const n = event.payload
      return (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Note</span>
            <span>·</span>
            <span>{formatDate(n.created_at)}</span>
            {n.updated_at !== n.created_at && (
              <span>edited {formatDate(n.updated_at)}</span>
            )}
          </div>
          <InlineTimelineNote note={n} />
        </>
      )
    }
    case "gift": {
      const g = event.payload
      return (
        <>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Gift: {g.name}</span>
            <span>·</span>
            <span>{formatDate(g.gift_date ?? g.created_at)}</span>
            {g.status && <Badge variant="outline">{g.status}</Badge>}
            {g.occasion && <span>{g.occasion}</span>}
            {g.value_amount != null && (
              <span>${g.value_amount.toFixed(2)}</span>
            )}
          </div>
          {g.description && (
            <p className="text-sm mt-1 whitespace-pre-wrap">{g.description}</p>
          )}
        </>
      )
    }
    case "life_event": {
      return <TimelineLifeEvent event={event.payload} />
    }
    case "debt": {
      const d = event.payload
      const settled = !!d.settled_at
      return (
        <>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {d.direction === "they_owe" ? "They owe" : "I owe"} $
              {d.amount.toFixed(2)}
            </span>
            <span>·</span>
            <span>{formatDate(d.settled_at ?? d.created_at)}</span>
            <Badge variant={settled ? "outline" : "secondary"}>
              {settled ? "Settled" : "Open"}
            </Badge>
          </div>
          {d.reason && (
            <p className="text-sm mt-1 whitespace-pre-wrap">{d.reason}</p>
          )}
        </>
      )
    }
  }
}

function TimelineLifeEvent({ event }: { event: LifeEventPublic }) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{event.title}</span>
          <span>·</span>
          <span>{formatDate(event.occurred_at)}</span>
          <Badge variant="outline">{event.event_type}</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${event.title}`}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
      {event.description && (
        <p className="text-sm mt-1 whitespace-pre-wrap">{event.description}</p>
      )}
      <EditLifeEventDialog
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}

function InlineTimelineNote({ note }: { note: NotePublic }) {
  const [isEditing, setIsEditing] = useState(false)
  const [body, setBody] = useState(note.body)
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (text: string) =>
      NotesService.updateNoteRoute({
        noteId: note.id,
        requestBody: { body: text },
      }),
    onSuccess: () => {
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ["notes", note.contact_id] })
    },
    onError: (err) =>
      showErrorToast(
        err instanceof Error ? err.message : "Failed to update note",
      ),
  })

  const cancel = () => {
    setBody(note.body)
    setIsEditing(false)
  }
  const trimmed = body.trim()
  const canSave = trimmed.length > 0 && !mutation.isPending

  if (isEditing) {
    return (
      <div className="mt-2 rounded-md border bg-muted/30 p-2">
        <MentionTextarea
          aria-label="Edit note"
          value={body}
          onChange={setBody}
          rows={3}
          autoFocus
          onKeyDown={(event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key === "Enter" &&
              canSave
            ) {
              event.preventDefault()
              mutation.mutate(trimmed)
            }
            if (event.key === "Escape" && !mutation.isPending) cancel()
          }}
        />
        <div className="mt-2 flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancel}
            disabled={mutation.isPending}
          >
            <X className="size-3.5" /> Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            loading={mutation.isPending}
            disabled={!canSave}
            onClick={() => mutation.mutate(trimmed)}
          >
            <Check className="size-3.5" /> Save
          </LoadingButton>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative mt-1 pr-8">
      <MentionText
        text={note.body}
        className="block text-sm whitespace-pre-wrap"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Edit note"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
    </div>
  )
}
