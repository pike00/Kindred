import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  Clock,
  Hash,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Trash2,
  Users,
  Video,
} from "lucide-react"
import type { InteractionPublic } from "@/client"
import { InteractionsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useCustomToast from "@/hooks/useCustomToast"
import { AddInteractionDialog } from "./AddInteractionDialog"

const channelConfig: Record<string, { label: string; icon: React.ReactNode }> =
  {
    call: { label: "Call", icon: <Phone className="size-4" /> },
    in_person: { label: "In Person", icon: <Users className="size-4" /> },
    text: { label: "Text", icon: <MessageCircle className="size-4" /> },
    email: { label: "Email", icon: <Mail className="size-4" /> },
    video: { label: "Video", icon: <Video className="size-4" /> },
    social: { label: "Social", icon: <Hash className="size-4" /> },
    other: { label: "Other", icon: <MessageCircle className="size-4" /> },
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

function groupByDate(
  interactions: InteractionPublic[],
): Record<string, InteractionPublic[]> {
  const groups: Record<string, InteractionPublic[]> = {}
  for (const ix of interactions) {
    const date = new Date(ix.occurred_at).toISOString().split("T")[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(ix)
  }
  return groups
}

export const InteractionTimeline = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["interactions"],
    queryFn: () => InteractionsService.listInteractions({ limit: 200 }),
  })

  const interactions = data?.data || []
  const grouped = groupByDate(interactions)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Interactions</h1>
        <AddInteractionDialog />
      </div>

      {interactions.length === 0 ? (
        <p className="text-muted-foreground">No interactions logged yet.</p>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => (
            <div key={date}>
              <h2 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                {formatDate(date)}
              </h2>
              <div className="space-y-2 border-l-2 border-muted pl-4 ml-2">
                {grouped[date].map((ix) => (
                  <InteractionCard key={ix.id} interaction={ix} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InteractionCard({
  interaction: ix,
}: {
  interaction: InteractionPublic
}) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const channel = channelConfig[ix.channel] || channelConfig.other

  const deleteMutation = useMutation({
    mutationFn: () =>
      InteractionsService.deleteInteraction({ interactionId: ix.id }),
    onSuccess: () => {
      showSuccessToast("Interaction deleted")
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
    },
    onError: () => showErrorToast("Failed to delete"),
  })

  return (
    <Card className="relative py-3">
      <div className="absolute -left-[1.65rem] top-4 size-3 rounded-full bg-primary border-2 border-background" />
      <CardContent className="flex items-start gap-3">
        <Badge variant="outline" className="shrink-0 gap-1">
          {channel.icon}
          {channel.label}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(ix.occurred_at)}</span>
            {ix.duration_minutes != null && (
              <span className="flex items-center gap-0.5">
                <Clock className="size-3" />
                {ix.duration_minutes}m
              </span>
            )}
            {ix.mood && (
              <Badge variant="secondary" className="text-xs">
                {ix.mood}
              </Badge>
            )}
          </div>
          {ix.notes && (
            <p className="text-sm mt-1 whitespace-pre-wrap">{ix.notes}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => deleteMutation.mutate()}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
