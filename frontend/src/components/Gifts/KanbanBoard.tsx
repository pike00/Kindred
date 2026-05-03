import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle, Clock, Gift, Package } from "lucide-react"
import { useState } from "react"
import { type GiftPublic, type GiftStatus, GiftsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface KanbanBoardProps {
  contactId?: string
}

interface GiftCardProps {
  gift: GiftPublic
  isOverdue?: boolean
  daysUntilOccasion?: number | null
}

const statusConfig = {
  idea: { label: "Ideas", icon: Gift, color: "bg-blue-100 text-blue-800" },
  purchased: {
    label: "Purchased",
    icon: Package,
    color: "bg-yellow-100 text-yellow-800",
  },
  wrapped: {
    label: "Wrapped",
    icon: Gift,
    color: "bg-purple-100 text-purple-800",
  },
  given: {
    label: "Given",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800",
  },
  received: {
    label: "Received",
    icon: Gift,
    color: "bg-gray-100 text-gray-800",
  },
}

function _GiftCard({ gift, isOverdue, daysUntilOccasion }: GiftCardProps) {
  return (
    <Card className={`mb-3 ${isOverdue ? "border-red-500 border-2" : ""}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-sm">{gift.name}</h4>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>
        {gift.value_amount && (
          <p className="text-sm text-muted-foreground">
            ${gift.value_amount.toFixed(2)}
          </p>
        )}
        {daysUntilOccasion !== null && daysUntilOccasion !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            <Clock className="w-3 h-3 inline mr-1" />
            {daysUntilOccasion} days until occasion
          </p>
        )}
        {gift.occasion && (
          <Badge variant="outline" className="mt-2 text-xs">
            {gift.occasion}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

export function KanbanBoard({ contactId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [_kanbanData, _setKanbanData] = useState<Record<string, any> | null>(
    null,
  )

  const { isLoading } = useQuery({
    queryKey: ["kanban-board", contactId],
    queryFn: async () => {
      const data = contactId
        ? await GiftsService.listGifts({ contactId })
        : // For now, we'll use the contact endpoint; kanban endpoint can be added later
          { data: [], count: 0 }
      return data
    },
  })

  const _changeStatusMutation = useMutation({
    mutationFn: ({
      giftId,
      newStatus,
    }: {
      giftId: string
      newStatus: GiftStatus
    }) => GiftsService.changeStatusGifts({ giftId, requestBody: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-board"] })
      queryClient.invalidateQueries({ queryKey: ["gifts"] })
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  // For now, display a simple message since we need to implement the full kanban board
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gift Kanban Board</h2>
      <p className="text-muted-foreground">
        The Kanban board is being implemented. New status values (Purchased,
        Wrapped) have been added to the backend. The full drag-and-drop
        interface will be available soon.
      </p>
      <div className="grid grid-cols-5 gap-4 mt-6">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon
          return (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {config.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={config.color}>{status}</Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
