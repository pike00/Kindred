import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { type ContactPublic, ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Map as MapIcon,
  Search,
  Star,
  Users,
} from "@/lib/icons"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25

import { AddContactDialog } from "./AddContactDialog"

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
    </Link>
  )
}

export const ContactsList = () => {
  const navigate = useNavigate({ from: "/contacts" })
  const { search: urlSearch } = useSearch({ from: "/_layout/contacts/" })
  const [search, setSearch] = useState(urlSearch ?? "")
  const [pageIndex, setPageIndex] = useState(0)

  const { data } = useSuspenseQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
  })

  const allContacts = useMemo(() => data?.data ?? [], [data?.data])
  const filtered = useMemo(
    () => allContacts.filter((c) => matchesSearch(c, search)),
    [allContacts, search],
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
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/contacts/map">
              <MapIcon className="size-4" />
              Map View
            </a>
          </Button>
          <AddContactDialog />
        </div>
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
