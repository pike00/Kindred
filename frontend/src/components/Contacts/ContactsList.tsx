import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import type { ContactPublic } from "@/client"
import type { SavedFilterPublic } from "@/client/types.gen"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { AddContactDialog } from "@/components/Contacts/AddContactDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Archive,
  Clock,
  Map as MapIcon,
  Star,
  Trash2,
  Users,
} from "@/lib/icons"
import {
  contactsListInfiniteQueryOptions,
  savedFiltersQueryOptions,
} from "@/lib/queries"
import { useSeedDemo } from "@/lib/seed"
import { cn } from "@/lib/utils"

type BulkActionId =
  | "archive"
  | "unarchive"
  | "favorite"
  | "unfavorite"
  | "delete"
  | "export"

interface BulkContactRequest {
  operations: {
    set_is_archived?: boolean
    set_is_favorite?: boolean
  }
  contact_ids?: string[]
  select_all_filtered?: boolean
}

interface PreviewModalState {
  open: boolean
  action: BulkActionId | null
  count: number
  contacts: ContactPublic[]
}

const BULK_ACTIONS = [
  { id: "archive", label: "Archive", icon: Archive, color: "" },
  { id: "unarchive", label: "Unarchive", icon: Archive, color: "" },
  { id: "favorite", label: "Favorite", icon: Star, color: "" },
  { id: "unfavorite", label: "Unfavorite", icon: Star, color: "" },
  { id: "delete", label: "Delete", icon: Trash2, color: "text-destructive" },
  { id: "export", label: "Export CSV", icon: Users, color: "" },
]

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

function ContactRow({
  contact,
  selected,
  onToggle,
}: {
  contact: ContactPublic
  selected: boolean
  onToggle: (id: string) => void
}) {
  const days = daysSince(contact.last_contacted_at)
  const tags = contact.tags ?? []
  const visibleTags = tags.slice(0, 3)
  const extraTags = tags.length - visibleTags.length

  return (
    <div className="group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-sm">
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(contact.id)}
        aria-label={`Select ${fullName(contact)}`}
        onClick={(event) => event.stopPropagation()}
      />
      <Link
        to="/contacts/$contactId"
        params={{ contactId: contact.id }}
        className="flex min-w-0 flex-1 items-center gap-4"
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
    </div>
  )
}

export const ContactsList = () => {
  const seedMutation = useSeedDemo()

  const navigate = useNavigate({ from: "/contacts" })
  const { saved_filter_id: urlFilterId } = useSearch({
    from: "/_layout/contacts/",
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectAllFiltered, setSelectAllFiltered] = useState(false)
  const [previewModal, setPreviewModal] = useState<PreviewModalState>({
    open: false,
    action: null,
    count: 0,
    contacts: [],
  })
  const [isLoading, setIsLoading] = useState(false)

  // Fetch saved filters to find active filter name
  const { data: filtersData } = useSuspenseQuery(savedFiltersQueryOptions())

  const activeFilterId = urlFilterId
  const activeFilter = filtersData?.data?.find(
    (f: SavedFilterPublic) => f.id === activeFilterId,
  )

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetching,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(contactsListInfiniteQueryOptions(activeFilterId))
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const allContacts = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages],
  )
  const totalCount = data.pages[0]?.count ?? allContacts.length

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasNextPage || isFetching || isFetchNextPageError) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void fetchNextPage()
      },
      { rootMargin: "200px" },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetching])

  const selectedCount = selectedIds.size
  const isAllSelected =
    allContacts.length > 0 &&
    allContacts.every((c: ContactPublic) => selectedIds.has(c.id))
  const isSomeSelected = allContacts.some((c: ContactPublic) =>
    selectedIds.has(c.id),
  )

  const handleToggleAll = useCallback(() => {
    if (isAllSelected) {
      const newSelected = new Set(selectedIds)
      allContacts.forEach((c: ContactPublic) => {
        newSelected.delete(c.id)
      })
      setSelectedIds(newSelected)
    } else {
      const newSelected = new Set(selectedIds)
      allContacts.forEach((c: ContactPublic) => {
        newSelected.add(c.id)
      })
      setSelectedIds(newSelected)
    }
  }, [allContacts, selectedIds, isAllSelected])

  const handleToggle = useCallback(
    (id: string) => {
      const newSelected = new Set(selectedIds)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      setSelectedIds(newSelected)
    },
    [selectedIds],
  )

  const handleSelectAllFiltered = useCallback(async () => {
    if (selectAllFiltered) {
      setSelectedIds(new Set())
      setSelectAllFiltered(false)
    } else {
      // Preview how many contacts would be selected
      try {
        // TODO: backend bulk preview endpoint not yet implemented
        toast.error("Bulk select all is not yet supported")
        return
      } catch (_error) {
        toast.error("Failed to preview contacts")
      }
    }
  }, [selectAllFiltered])

  const handleExportCsv = useCallback(async () => {
    try {
      // Build query string
      const params = new URLSearchParams()
      if (selectAllFiltered) params.append("select_all_filtered", "true")

      // Get token from localStorage
      const token = localStorage.getItem("token") || ""

      const response = await fetch(
        `/api/v1/import-export/export/csv?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) throw new Error("Failed to export CSV")

      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "contacts.csv")
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success("CSV exported successfully")
    } catch (_error) {
      toast.error("Failed to export CSV")
    }
  }, [selectAllFiltered])

  const handleBulkAction = useCallback(
    async (actionId: BulkActionId) => {
      if (actionId === "export") {
        handleExportCsv()
        return
      }

      if (selectedCount === 0 && !selectAllFiltered) {
        toast.error("No contacts selected")
        return
      }

      setIsLoading(true)
      try {
        const operations: BulkContactRequest["operations"] = {}

        switch (actionId) {
          case "archive":
            operations.set_is_archived = true
            break
          case "unarchive":
            operations.set_is_archived = false
            break
          case "favorite":
            operations.set_is_favorite = true
            break
          case "unfavorite":
            operations.set_is_favorite = false
            break
          case "delete":
            operations.set_is_archived = true
            break
        }

        const body: BulkContactRequest = {
          operations,
          select_all_filtered: selectAllFiltered || undefined,
          contact_ids: selectAllFiltered ? undefined : Array.from(selectedIds),
        }

        // TODO: backend bulk update endpoint not yet implemented
        void body
        toast.error("Bulk operations are not yet supported")

        // Clear selection
        setSelectedIds(new Set())
        setSelectAllFiltered(false)
      } catch (_error) {
        toast.error("Bulk operation failed")
      } finally {
        setIsLoading(false)
        setPreviewModal({ open: false, action: null, count: 0, contacts: [] })
      }
    },
    [selectedCount, selectAllFiltered, selectedIds, handleExportCsv],
  )

  const handlePreviewAction = useCallback(
    (actionId: BulkActionId) => {
      if (actionId === "export") {
        handleExportCsv()
        return
      }
      setPreviewModal((prev) => ({ ...prev, open: true, action: actionId }))
    },
    [handleExportCsv],
  )

  const handleConfirmAction = useCallback(() => {
    if (previewModal.action) {
      handleBulkAction(previewModal.action)
    }
  }, [previewModal.action, handleBulkAction])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? "person" : "people"}
            {activeFilter && (
              <span className="text-primary">
                · Filtered by: {activeFilter.name}
                <button
                  type="button"
                  onClick={() => navigate({ search: {} })}
                  className="ml-2 text-xs underline"
                >
                  Clear filter
                </button>
              </span>
            )}
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

      {/* Bulk Action Bar */}
      {selectedCount > 0 || selectAllFiltered ? (
        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-2xl border">
          <Button variant="outline" size="sm" onClick={handleSelectAllFiltered}>
            {selectAllFiltered ? (
              <>Deselect All ({previewModal.count})</>
            ) : (
              <>Select All Filtered</>
            )}
          </Button>
          <div className="h-6 w-px bg-border" />
          {BULK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              onClick={() => handlePreviewAction(action.id as BulkActionId)}
              className={action.color}
            >
              <action.icon className="size-4 mr-2" />
              {action.label}
            </Button>
          ))}
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedIds(new Set())
              setSelectAllFiltered(false)
            }}
          >
            Clear Selection
          </Button>
        </div>
      ) : null}

      {allContacts.length > 0 && (
        <div className="flex items-center gap-2 px-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleToggleAll}
            aria-label="Select all loaded contacts"
            {...(isSomeSelected && !isAllSelected
              ? { indeterminate: true }
              : {})}
          />
          <span className="text-sm text-muted-foreground">
            {isAllSelected
              ? "All loaded contacts selected"
              : "Select all loaded contacts"}
          </span>
        </div>
      )}

      {allContacts.length > 0 ? (
        <div className="space-y-2">
          {allContacts.map((contact: ContactPublic) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              selected={selectedIds.has(contact.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start tracking relationships."
          action={
            import.meta.env.DEV ? (
              <div className="flex flex-col items-center gap-2">
                <AddContactDialog />
                <p className="text-xs text-muted-foreground">or</p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  disabled={seedMutation.isPending}
                  onClick={() => seedMutation.mutate({ count: 8 })}
                >
                  {seedMutation.isPending ? "Seeding..." : "Seed demo contacts"}
                </button>
              </div>
            ) : (
              <AddContactDialog />
            )
          }
        />
      )}

      {hasNextPage && (
        <div
          ref={loadMoreRef}
          className="flex flex-col items-center gap-2 pt-2"
        >
          {isFetchNextPageError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load more contacts.
            </p>
          )}
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetching}
          >
            {isFetchingNextPage
              ? "Loading more..."
              : isFetchNextPageError
                ? "Retry loading contacts"
                : "Load more contacts"}
          </Button>
        </div>
      )}

      {!hasNextPage && allContacts.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          All {totalCount} {totalCount === 1 ? "contact" : "contacts"} loaded
        </p>
      )}

      {/* Preview/Confirm Modal */}
      <Dialog
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              {previewModal.action === "delete" ? (
                <>
                  This will archive{" "}
                  <strong>{previewModal.count || selectedCount}</strong>{" "}
                  contacts. This action cannot be undone.
                </>
              ) : (
                <>
                  This will apply the "
                  <strong>
                    {
                      BULK_ACTIONS.find((a) => a.id === previewModal.action)
                        ?.label
                    }
                  </strong>
                  " action to{" "}
                  <strong>{previewModal.count || selectedCount}</strong>{" "}
                  contacts.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setPreviewModal({
                  open: false,
                  action: null,
                  count: 0,
                  contacts: [],
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isLoading}
              className={
                previewModal.action === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : undefined
              }
            >
              {isLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
