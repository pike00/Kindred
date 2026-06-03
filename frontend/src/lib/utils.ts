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
