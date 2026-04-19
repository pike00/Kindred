import { useSuspenseQuery } from "@tanstack/react-query"

import { RemindersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { AddReminderDialog } from "./AddReminderDialog"
import { columns } from "./columns"

export const RemindersList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["reminders"],
    queryFn: () => RemindersService.listReminders(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reminders</h1>
        <AddReminderDialog />
      </div>
      <DataTable columns={columns} data={data?.data || []} />
    </div>
  )
}
