import { useSuspenseQuery } from "@tanstack/react-query"

import { GroupsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { AddGroupDialog } from "./AddGroupDialog"
import { columns } from "./columns"

export const GroupsList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["groups"],
    queryFn: () => GroupsService.listGroups(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Groups
        </h1>
        <AddGroupDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
    </div>
  )
}
