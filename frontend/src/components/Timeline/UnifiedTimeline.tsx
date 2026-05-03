import { format, parseISO, isWithinInterval } from "date-fns"
import { useQuery } from "@tanstack/react-query"
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
import { MentionText } from "@/components/Mentions/MentionText"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CalendarHeart,
  Clock,
  HeartHandshake,
  type LucideIcon,
  MessagesSquare,
  NotebookPen,
} from "@/lib/icons"
import { cn } from "@/lib/utils"

type TimelineEventType = "interaction" | "note" | "gift" | "life_event" | "debt"

type TimelineEvent =
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
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" /> Timeline
          {!isLoading && events.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          )}
        </CardTitle>
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
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {visible.length === 0
              ? events.length === 0
                ? "Nothing here yet. Log an interaction or capture a note to get started."
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
            {ix.mood && (
              <Badge variant="secondary" className="text-xs">
                {ix.mood}
              </Badge>
            )}
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
          <MentionText
            text={n.body}
            className="text-sm mt-1 block whitespace-pre-wrap"
          />
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
      const le = event.payload
      return (
        <>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{le.title}</span>
            <span>·</span>
            <span>{formatDate(le.occurred_at)}</span>
            <Badge variant="outline">{le.event_type}</Badge>
          </div>
          {le.description && (
            <p className="text-sm mt-1 whitespace-pre-wrap">{le.description}</p>
          )}
        </>
      )
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
