import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { type ContactPublic, ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GripVertical, Search, Users } from "@/lib/icons"
import {
  contactStagesQueryOptions,
  kanbanBoardQueryOptions,
} from "@/lib/queries"
import { cn } from "@/lib/utils"
import { AddContactDialog } from "./AddContactDialog"

const DEFAULT_STAGES = ["Active", "Dormant", "Lost", "Archived"]

function fullName(contact: ContactPublic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed contact"
  )
}

function SortableContactCard({
  contact,
  isDragging,
}: {
  contact: ContactPublic
  isDragging?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: contact.id,
    data: {
      type: "contact",
      contact,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-all cursor-grab",
        isDragging || isSortableDragging
          ? "opacity-50 shadow-lg"
          : "hover:-translate-y-px hover:border-primary/30 hover:shadow-sm",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
      <ContactAvatar contact={contact} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm truncate">{fullName(contact)}</div>
        {(contact.title || contact.company) && (
          <div className="text-xs text-muted-foreground truncate">
            {contact.title && contact.company
              ? `${contact.title} at ${contact.company}`
              : contact.title || contact.company}
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  contacts,
  isOver,
  onAddContact,
}: {
  stage: string
  contacts: ContactPublic[]
  isOver?: boolean
  onAddContact?: () => void
}) {
  const { setNodeRef } = useDroppable({
    id: stage,
    data: {
      type: "column",
      stage,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-80 flex-col rounded-2xl border bg-muted/30 transition-colors shrink-0",
        isOver && "bg-primary/5 border-primary/30",
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{stage}</h3>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
        {stage !== "Archived" && onAddContact && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onAddContact}
          >
            +
          </Button>
        )}
      </div>

      {/* Column Body - scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)]">
        <SortableContext
          items={contacts.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contacts.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              No contacts
            </div>
          ) : (
            contacts.map((contact) => (
              <SortableContactCard key={contact.id} contact={contact} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

export const KanbanBoard = () => {
  const [search, setSearch] = useState("")
  const [activeContact, setActiveContact] = useState<ContactPublic | null>(null)
  const queryClient = useQueryClient()

  // Fetch stages
  const { data: stagesData } = useSuspenseQuery(contactStagesQueryOptions())

  const stages = useMemo(() => {
    const serverStages = stagesData ?? []
    // Merge server stages with defaults
    const allStages = new Set([...DEFAULT_STAGES, ...serverStages])
    return Array.from(allStages)
  }, [stagesData])

  // Fetch kanban board data
  const { data: boardData, refetch } = useSuspenseQuery(
    kanbanBoardQueryOptions(search),
  )

  // Mutation for updating contact stage
  const updateStageMutation = useMutation({
    mutationFn: ({
      contactId,
      newStage,
    }: {
      contactId: string
      newStage: string
    }) =>
      ContactsService.updateContact({
        contactId,
        requestBody: { stage: newStage },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-board"] })
    },
    onError: (error) => {
      console.error("Failed to update contact stage:", error)
      toast.error("Failed to update contact stage. Please try again.")
      // Refetch to get correct state
      refetch()
    },
  })

  // Sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const contactId = active.id as string
      // Find the contact in the board data
      if (boardData) {
        for (const stage of Object.keys(boardData)) {
          const col = boardData[stage] as { data?: ContactPublic[] }
          const contact = col?.data?.find((c) => c.id === contactId)
          if (contact) {
            setActiveContact(contact)
            break
          }
        }
      }
    },
    [boardData],
  )

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback is handled by the droppable columns
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveContact(null)

      if (!over || !boardData) return

      const contactId = active.id as string
      const newStage = over.id as string

      // Find current stage of the contact
      let oldStage: string | undefined
      for (const stage of Object.keys(boardData)) {
        const col = boardData[stage] as { data?: ContactPublic[] }
        if (col?.data?.some((c) => c.id === contactId)) {
          oldStage = stage
          break
        }
      }

      if (!oldStage || oldStage === newStage) return

      // Optimistic update: move contact in local state
      // We'll refetch after the mutation
      updateStageMutation.mutate({ contactId, newStage })
    },
    [boardData, updateStageMutation],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1">Kanban Board</p>
        </div>
        <AddContactDialog />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-10"
        />
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const col = boardData?.[stage] as
              | { data?: ContactPublic[] }
              | undefined
            const contacts = col?.data ?? []
            return (
              <KanbanColumn key={stage} stage={stage} contacts={contacts} />
            )
          })}
        </div>

        <DragOverlay>
          {activeContact ? (
            <div className="w-72">
              <SortableContactCard contact={activeContact} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {(!boardData ||
        Object.values(boardData).every(
          (col) => (col as { data?: ContactPublic[] })?.data?.length === 0,
        )) &&
        !search && (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            description="Add your first contact to start tracking relationships."
            action={<AddContactDialog />}
          />
        )}
    </div>
  )
}
