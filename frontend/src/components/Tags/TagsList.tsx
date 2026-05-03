import { useSuspenseQuery } from "@tanstack/react-query"

import { TagsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { AddTagDialog } from "./AddTagDialog"
import { columns } from "./columns"

export const TagsList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["tags"],
    queryFn: () => TagsService.listTags(),
  })
  const [selectedTag, setSelectedTag] = useState<TagPublic | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Tags</h1>
        <AddTagDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
      <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Tags</h1>
        <AddTagDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
    </div>
    {selectedTag && (
      <TagShareDialog
        tag={selectedTag}
        open={!!selectedTag}
        onOpenChange={(open) => !open && setSelectedTag(null)}
      />
    )}
  )
}
