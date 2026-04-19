import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"

import type { InteractionPublic } from "@/client"
import { InteractionsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { RowActionsMenu } from "@/components/Common/RowActionsMenu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import useCustomToast from "@/hooks/useCustomToast"
import {
  AtSign,
  Clock,
  Coffee,
  type LucideIcon,
  Mail,
  MessageSquare,
  MessagesSquare,
  MoreHorizontal,
  Phone,
  Trash2,
  Video,
} from "@/lib/icons"
import { cn } from "@/lib/utils"
import { AddInteractionDialog } from "./AddInteractionDialog"

type ChannelTone =
  | "blue"
  | "amber"
  | "green"
  | "rose"
  | "purple"
  | "teal"
  | "neutral"

const channelConfig: Record<
  string,
  { label: string; icon: LucideIcon; tone: ChannelTone }
> = {
  call: { label: "Call", icon: Phone, tone: "blue" },
  in_person: { label: "In person", icon: Coffee, tone: "amber" },
  text: { label: "Text", icon: MessageSquare, tone: "green" },
  email: { label: "Email", icon: Mail, tone: "rose" },
  video: { label: "Video", icon: Video, tone: "purple" },
  social: { label: "Social", icon: AtSign, tone: "teal" },
  other: { label: "Other", icon: MoreHorizontal, tone: "neutral" },
}

const toneClasses: Record<ChannelTone, string> = {
  blue: "bg-accent-blue text-accent-blue-fg",
  amber: "bg-accent-amber text-accent-amber-fg",
  green: "bg-accent-green text-accent-green-fg",
  rose: "bg-accent-rose text-accent-rose-fg",
  purple: "bg-accent-purple text-accent-purple-fg",
  teal: "bg-accent-teal text-accent-teal-fg",
  neutral: "bg-muted text-muted-foreground",
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
        <h1 className="text-3xl font-semibold tracking-tight">Interactions</h1>
        <AddInteractionDialog />
      </div>

      {interactions.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No interactions logged yet"
          description="Log a call, meeting, or message to start your timeline."
          action={<AddInteractionDialog />}
        />
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
  const ChannelIcon = channel.icon

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
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-md shrink-0",
            toneClasses[channel.tone],
          )}
          title={channel.label}
        >
          <ChannelIcon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{channel.label}</span>
            <span>·</span>
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
        <RowActionsMenu
          items={[
            {
              label: "Delete",
              icon: Trash2,
              variant: "destructive",
              onSelect: () => deleteMutation.mutate(),
            },
          ]}
        />
      </CardContent>
    </Card>
  )
}
