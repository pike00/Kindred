import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ISO calendar date (YYYY-MM-DD) from an ISO timestamp or date string. */
export function formatDateISO(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Coarse relative estimate: "today", "in 3 days", "about 2 weeks ago". */
export function relativeEstimate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = d.getTime() - now.getTime()
  const days = Math.round(Math.abs(diffMs) / 86_400_000)
  if (days === 0) return "today"
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"}`
  let est: string
  if (days < 7) est = plural(days, "day")
  else if (days < 30) est = `about ${plural(Math.round(days / 7), "week")}`
  else if (days < 365) est = `about ${plural(Math.round(days / 30), "month")}`
  else est = `about ${plural(Math.round(days / 365), "year")}`
  return diffMs <= 0 ? `${est} ago` : `in ${est}`
}

/** "YYYY-MM-DD (about 2 weeks ago)" — ISO date plus a relative estimate. */
export function formatDateWithRelative(
  iso: string,
  now: Date = new Date(),
): string {
  const isoDate = formatDateISO(iso)
  const rel = relativeEstimate(iso, now)
  return rel ? `${isoDate} (${rel})` : isoDate
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** Parsed birthday with current age and a friendly upcoming-birthday phrase. */
export interface BirthdayInfo {
  /** "June 12, 1959", or "June 12" when no usable year is present. */
  formatted: string
  /** Current age in whole years, or null when the birth year is unknown. */
  age: number | null
  /** Age reached on the next birthday, or null when the birth year is unknown. */
  nextAge: number | null
  /** Whole days until the next occurrence of the birthday. */
  daysUntil: number
  /** "turns 67 today", "turning 67 in 6 days", "next birthday in 2 weeks". */
  upcoming: string
}

/**
 * Parse a `YYYY-MM-DD` birthday into a display string, current age, and a
 * countdown phrase. Returns null if the date can't be parsed. Components are
 * parsed by hand (not `new Date(iso)`) to avoid the UTC-midnight off-by-one in
 * negative-offset timezones.
 */
export function formatBirthday(
  birthday: string,
  now: Date = new Date(),
): BirthdayInfo | null {
  const parts = birthday.split("-").map(Number)
  if (parts.length < 2 || parts.some(Number.isNaN)) return null
  const dd = parts[parts.length - 1]
  const mm = parts[parts.length - 2]
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null

  const rawYear = parts.length >= 3 ? parts[0] : null
  const hasYear =
    rawYear != null && rawYear >= 1900 && rawYear <= now.getFullYear()
  const formatted = hasYear
    ? `${MONTH_NAMES[mm - 1]} ${dd}, ${rawYear}`
    : `${MONTH_NAMES[mm - 1]} ${dd}`

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, mm - 1, dd)
  }
  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)

  // Age they reach on the next birthday; current age is one less until then.
  const nextAge = hasYear ? next.getFullYear() - (rawYear as number) : null
  const age = nextAge == null ? null : daysUntil === 0 ? nextAge : nextAge - 1

  return {
    formatted,
    age,
    nextAge,
    daysUntil,
    upcoming: birthdayCountdown(daysUntil, nextAge),
  }
}

/** "turns 67 today" / "turning 67 in 6 days" / "next birthday in 2 weeks". */
function birthdayCountdown(days: number, nextAge: number | null): string {
  if (days === 0)
    return nextAge == null ? "birthday today" : `turns ${nextAge} today`
  if (days === 1)
    return nextAge == null ? "birthday tomorrow" : `turns ${nextAge} tomorrow`

  let when: string
  if (days < 7) when = `in ${days} days`
  else if (days < 45) {
    const weeks = Math.round(days / 7)
    when = `in ${weeks} week${weeks === 1 ? "" : "s"}`
  } else {
    const months = Math.round(days / 30)
    when = `in ${months} month${months === 1 ? "" : "s"}`
  }
  return nextAge == null
    ? `next birthday ${when}`
    : `turning ${nextAge} ${when}`
}
