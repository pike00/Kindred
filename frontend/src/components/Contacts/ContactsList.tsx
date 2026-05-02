import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Users } from "lucide-react"
import { useMemo, useState } from "react"
import { type ContactPublic, ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Search,
  Star,
  Video,
} from "@/lib/icons"

const CHANNELS = [
  { value: "call", label: "Call", icon: Phone },
  { value: "in_person", label: "In Person", icon: Users },
  { value: "text", label: "Text", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "video", label: "Video", icon: Video },
  { value: "social", label: "Social", icon: Users },
  { value: "other", label: "Other", icon: Pencil },
] as const

const CHANNEL_OPTIONS = [
  { value: "", label: "All Channels" },
  ...CHANNELS.map((c) => ({ value: c.value, label: c.label })),
]

const CHANNEL_ICON_MAP: Record<string, React.ReactNode> = Object.fromEntries(
  CHANNELS.map((c) => [c.value, <c.icon key={c.value} className="size-3" />]),
)

import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { AddContactDialog } from "./AddContactDialog"

const PAGE_SIZE = 25

function fullName(contact: ContactPublic): string {
  return (
    [
      contact.prefix,
      contact.first_name,
      contact.middle_name,
      contact.last_name,
      contact.suffix,
    ]
      .filter(Boolean)
      .join(" ") || "Unnamed contact"
  )
}

function titleLine(contact: ContactPublic): string {
  if (contact.title && contact.company)
    return `${contact.title} at ${contact.company}`
  if (contact.title) return contact.title
  if (contact.company) return contact.company
  return ""
}

function matchesSearch(contact: ContactPublic, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const haystack = [
    contact.first_name,
    contact.last_name,
    contact.middle_name,
    contact.nickname,
    contact.company,
    contact.title,
    ...(contact.tags?.map((t) => t.name) ?? []),
    ...(contact.groups?.map((g) => g.name) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function lastContactTone(days: number | null): string {
  if (days == null) return "text-muted-foreground"
  if (days >= 60) return "text-accent-rose-fg font-medium"
  if (days >= 30) return "text-accent-amber-fg font-medium"
  return "text-muted-foreground"
}

function ContactRow({ contact }: { contact: ContactPublic }) {
  const days = daysSince(contact.last_contacted_at)
  const tags = contact.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const extraTags = tags.length - visibleTags.length

  return (
    <Link
      to="/contacts/$contactId"
      params={{ contactId: contact.id }}
      className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-sm"
    >
      <ContactAvatar contact={contact} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-base font-semibold tracking-tight truncate">
            {fullName(contact)}
          </span>
          {titleLine(contact) && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              · {titleLine(contact)}
            </span>
          )}
          {contact.is_favorite && (
            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
          )}

          {contact.communication_preference?.do_not_contact && (
            <Badge variant="destructive" className="text-xs">
              DNC
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              lastContactTone(days),
            )}
          >
            <Clock className="size-3" />
            {days == null
              ? "No interactions yet"
              : `${days}d since last contact`}
          </span>
        </div>
      </div>
      <div className="hidden md:flex shrink-0 items-center gap-1.5">
        {visibleTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="text-xs">
            {tag.name}
          </Badge>
        ))}
        {extraTags > 0 && (
          <Badge variant="outline" className="text-xs">
            +{extraTags}
          </Badge>
        )}
      </div>
      {contact.communication_preference?.preferred_channel && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {CHANNEL_ICON_MAP[contact.communication_preference.preferred_channel]}
          <span>
            {CHANNELS.find(
              (c) =>
                c.value === contact.communication_preference?.preferred_channel,
            )?.label ?? contact.communication_preference.preferred_channel}
          </span>
        </div>
      )}
    </Link>
  )
}

export const ContactsList = () => {
  const navigate = useNavigate({ from: "/contacts" })
  const { search: urlSearch } = useSearch({ from: "/_layout/contacts/" })
  const [search, setSearch] = useState(urlSearch ?? "")
  const [pageIndex, setPageIndex] = useState(0)

  const [channelFilter, setChannelFilter] = useState<string>("")
  const [showDncOnly, setShowDncOnly] = useState(false)

  const { data } = useSuspenseQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
  })

  const allContacts = useMemo(() => data?.data ?? [], [data?.data])
  const filtered = useMemo(
    () =>
      allContacts
        .filter((c) => matchesSearch(c, search))
        .filter((c) => {
          if (
            channelFilter &&
            c.communication_preference?.preferred_channel !== channelFilter
          ) {
            return false
          }
          if (showDncOnly && !c.communication_preference?.do_not_contact) {
            return false
          }
          return true
        }),
    [allContacts, search, channelFilter, showDncOnly],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const paged = filtered.slice(
    safePageIndex * PAGE_SIZE,
    (safePageIndex + 1) * PAGE_SIZE,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1">
            {allContacts.length}{" "}
            {allContacts.length === 1 ? "person" : "people"}
          </p>
        </div>
        <AddContactDialog />
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by channel" />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showDncOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDncOnly(!showDncOnly)}
        >
          DNC Only
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            const next = e.target.value
            setSearch(next)
            setPageIndex(0)
            navigate({
              search: next ? { search: next } : {},
              replace: true,
            })
          }}
          placeholder="Search by name, company, or tag..."
          className="pl-10"
        />
      </div>

      {paged.length > 0 ? (
        <div className="space-y-2">
          {paged.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </div>
      ) : search ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`Nothing matches "${search}".`}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start tracking relationships."
          action={<AddContactDialog />}
        />
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Page {safePageIndex + 1} of {pageCount} · {filtered.length} result
            {filtered.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
              disabled={safePageIndex === 0}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setPageIndex((i) => Math.min(pageCount - 1, i + 1))
              }
              disabled={safePageIndex >= pageCount - 1}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
