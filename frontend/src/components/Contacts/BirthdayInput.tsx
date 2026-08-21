import * as React from "react"
import { Check, ChevronDown, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn, formatBirthday } from "@/lib/utils"

export const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export function getDaysInMonth(monthStr: string): number {
  const m = Number(monthStr)
  if (!m) return 31
  if (m === 2) return 29 // Allow 29 for Feb to support leap day birthdays
  if ([4, 6, 9, 11].includes(m)) return 30
  return 31
}

export function parseBirthdayValue(value: string | null | undefined): {
  month: string
  day: string
  year: string
} {
  if (!value) return { month: "", day: "", year: "" }
  const str = value.trim()
  if (!str) return { month: "", day: "", year: "" }

  // YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (isoMatch) {
    const y = Number(isoMatch[1])
    const m = String(Number(isoMatch[2]))
    const d = String(Number(isoMatch[3]))
    const year = y >= 1900 ? String(y) : ""
    return { month: m, day: d, year }
  }

  // --MM-DD, -MM-DD, MM-DD, MM/DD
  const partialMatch = /^(?:--|-)?(\d{1,2})[-/](\d{1,2})$/.exec(str)
  if (partialMatch) {
    const m = String(Number(partialMatch[1]))
    const d = String(Number(partialMatch[2]))
    if (
      Number(m) >= 1 &&
      Number(m) <= 12 &&
      Number(d) >= 1 &&
      Number(d) <= 31
    ) {
      return { month: m, day: d, year: "" }
    }
  }

  return { month: "", day: "", year: "" }
}

export function formatBirthdayValue(
  month: string,
  day: string,
  year: string,
): string | null {
  if (!month || !day) return null
  const m = Number(month)
  const d = Number(day)
  if (Number.isNaN(m) || Number.isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31)
    return null

  const mm = String(m).padStart(2, "0")
  const dd = String(d).padStart(2, "0")

  const y = year ? Number(year) : null
  if (y != null && !Number.isNaN(y) && y >= 1900) {
    const yyyy = String(y).padStart(4, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  // Sentinel year 0001 (or 0004 for Feb 29 leap day)
  const sentinelYear = m === 2 && d === 29 ? "0004" : "0001"
  return `${sentinelYear}-${mm}-${dd}`
}

export interface BirthdayInputProps {
  value?: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  className?: string
  id?: string
  showClearButton?: boolean
}

export function BirthdayInput({
  value,
  onChange,
  disabled = false,
  className,
  id,
  showClearButton = true,
}: BirthdayInputProps) {
  const parsed = React.useMemo(() => parseBirthdayValue(value), [value])
  const [month, setMonth] = React.useState(parsed.month)
  const [day, setDay] = React.useState(parsed.day)
  const [year, setYear] = React.useState(parsed.year)
  const lastEmittedRef = React.useRef<string | null | undefined>(value)

  React.useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value
      const next = parseBirthdayValue(value)
      setMonth(next.month)
      setDay(next.day)
      setYear(next.year)
    }
  }, [value])

  const maxDays = React.useMemo(() => getDaysInMonth(month), [month])

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth)
    let validDay = day
    const nextMax = getDaysInMonth(newMonth)
    if (day && Number(day) > nextMax) {
      validDay = String(nextMax)
      setDay(validDay)
    }
    const formatted = formatBirthdayValue(newMonth, validDay, year)
    lastEmittedRef.current = formatted
    onChange(formatted)
  }

  const handleDayChange = (newDay: string) => {
    setDay(newDay)
    const formatted = formatBirthdayValue(month, newDay, year)
    lastEmittedRef.current = formatted
    onChange(formatted)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setYear(raw)
    const formatted = formatBirthdayValue(month, day, raw)
    lastEmittedRef.current = formatted
    onChange(formatted)
  }

  const handleClear = () => {
    setMonth("")
    setDay("")
    setYear("")
    lastEmittedRef.current = null
    onChange(null)
  }

  const hasValue = Boolean(month || day || year)

  const selectClassName =
    "border-input bg-transparent dark:bg-input/30 dark:hover:bg-input/50 h-9 rounded-xl border px-2 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer"

  return (
    <div className={cn("flex items-center gap-1.5 w-full", className)}>
      <div className="grid grid-cols-12 gap-1.5 w-full items-center flex-1">
        {/* Month selector */}
        <div className="relative col-span-5">
          <select
            id={id}
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={disabled}
            aria-label="Birthday month"
            className={cn(selectClassName, "w-full pr-5 appearance-none text-xs sm:text-sm")}
          >
            <option value="" className="text-muted-foreground bg-background">
              Month
            </option>
            {MONTHS.map((m) => (
              <option
                key={m.value}
                value={m.value}
                className="bg-background text-foreground"
              >
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3.5 opacity-50 absolute right-1.5 top-3 pointer-events-none" />
        </div>

        {/* Day selector */}
        <div className="relative col-span-3">
          <select
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            disabled={disabled}
            aria-label="Birthday day"
            className={cn(selectClassName, "w-full pr-4 appearance-none text-center text-xs sm:text-sm")}
          >
            <option value="" className="text-muted-foreground bg-background">
              Day
            </option>
            {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
              <option
                key={d}
                value={String(d)}
                className="bg-background text-foreground"
              >
                {d}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3.5 opacity-50 absolute right-1 top-3 pointer-events-none" />
        </div>

        {/* Year input (optional) */}
        <div className="col-span-4">
          <Input
            type="number"
            placeholder="Year (opt)"
            value={year}
            onChange={handleYearChange}
            disabled={disabled}
            aria-label="Birthday year"
            min={1900}
            max={new Date().getFullYear()}
            className="w-full h-9 rounded-xl px-2 text-xs sm:text-sm"
          />
        </div>
      </div>

      {hasValue && !disabled && showClearButton && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
          onClick={handleClear}
          aria-label="Clear birthday"
          title="Clear birthday"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

export interface InlineBirthdayProps {
  value: string | null
  onSave: (newValue: string | null) => Promise<void> | void
  placeholder?: string
  className?: string
  valueClassName?: string
  disabled?: boolean
}

export function InlineBirthday({
  value,
  onSave,
  placeholder = "+ Add birthday",
  className,
  valueClassName,
  disabled = false,
}: InlineBirthdayProps) {
  const [open, setOpen] = React.useState(false)
  const [tempValue, setTempValue] = React.useState<string | null>(value ?? null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [justSaved, setJustSaved] = React.useState(false)

  React.useEffect(() => {
    setTempValue(value ?? null)
  }, [value, open])

  const handleSave = async () => {
    if (tempValue === (value ?? null)) {
      setOpen(false)
      return
    }
    try {
      setIsSaving(true)
      await onSave(tempValue)
      setOpen(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch {
      setTempValue(value ?? null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setTempValue(null)
    try {
      setIsSaving(true)
      await onSave(null)
      setOpen(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    } catch {
      setTempValue(value ?? null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTempValue(value ?? null)
    setOpen(false)
  }

  const info = value ? formatBirthday(value) : null
  const displayLabel = info
    ? `${info.formatted}${info.age ? ` (${info.age}y)` : ""}`
    : value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer",
            !value &&
              "text-muted-foreground hover:text-foreground border border-dashed border-border/70 hover:border-border",
            justSaved && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            className,
          )}
        >
          <span className={cn("truncate", valueClassName)}>
            {displayLabel || placeholder}
          </span>
          {justSaved && <Check className="size-3.5 text-emerald-500 shrink-0 ml-0.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3.5 space-y-3" align="end">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Birthday
          </span>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleClear}
              disabled={isSaving}
              aria-label="Clear birthday"
            >
              Clear
            </Button>
          )}
        </div>

        <BirthdayInput
          value={tempValue}
          onChange={setTempValue}
          disabled={isSaving}
          showClearButton={false}
        />

        <div className="flex items-center justify-end gap-1.5 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Cancel editing birthday"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs px-3"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save birthday"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
