import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import type { VCardConflictPublic } from "@/client"
import { VCardConflictsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { queryClient } from "@/lib/queryClient"
import { formatDateWithRelative } from "@/lib/utils"

function getConflictsQueryOptions() {
  return {
    queryFn: () =>
      VCardConflictsService.listVcardConflicts({ skip: 0, limit: 100 }),
    queryKey: ["vcard-conflicts"],
  }
}

export const Route = createFileRoute("/_layout/admin/vcard-conflicts")({
  component: VCardConflictsPage,
  loader: () => queryClient.ensureQueryData(getConflictsQueryOptions()),
})

function VCardConflictsPage() {
  return (
    <Suspense fallback={<div>Loading conflicts...</div>}>
      <VCardConflictsContent />
    </Suspense>
  )
}

function VCardConflictsContent() {
  const { data: conflicts } = useSuspenseQuery(getConflictsQueryOptions())
  const [resolving, setResolving] = useState<string | null>(null)

  const handleResolve = async (
    conflictId: string,
    resolutionType: "keep_local" | "accept_remote",
  ) => {
    setResolving(conflictId)
    try {
      await VCardConflictsService.resolveVcardConflict({
        conflictId,
        resolutionType,
      })
      toast.success(
        `Conflict ${resolutionType === "keep_local" ? "kept local version" : "accepted remote version"}`,
      )
      // Refetch
      window.location.reload()
    } catch (_error) {
      toast.error("Failed to resolve conflict")
    } finally {
      setResolving(null)
    }
  }

  const handleDelete = async (conflictId: string) => {
    setResolving(conflictId)
    try {
      await VCardConflictsService.deleteVcardConflict({ conflictId })
      toast.success("Conflict dismissed")
      window.location.reload()
    } catch (_error) {
      toast.error("Failed to dismiss conflict")
    } finally {
      setResolving(null)
    }
  }

  if (!conflicts?.data?.length) {
    return (
      <div>
        <h2 className="text-lg font-semibold">vCard Conflicts</h2>
        <p className="text-sm text-muted-foreground mt-2">
          No pending vCard sync conflicts.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">vCard Conflicts</h2>
        <p className="text-sm text-muted-foreground">
          Review and resolve vCard sync conflicts detected during CardDAV
          updates.
        </p>
      </div>

      <div className="grid gap-4">
        {conflicts.data.map((conflict: VCardConflictPublic) => (
          <ConflictCard
            key={conflict.id}
            conflict={conflict}
            onResolve={handleResolve}
            onDelete={handleDelete}
            resolving={resolving}
          />
        ))}
      </div>
    </div>
  )
}

function ConflictCard({
  conflict,
  onResolve,
  onDelete,
  resolving,
}: {
  conflict: VCardConflictPublic
  onResolve: (id: string, type: "keep_local" | "accept_remote") => void
  onDelete: (id: string) => void
  resolving: string | null
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Conflict for Contact: {conflict.contact_id}
          </CardTitle>
          <Badge variant="destructive">Pending</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Detected: {formatDateWithRelative(conflict.created_at)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Local vCard</h4>
            <Textarea
              readOnly
              value={conflict.local_vcard_raw || "N/A"}
              className="font-mono text-xs h-48"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hash: {conflict.local_hash}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Incoming vCard</h4>
            <Textarea
              readOnly
              value={conflict.incoming_vcard_raw}
              className="font-mono text-xs h-48"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Hash: {conflict.incoming_hash}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve(conflict.id, "keep_local")}
            disabled={resolving === conflict.id}
          >
            Keep Local
          </Button>
          <Button
            size="sm"
            onClick={() => onResolve(conflict.id, "accept_remote")}
            disabled={resolving === conflict.id}
          >
            Accept Remote
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(conflict.id)}
            disabled={resolving === conflict.id}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
