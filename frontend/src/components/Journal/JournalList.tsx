import { useSuspenseQuery } from "@tanstack/react-query"

import { JournalService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { columns } from "./columns"
import { AddJournalDialog } from "./AddJournalDialog"

export const JournalList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["journal"],
    queryFn: () => JournalService.listJournalEntries(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Journal</h1>
        <AddJournalDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
    </div>
  )
}
