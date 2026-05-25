import { useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"
import type { TagPublic } from "@/client"
import { TagsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { EmptyState } from "@/components/Common/EmptyState"
import { Tag } from "@/lib/icons"
import { useSeedDemo } from "@/lib/seed"
import { AddTagDialog } from "./AddTagDialog"
import { columns } from "./columns"

export const TagsList = () => {
  const seedMutation = useSeedDemo()

  const { data } = useSuspenseQuery({
    queryKey: ["tags"],
    queryFn: () => TagsService.listTags(),
  })
  const [_selectedTag, _setSelectedTag] = useState<TagPublic | null>(null)

  const tags = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Tags</h1>
        {tags.length > 0 && <AddTagDialog />}
      </div>
      {tags.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No tags yet"
          description="Create tags like 'college', 'book club', or 'runner' to organize your contacts."
          action={
            import.meta.env.DEV ? (
              <div className="flex flex-col items-center gap-2">
                <AddTagDialog />
                <p className="text-xs text-muted-foreground">or</p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  disabled={seedMutation.isPending}
                  onClick={() => seedMutation.mutate({ count: 8 })}
                >
                  {seedMutation.isPending ? "Seeding..." : "Seed demo tags"}
                </button>
              </div>
            ) : (
              <AddTagDialog />
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={tags} />
      )}
    </div>
  )
}
