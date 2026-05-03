import { useSuspenseQuery } from "@tanstack/react-query"

import { RemindersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { EmptyState } from "@/components/Common/EmptyState"
import { Bell } from "@/lib/icons"
import { AddReminderDialog } from "./AddReminderDialog"
import { columns } from "./columns"

export const RemindersList = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["reminders"],
    queryFn: () => RemindersService.listReminders(),
  })

  const reminders = data?.data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Reminders
        </h1>
        {reminders.length > 0 && <AddReminderDialog />}
      </div>
      {reminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description="Set a reminder to follow up with a contact or revisit a task later."
          action={
            import.meta.env.DEV ? (
              <div className="flex flex-col items-center gap-2">
                <AddReminderDialog />
                <p className="text-xs text-muted-foreground">or</p>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                  disabled
                >
                  Seed demo reminders
                </button>
              </div>
            ) : (
              <AddReminderDialog />
            )
          }
        />
      ) : (
        <DataTable columns={columns} data={reminders} />
      )}
    </div>
  )
}
