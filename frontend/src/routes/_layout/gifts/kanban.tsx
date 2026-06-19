import {
  closestCenter,
  DndContext,
  type DragEndEvent,
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
import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { type GiftPublic, type GiftStatus, GiftsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Gift, GripVertical } from "@/lib/icons"
import { giftsKanbanQueryOptions } from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"
import { cn } from "@/lib/utils"

type KanbanColumn = {
  gifts: GiftKanbanCard[]
  count: number
  total_value: number
}
type KanbanBoard = Record<GiftStatus, KanbanColumn>

type GiftKanbanCard = {
  gift: GiftPublic & {
    contact_first_name?: string | null
    contact_last_name?: string | null
    days_until_occasion?: number | null
    contact_birthday?: string | null
  }
  is_overdue: boolean
  days_until_occasion?: number | null
}

export const Route = createFileRoute("/_layout/gifts/kanban")({
  component: GiftsKanbanPage,
  loader: () => queryClient.ensureQueryData(giftsKanbanQueryOptions()),
  head: () => ({
    meta: [{ title: "Gifts Kanban · Kindred" }],
  }),
})

const COLUMN_ORDER: GiftStatus[] = [
  "idea",
  "purchased",
  "wrapped",
  "given",
  "received",
]

const COLUMN_LABELS: Record<GiftStatus, string> = {
  idea: "Idea",
  purchased: "Purchased",
  wrapped: "Wrapped",
  given: "Given",
  received: "Received",
}

const COLUMN_COLORS: Record<GiftStatus, string> = {
  idea: "bg-slate-500",
  purchased: "bg-blue-500",
  wrapped: "bg-purple-500",
  given: "bg-green-500",
  received: "bg-amber-500",
}

function contactName(card: GiftKanbanCard): string {
  const first = card.gift.contact_first_name ?? ""
  const last = card.gift.contact_last_name ?? ""
  return [first, last].filter(Boolean).join(" ") || "Unknown contact"
}

function SortableGiftCard({
  card,
  isDragging,
}: {
  card: GiftKanbanCard
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
    id: card.gift.id,
    data: { type: "gift", card },
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-xl border bg-card p-3 shadow-xs transition-all cursor-grab",
        isDragging || isSortableDragging
          ? "opacity-50 shadow-lg"
          : "hover:-translate-y-px hover:border-primary/30 hover:shadow-sm",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-medium text-sm truncate">{card.gift.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {contactName(card)}
        </div>
        {card.gift.occasion && (
          <div className="text-xs text-muted-foreground truncate">
            {card.gift.occasion}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1">
          {card.gift.value_amount != null && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              ${card.gift.value_amount.toFixed(0)}
            </Badge>
          )}
          {card.days_until_occasion != null && (
            <Badge
              variant={card.is_overdue ? "destructive" : "outline"}
              className="text-xs px-1.5 py-0"
            >
              {card.is_overdue
                ? `${Math.abs(card.days_until_occasion)}d overdue`
                : `${card.days_until_occasion}d`}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function GiftColumn({
  status,
  cards,
  isOver,
}: {
  status: GiftStatus
  cards: GiftKanbanCard[]
  isOver?: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: status,
    data: { type: "column", status },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 flex-col rounded-2xl border bg-muted/30 transition-colors shrink-0",
        isOver && "bg-primary/5 border-primary/30",
      )}
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className={cn("size-2 rounded-full", COLUMN_COLORS[status])} />
        <h3 className="font-semibold text-sm">{COLUMN_LABELS[status]}</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {cards.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)]">
        <SortableContext
          items={cards.map((c) => c.gift.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              No gifts
            </div>
          ) : (
            cards.map((card) => (
              <SortableGiftCard key={card.gift.id} card={card} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

function GiftsKanbanPage() {
  const [activeCard, setActiveCard] = useState<GiftKanbanCard | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: rawBoardData, refetch } = useSuspenseQuery(
    giftsKanbanQueryOptions(),
  )
  const boardData = rawBoardData as KanbanBoard | undefined

  const changeStatusMutation = useMutation({
    mutationFn: ({
      giftId,
      newStatus,
    }: {
      giftId: string
      newStatus: GiftStatus
    }) => GiftsService.changeGiftStatus({ giftId, newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gifts-kanban"] })
    },
    onError: (error) => {
      console.error("Failed to update gift status:", error)
      toast.error("Failed to update gift status. Please try again.")
      refetch()
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const giftId = event.active.id as string
      if (!boardData) return
      for (const status of COLUMN_ORDER) {
        const col = boardData[status]
        const card = col?.gifts?.find((c) => c.gift.id === giftId)
        if (card) {
          setActiveCard(card)
          break
        }
      }
    },
    [boardData],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveCard(null)
      setOverColumn(null)
      if (!over || !boardData) return

      const giftId = active.id as string
      const newStatus = over.id as GiftStatus

      // Resolve current column
      let oldStatus: GiftStatus | undefined
      for (const status of COLUMN_ORDER) {
        const col = boardData[status]
        if (col?.gifts?.some((c) => c.gift.id === giftId)) {
          oldStatus = status
          break
        }
      }

      if (!oldStatus || oldStatus === newStatus) return
      changeStatusMutation.mutate({ giftId, newStatus })
    },
    [boardData, changeStatusMutation],
  )

  const totalGifts = COLUMN_ORDER.reduce(
    (sum, s) => sum + (boardData?.[s]?.count ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            Gifts
          </h1>
          <p className="text-muted-foreground mt-1">
            Kanban Board · {totalGifts} gift{totalGifts !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={(e) => setOverColumn(e.over ? String(e.over.id) : null)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMN_ORDER.map((status) => (
            <GiftColumn
              key={status}
              status={status}
              cards={boardData?.[status]?.gifts ?? []}
              isOver={overColumn === status}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-68">
              <SortableGiftCard card={activeCard} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {totalGifts === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Gift className="size-10 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            No gifts yet. Add gifts from a contact's detail page.
          </p>
        </div>
      )}
    </div>
  )
}
