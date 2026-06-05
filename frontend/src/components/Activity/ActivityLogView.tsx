import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { type ActivityLogPublic, ActivityLogsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity } from "@/lib/icons"
import { formatDateWithRelative } from "@/lib/utils"

const ACTION_TONE: Record<string, string> = {
  create: "bg-accent-teal text-accent-teal-fg",
  created: "bg-accent-teal text-accent-teal-fg",
  update: "bg-accent-blue text-accent-blue-fg",
  updated: "bg-accent-blue text-accent-blue-fg",
  delete: "bg-accent-rose text-accent-rose-fg",
  deleted: "bg-accent-rose text-accent-rose-fg",
  restore: "bg-accent-amber text-accent-amber-fg",
  restored: "bg-accent-amber text-accent-amber-fg",
}

function humanizeEntity(entityType: string): string {
  return entityType.replace(/_/g, " ")
}

function changedFields(changes: Record<string, unknown> | null): string[] {
  if (!changes) return []
  // Audit rows commonly store { field: { old, new } } or a flat field->value map.
  return Object.keys(changes)
}

function ActivityRow({ entry }: { entry: ActivityLogPublic }) {
  const tone = ACTION_TONE[entry.action.toLowerCase()] ?? "bg-muted text-foreground"
  const fields = changedFields(entry.changes_json)
  const isContact = entry.entity_type === "contact"

  return (
    <div className="flex items-start gap-3 py-3">
      <Badge className={tone} variant="secondary">
        {entry.action}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium capitalize">
            {humanizeEntity(entry.entity_type)}
          </span>{" "}
          {isContact ? (
            <Link
              to="/contacts/$contactId"
              params={{ contactId: entry.entity_id }}
              className="text-primary underline-offset-2 hover:underline"
            >
              {entry.entity_id.slice(0, 8)}
            </Link>
          ) : (
            <span className="text-muted-foreground">
              {entry.entity_id.slice(0, 8)}
            </span>
          )}
        </p>
        {fields.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fields.length === 1
              ? `changed ${fields[0]}`
              : `changed ${fields.length} fields: ${fields.slice(0, 6).join(", ")}${
                  fields.length > 6 ? "…" : ""
                }`}
          </p>
        )}
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {formatDateWithRelative(entry.occurred_at)}
      </time>
    </div>
  )
}

export function ActivityLogView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => ActivityLogsService.listActivityLogs({ limit: 100 }),
  })

  const entries = data?.data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          A running log of changes across your contacts and records.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Activity}
          title="Couldn't load activity"
          description="Something went wrong fetching the activity log. Please try again."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="As you create, edit, and delete contacts and records, those changes will show up here."
        />
      ) : (
        <Card>
          <CardContent className="divide-y py-0">
            {entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
