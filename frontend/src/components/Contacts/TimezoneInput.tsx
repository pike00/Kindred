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
import { cn } from "@/lib/utils"

const ALL_TIMEZONES: string[] = Intl.supportedValuesOf("timeZone")

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().replace(/[\s_]/g, "")
    if (!q) return BASE_OPTIONS.slice(0, 60)

    // Check if input looks like a UTC offset and inject a synthetic option
    const synthetic: TzOption[] = []
    const resolved = parseUtcOffset(search)
    if (resolved) {
      synthetic.push({
        tz: resolved,
        city: `UTC offset`,
        offset: getOffset(resolved),
      })
    }

    const matches = BASE_OPTIONS.filter(({ tz, city }) => {
      const tzNorm = tz.toLowerCase().replace(/[\s_/]/g, "")
      const cityNorm = city.toLowerCase().replace(/\s/g, "")
      return tzNorm.includes(q) || cityNorm.includes(q)
    }).slice(0, 60)

    // Dedupe synthetic vs matches
    const deduped = synthetic.filter((s) => !matches.some((m) => m.tz === s.tz))
    return [...deduped, ...matches]
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
        <Command>
          <CommandInput
            placeholder="City, America/New_York, UTC-5…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {filtered.map(({ tz, city, offset }) => (
                <CommandItem
                  key={tz}
                  value={tz}
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
