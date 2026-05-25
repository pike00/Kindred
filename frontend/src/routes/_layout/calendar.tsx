import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { z } from "zod"

import { MonthCalendar } from "@/components/Calendar/MonthCalendar"
import { Skeleton } from "@/components/ui/skeleton"

const searchSchema = z.object({
  month: z.string().optional(),
})

export const Route = createFileRoute("/_layout/calendar")({
  component: CalendarPage,
  validateSearch: searchSchema,
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
