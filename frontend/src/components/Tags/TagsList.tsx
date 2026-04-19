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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tags</h1>
        <AddTagDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
    </div>
  )
}
