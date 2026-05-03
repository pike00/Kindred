import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import { Suspense } from "react"
import { z } from "zod"

import { MonthCalendar } from "@/components/Calendar/MonthCalendar"
import { Skeleton } from "@/components/ui/skeleton"

const searchSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
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
  const navigate = useNavigate({ from: Route.fullPath })
  const current = month ?? format(new Date(), "yyyy-MM")

  return (
    <div className="container py-6">
      <Suspense fallback={<Skeleton className="h-96 max-w-2xl mx-auto" />}>
        <MonthCalendar
          month={current}
          onMonthChange={(next) =>
            navigate({ search: { month: next }, replace: true })
          }
        />
      </Suspense>
    </div>
  )
}
