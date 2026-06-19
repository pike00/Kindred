import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { RemindersList } from "@/components/Reminders/RemindersList"
import { Skeleton } from "@/components/ui/skeleton"
import { remindersQueryOptions } from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"

export const Route = createFileRoute("/_layout/reminders")({
  component: RemindersPage,
  loader: () => queryClient.ensureQueryData(remindersQueryOptions()),
})

function RemindersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <RemindersList />
    </Suspense>
  )
}
