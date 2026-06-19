import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { z } from "zod"

import { MonthCalendar } from "@/components/Calendar/MonthCalendar"
import { Skeleton } from "@/components/ui/skeleton"
import { calendarMonthQueryOptions } from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"

const searchSchema = z.object({
  month: z.string().optional(),
})

export const Route = createFileRoute("/_layout/calendar")({
  component: CalendarPage,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ deps }) =>
    queryClient.ensureQueryData(
      calendarMonthQueryOptions(
        deps.month ?? new Date().toISOString().slice(0, 7),
      ),
    ),
  head: () => ({
    meta: [{ title: "Calendar · Kindred" }],
  }),
})

function CalendarPage() {
  const { month } = Route.useSearch()
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MonthCalendar month={month ?? currentMonth} />
      </Suspense>
    </div>
  )
}
