import { useSuspenseQuery } from "@tanstack/react-query"

import { JournalService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { AddJournalDialog } from "./AddJournalDialog"
import { columns } from "./columns"

export const JournalList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["journal"],
    queryFn: () => JournalService.listJournalEntries(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Journal
        </h1>
        <AddJournalDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
    </div>
  )
}
