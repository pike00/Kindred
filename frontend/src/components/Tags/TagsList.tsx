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
import { TagShareDialog } from "./TagShareDialog"

export const TagsList = () => {
  const seedMutation = useSeedDemo()

  const { data } = useSuspenseQuery({
    queryKey: ["tags"],
    queryFn: () => TagsService.listTags(),
  })
  const [selectedTag, setSelectedTag] = useState<TagPublic | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Tags</h1>
        {tags.length > 0 && <AddTagDialog />}
      </div>
      <DataTable columns={columns} data={data?.data || []} />
      {selectedTag && (
        <TagShareDialog
          tag={selectedTag}
          open={!!selectedTag}
          onOpenChange={(open) => !open && setSelectedTag(null)}
        />
      )}
    </div>
  )
}
