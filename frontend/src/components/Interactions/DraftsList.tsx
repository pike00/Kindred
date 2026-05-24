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
  Coffee,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Video,
} from "@/lib/icons"
import { cn } from "@/lib/utils"

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
  { label: string; icon: React.ElementType; tone: ChannelTone }
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

const draftSourceLabels: Record<string, string> = {
  voice_memo: "Voice Memo",
  email_suggestion: "Email Suggestion",
  manual: "Manual",
  import: "Import",
}

export const DraftsList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["drafts"],
    queryFn: () =>
      InteractionsService.listInteractions({ isDraft: true, limit: 200 }),
  })

  const queryClient = useQueryClient()
  const { showSuccessToast: showSuccess, showErrorToast: showError } = useCustomToast()

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      InteractionsService.confirmDraft({ interactionId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
      queryClient.invalidateQueries({ queryKey: ["interactions"] })
      showSuccess("Draft confirmed and promoted to interaction")
    },
    onError: () => {
      showError("Failed to confirm draft")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      InteractionsService.deleteInteraction({ interactionId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] })
      showSuccess("Draft deleted")
    },
    onError: () => {
      showError("Failed to delete draft")
    },
  })

  const interactions = data?.data || []
  const grouped = groupByDate(interactions)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (interactions.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No draft interactions"
        description="Draft interactions from voice memos, email suggestions, and imports will appear here."
      />
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {formatDate(date)}
          </h3>
          <Card>
            <CardContent className="divide-y">
              {grouped[date].map((ix) => {
                const ch = channelConfig[ix.channel] || channelConfig.other
                const Icon = ch.icon
                return (
                  <div
                    key={ix.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          toneClasses[ch.tone],
                        )}
                      >
                        <Icon className="size-3" />
                        {ch.label}
                      </span>
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatTime(ix.occurred_at)}
                          {ix.draft_source && (
                            <Badge variant="outline" className="ml-2">
                              {draftSourceLabels[ix.draft_source] ||
                                ix.draft_source}
                            </Badge>
                          )}
                        </div>
                        {ix.notes && (
                          <div className="text-muted-foreground line-clamp-2">
                            {ix.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <RowActionsMenu
                      items={[
                        {
                          label: "Confirm",
                          onSelect: () => confirmMutation.mutate(ix.id),
                          disabled: confirmMutation.isPending,
                        },
                        {
                          label: "Delete",
                          onSelect: () => deleteMutation.mutate(ix.id),
                          variant: "destructive",
                          disabled: deleteMutation.isPending,
                        },
                      ]}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
