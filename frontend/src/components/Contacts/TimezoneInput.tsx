import { Check, ChevronsUpDown } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { lookupCities } from "@/lib/cityTimezones"
import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TIMEZONES: string[] = (Intl as any).supportedValuesOf("timeZone")

function cityLabel(tz: string): string {
  const parts = tz.split("/")
  return parts[parts.length - 1].replace(/_/g, " ")
}

function getOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date())
    return parts.find((p) => p.type === "timeZoneName")?.value ?? ""
  } catch {
    return ""
  }
}

// Parse "UTC-3", "GMT+5:30", "+05:30", "-0300" → IANA timezone string or null
function parseUtcOffset(input: string): string | null {
  const stripped = input.trim().replace(/^(UTC|GMT)\s*/i, "")
  const m = stripped.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/)
  if (!m) return null
  const sign = m[1] === "-" ? -1 : 1
  const hours = parseInt(m[2], 10)
  const minutes = parseInt(m[3] ?? "0", 10)
  if (hours > 14 || minutes > 59) return null
  if (minutes !== 0) return null // non-whole-hour offsets need a real IANA name

  // Etc/GMT uses inverted sign convention (Etc/GMT+3 = UTC-3)
  const etcTz = `Etc/GMT${sign === 1 ? "-" : "+"}${hours}`
  try {
    new Intl.DateTimeFormat("en", { timeZone: etcTz })
    return etcTz
  } catch {
    return null
  }
}

type TzOption = { tz: string; city: string; offset: string }
type RenderOption = TzOption & { key: string }

const BASE_OPTIONS: TzOption[] = ALL_TIMEZONES.map((tz) => ({
  tz,
  city: cityLabel(tz),
  offset: getOffset(tz),
}))

interface TimezoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TimezoneInput({
  value,
  onChange,
  placeholder,
}: TimezoneInputProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = useMemo<RenderOption[]>(() => {
    const q = search.toLowerCase().replace(/[\s_]/g, "")
    if (!q) return BASE_OPTIONS.slice(0, 60).map((o) => ({ ...o, key: o.tz }))

    const out: RenderOption[] = []
    const seenTz = new Set<string>()

    // 1) UTC offset synthetic (e.g. "UTC-5", "+05:30")
    const resolved = parseUtcOffset(search)
    if (resolved) {
      out.push({
        key: `utc-${resolved}`,
        tz: resolved,
        city: "UTC offset",
        offset: getOffset(resolved),
      })
      seenTz.add(resolved)
    }

    // 2) Broad city-name / country / region matches (e.g. "Pakistan" -> Asia/Karachi)
    for (const { city, tz } of lookupCities(search)) {
      if (!seenTz.has(tz)) {
        out.push({ key: `city-${city}`, tz, city, offset: getOffset(tz) })
        seenTz.add(tz)
      }
    }

    // Parse potential numeric offset query (e.g. "GMT+5", "UTC+5", "+5", "+05:00")
    const normSearch = search.trim().toLowerCase()
    const offsetMatch = normSearch.match(
      /^(?:gmt|utc)?\s*([+-]?\d{1,2}(?::?\d{2})?)$/i,
    )
    const rawOffsetQuery = offsetMatch ? offsetMatch[1] : null
    const signedOffsetQuery = rawOffsetQuery
      ? rawOffsetQuery.startsWith("+") || rawOffsetQuery.startsWith("-")
        ? rawOffsetQuery
        : `+${rawOffsetQuery}`
      : null

    // 3) IANA zone id / zone-city / offset matches
    for (const m of BASE_OPTIONS) {
      if (out.length >= 60) break
      if (seenTz.has(m.tz)) continue

      const tzNorm = m.tz.toLowerCase().replace(/[\s_/]/g, "")
      const cityNorm = m.city.toLowerCase().replace(/\s/g, "")
      const offsetNorm = m.offset.toLowerCase().replace(/\s/g, "") // e.g. "gmt+5"

      const matchesTz = tzNorm.includes(q)
      const matchesCity = cityNorm.includes(q)
      const matchesOffset =
        offsetNorm.includes(q) ||
        (signedOffsetQuery !== null &&
          (offsetNorm.replace(/^(gmt|utc)/, "") === signedOffsetQuery ||
            offsetNorm.replace(/^(gmt|utc)/, "").startsWith(signedOffsetQuery)))

      if (matchesTz || matchesCity || matchesOffset) {
        out.push({ ...m, key: `tz-${m.tz}` })
        seenTz.add(m.tz)
      }
    }

    return out
  }, [search])

  const displayLabel = value
    ? `${cityLabel(value)} (${getOffset(value)})`
    : (placeholder ?? "Search city or timezone…")

  function handleSelect(tz: string) {
    onChange(tz)
    setOpen(false)
    setSearch("")
  }

  function handleOpenChange(o: boolean) {
    setOpen(o)
    if (!o) setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="City, America/New_York, UTC-5…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {filtered.map(({ key, tz, city, offset }) => (
                <CommandItem
                  key={key}
                  value={`${key} ${city} ${tz}`}
                  onSelect={() => handleSelect(tz)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === tz ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{city}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {offset}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Utility: format current time in a given IANA timezone
export function formatLocalTime(tz: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date())
  } catch {
    return null
  }
}
