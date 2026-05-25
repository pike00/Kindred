import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo } from "react"

import {
  type ContactPublic,
  ContactsService,
  SavedFiltersService,
} from "@/client"
import type { SavedFilterPublic } from "@/client/types.gen"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
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
import { Input } from "@/components/ui/input"
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clock,
  Map as MapIcon,
  Search,
  Star,
  Trash2,
  Users,
} from "@/lib/icons"
import { useSeedDemo } from "@/lib/seed"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25

import { useState } from "react"

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
    contact.pronouns,
    contact.company,
    contact.title,
    ...(contact.tags?.map((t) => t.name) ?? []),
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
          {contact.pronouns && (
            <span className="text-xs text-muted-foreground">
              ({contact.pronouns})
            </span>
          )}
          {titleLine(contact) && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              · {titleLine(contact)}
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
  const { search: urlSearch, saved_filter_id: urlFilterId } = useSearch({
    from: "/_layout/contacts/",
  })
  const [search, setSearch] = useState(urlSearch ?? "")
  const [pageIndex, setPageIndex] = useState(0)
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
  const { data: filtersData } = useSuspenseQuery({
    queryKey: ["saved-filters"],
    queryFn: () =>
      SavedFiltersService.listSavedFilters().then((res) => res.data),
  })

  const activeFilterId = urlFilterId
  const activeFilter = filtersData?.data?.find(
    (f: SavedFilterPublic) => f.id === activeFilterId,
  )

  const { data } = useSuspenseQuery({
    queryKey: ["contacts", activeFilterId],
    queryFn: () =>
      ContactsService.listContacts(
        activeFilterId ? { saved_filter_id: activeFilterId as any } : {},
      ),
  })

  const allContacts = useMemo(() => data?.data ?? [], [data?.data])
  const filtered = useMemo(
    () => allContacts.filter((c: ContactPublic) => matchesSearch(c, search)),
    [allContacts, search],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const paged = filtered.slice(
    safePageIndex * PAGE_SIZE,
    (safePageIndex + 1) * PAGE_SIZE,
  )

  const selectedCount = selectedIds.size
  const isAllSelected =
    paged.length > 0 && paged.every((c: ContactPublic) => selectedIds.has(c.id))
  const isSomeSelected = paged.some((c: ContactPublic) => selectedIds.has(c.id))

  const handleToggleAll = useCallback(() => {
    if (isAllSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedIds)
      paged.forEach((c: ContactPublic) => {
        newSelected.delete(c.id)
      })
      setSelectedIds(newSelected)
    } else {
      // Select all on current page
      const newSelected = new Set(selectedIds)
      paged.forEach((c: ContactPublic) => {
        newSelected.add(c.id)
      })
      setSelectedIds(newSelected)
    }
  }, [paged, selectedIds, isAllSelected])

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
        const result = await ContactsService.previewBulkContacts({
          search: search || undefined,
        })
        setPreviewModal({
          open: true,
          action: null,
          count: result.count ?? 0,
          contacts: result.data ?? [],
        })
        setSelectAllFiltered(true)
      } catch (_error) {
        toast.error("Failed to preview contacts")
      }
    }
  }, [search, selectAllFiltered])

  const handleExportCsv = useCallback(async () => {
    try {
      // Build query string
      const params = new URLSearchParams()
      if (selectAllFiltered) params.append("select_all_filtered", "true")
      if (search) params.append("search", search)

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
  }, [selectAllFiltered, search])

  const handleUndo = useCallback(
    async (undoData: { ids: string[]; action: BulkActionId }) => {
      // Reverse the action
      const operations: BulkContactRequest["operations"] = {}
      switch (undoData.action) {
        case "archive":
          operations.set_is_archived = false
          break
        case "unarchive":
          operations.set_is_archived = true
          break
        case "favorite":
          operations.set_is_favorite = false
          break
        case "unfavorite":
          operations.set_is_favorite = true
          break
      }
      try {
        await ContactsService.bulkUpdateContacts({
          requestBody: {
            contact_ids: undoData.ids,
            operations,
          },
        })
        toast.success("Undo successful")
      } catch (_error) {
        toast.error("Undo failed")
      }
    },
    [],
  )

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
          filters: selectAllFiltered
            ? {
                search: search || undefined,
              }
            : undefined,
        }

        const result = await ContactsService.bulkUpdateContacts({
          requestBody: body,
        })
        toast.success(`Updated ${result.updated_count} contacts`, {
          action: {
            label: "Undo",
            onClick: () => {
              const ids = selectAllFiltered
                ? filtered.map((c: ContactPublic) => c.id)
                : Array.from(selectedIds)
              handleUndo({ ids, action: actionId })
            },
          },
        })
        if (result.failed_ids && result.failed_ids.length > 0) {
          toast.error(`Failed to update ${result.failed_ids.length} contacts`)
        }

        // Clear selection and refresh
        setSelectedIds(new Set())
        setSelectAllFiltered(false)
      } catch (_error) {
        toast.error("Bulk operation failed")
      } finally {
        setIsLoading(false)
        setPreviewModal({ open: false, action: null, count: 0, contacts: [] })
      }
    },
    [
      selectedCount,
      selectAllFiltered,
      selectedIds,
      search,
      handleExportCsv,
      handleUndo,
      filtered.map,
    ],
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
            {allContacts.length}{" "}
            {allContacts.length === 1 ? "person" : "people"}
            {activeFilter && (
              <span className="text-primary">
                · Filtered by: {activeFilter.name}
                <button
                  type="button"
                  onClick={() => navigate({ search: search ? { search } : {} })}
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

      {/* Select all checkbox for current page */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleToggleAll}
            aria-label="Select all on this page"
            {...(isSomeSelected && !isAllSelected
              ? { indeterminate: true }
              : {})}
          />
          <span className="text-sm text-muted-foreground">
            {isAllSelected ? "All on page selected" : "Select all on this page"}
          </span>
        </div>
      )}

      {paged.length > 0 ? (
        <div className="space-y-2">
          {paged.map((contact: ContactPublic) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              selected={selectedIds.has(contact.id)}
              onToggle={handleToggle}
            />
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
