import { useQuery } from "@tanstack/react-query"
import { GiftsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CircleCheck, Gift, Package } from "@/lib/icons"

interface KanbanBoardProps {
  contactId?: string
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
    icon: CircleCheck,
    color: "bg-green-100 text-green-800",
  },
  received: {
    label: "Received",
    icon: Gift,
    color: "bg-gray-100 text-gray-800",
  },
}

export function KanbanBoard({ contactId }: KanbanBoardProps) {
  const { isLoading } = useQuery({
    queryKey: ["kanban-board", contactId],
    queryFn: async () => {
      const data = contactId
        ? await GiftsService.listGifts({ contactId })
        : { data: [], count: 0 }
      return data
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

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
