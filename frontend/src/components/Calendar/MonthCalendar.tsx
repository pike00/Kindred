import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"

import type { CalendarEntry } from "@/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Cake, CalendarHeart, ChevronLeft, ChevronRight } from "@/lib/icons"
import { calendarMonthQueryOptions } from "@/lib/queries"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseYM(yyyyMm: string): [number, number] {
  const [y, m] = yyyyMm.split("-")
  return [+y, +m]
}

function prevMo(yyyyMm: string): string {
  const [y, m] = parseYM(yyyyMm)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
}

function nextMo(yyyyMm: string): string {
  const [y, m] = parseYM(yyyyMm)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`
}

function calendarCells(year: number, month: number): (number | null)[] {
  const leading = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  return [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
}

function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function entryDotClass(type: string): string {
  return type === "birthday" ? "bg-rose-500" : "bg-violet-500"
}

export function MonthCalendar({ month }: { month: string }) {
  const [year, mo] = parseYM(month)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const { data } = useSuspenseQuery(calendarMonthQueryOptions(month))

  const today = new Date().toISOString().slice(0, 10)
  const monthName = new Date(year, mo - 1, 1).toLocaleString("default", {
    month: "long",
  })
  const cells = calendarCells(year, mo)
  const days = data.days ?? {}

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/calendar" search={{ month: prevMo(month) }}>
          <Button variant="ghost" size="icon" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-lg font-semibold">
          {monthName} {year}
        </h2>
        <Link to="/calendar" search={{ month: nextMo(month) }}>
          <Button variant="ghost" size="icon" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {label}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const key = isoDay(year, mo, day)
          const entries = days[key] ?? []
          const isToday = key === today
          const isSelected = key === selectedDay

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : key)}
              className={cn(
                "rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isToday && "ring-2 ring-primary ring-offset-1",
                isSelected && "bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {day}
              </span>
              {entries.length > 0 && (
                <div className="mt-1 flex flex-wrap items-end gap-0.5">
                  {entries.slice(0, 3).map((entry, j) => (
                    <span
                      key={j}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        entryDotClass(entry.type),
                      )}
                    />
                  ))}
                  {entries.length > 3 && (
                    <span className="text-[10px] leading-none text-muted-foreground">
                      +{entries.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <DrillDown day={selectedDay} entries={days[selectedDay] ?? []} />
      )}
    </div>
  )
}

function DrillDown({
  day,
  entries,
}: {
  day: string
  entries: CalendarEntry[]
}) {
  const formatted = new Date(`${day}T00:00:00`).toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-semibold mb-3">{formatted}</p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on this day.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry, i) => (
              <li key={i}>
                <Link
                  to="/contacts/$contactId"
                  params={{ contactId: entry.contact_id }}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                      entryDotClass(entry.type),
                    )}
                  >
                    {entry.type === "birthday" ? (
                      <Cake className="h-3.5 w-3.5" />
                    ) : (
                      <CalendarHeart className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {entry.type === "birthday"
                        ? "Birthday"
                        : entry.type.replace(/_/g, " ")}
                      {entry.age != null && entry.type === "birthday" && (
                        <> · turns {entry.age}</>
                      )}
                      {entry.age != null && entry.type !== "birthday" && (
                        <>
                          {" "}
                          · {entry.age === 1 ? "1 year" : `${entry.age} years`}
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
