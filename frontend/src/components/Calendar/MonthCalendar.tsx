import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { format } from "date-fns"
import * as React from "react"

import type { CalendarEntry } from "@/client"
import { CalendarService } from "@/client"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Cake, CalendarHeart } from "@/lib/icons"
import { cn } from "@/lib/utils"

const isoDay = (d: Date) => format(d, "yyyy-MM-dd")
const monthKey = (d: Date) => format(d, "yyyy-MM")

function dotColor(type: string): string {
  return type === "birthday" ? "bg-rose-500" : "bg-violet-500"
}

function entryIcon(type: string) {
  return type === "birthday" ? Cake : CalendarHeart
}

type DayLookup = Record<string, CalendarEntry[]>

const DayLookupContext = React.createContext<DayLookup>({})

function EventDayButton(props: React.ComponentProps<typeof CalendarDayButton>) {
  const lookup = React.useContext(DayLookupContext)
  const events = lookup[isoDay(props.day.date)] ?? []
  const visible = events.slice(0, 3)
  const overflow = events.length - visible.length

  return (
    <CalendarDayButton {...props}>
      <span>{props.day.date.getDate()}</span>
      {events.length > 0 && (
        <div className="flex items-center gap-0.5 mt-0.5 h-1.5">
          {visible.map((e, i) => (
            <span
              key={`${e.contact_id}-${e.type}-${i}`}
              className={cn("h-1.5 w-1.5 rounded-full", dotColor(e.type))}
              aria-hidden
            />
          ))}
          {overflow > 0 && (
            <span className="text-[8px] leading-none text-muted-foreground">
              +{overflow}
            </span>
          )}
        </div>
      )}
    </CalendarDayButton>
  )
}

interface MonthCalendarProps {
  month: string
  onMonthChange: (next: string) => void
}

export function MonthCalendar({ month, onMonthChange }: MonthCalendarProps) {
  const [year, mo] = month.split("-").map(Number)
  const monthDate = React.useMemo(() => new Date(year, mo - 1, 1), [year, mo])
  const [selected, setSelected] = React.useState<Date | undefined>()

  const { data } = useSuspenseQuery({
    queryKey: ["calendar", month],
    queryFn: () => CalendarService.getCalendarMonth({ yyyyMm: month }),
  })

  const lookup: DayLookup = data.days ?? {}
  const selectedEntries = selected ? (lookup[isoDay(selected)] ?? []) : []

  const modifiers = React.useMemo(() => {
    const birthdays: Date[] = []
    const events: Date[] = []
    for (const [iso, entries] of Object.entries(lookup)) {
      const [y, m, d] = iso.split("-").map(Number)
      const date = new Date(y, m - 1, d)
      if (entries.some((e) => e.type === "birthday")) birthdays.push(date)
      if (entries.some((e) => e.type !== "birthday")) events.push(date)
    }
    return { hasBirthday: birthdays, hasEvent: events }
  }, [lookup])

  return (
    <DayLookupContext.Provider value={lookup}>
      <div className="space-y-4">
        <Calendar
          mode="single"
          month={monthDate}
          onMonthChange={(next) => {
            setSelected(undefined)
            onMonthChange(monthKey(next))
          }}
          selected={selected}
          onSelect={setSelected}
          modifiers={modifiers}
          showOutsideDays={false}
          className="rounded-md border [--cell-size:--spacing(12)] mx-auto w-fit"
          components={{ DayButton: EventDayButton }}
        />

        {selected && <DayDrillDown date={selected} entries={selectedEntries} />}
      </div>
    </DayLookupContext.Provider>
  )
}

function DayDrillDown({
  date,
  entries,
}: {
  date: Date
  entries: CalendarEntry[]
}) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="space-y-2 py-4">
        <h3 className="text-sm font-semibold">
          {format(date, "EEEE, MMMM d, yyyy")}
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on this day.</p>
        ) : (
          <ul className="space-y-1">
            {entries.map((e, i) => {
              const Icon = entryIcon(e.type)
              const ageLabel =
                e.age == null
                  ? null
                  : e.type === "birthday"
                    ? `turns ${e.age}`
                    : `${e.age} ${e.age === 1 ? "year" : "years"}`
              return (
                <li key={`${e.contact_id}-${i}`}>
                  <Link
                    to="/contacts/$contactId"
                    params={{ contactId: e.contact_id }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {e.type.replace(/_/g, " ")}
                    </span>
                    {ageLabel && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {ageLabel}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
