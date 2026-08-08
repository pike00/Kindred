import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { Activity, ChevronDown, ChevronUp, X } from "lucide-react"
import { useEffect, useState } from "react"
import { ContactsService } from "@/client"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Intensity color scale (5 steps) for both light and dark modes.
 * Each step: [light-mode-color, dark-mode-color]
 */
const INTENSITY_COLORS: [string, string][] = [
  ["#f0f0f0", "#1a1a1a"], // 0 interactions (barely visible)
  ["#d4d4d4", "#333333"], // 1 interaction
  ["#888888", "#666666"], // 2-3 interactions
  ["#444444", "#999999"], // 4-5 interactions
  ["#111111", "#e0e0e0"], // 6+ interactions
]

function getIntensityStep(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const startMonth = start.toLocaleDateString(undefined, { month: "short" })
  const endMonth = end.toLocaleDateString(undefined, { month: "short" })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = start.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

interface HeatmapCellProps {
  weekStart: string
  count: number
  onClick?: (weekStart: string, count: number) => void
}

function HeatmapCell({ weekStart, count, onClick }: HeatmapCellProps) {
  const step = getIntensityStep(count)
  const [lightColor, darkColor] = INTENSITY_COLORS[step]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onClick?.(weekStart, count)}
          className="w-3.5 h-3.5 rounded-sm transition-colors hover:ring-1 hover:ring-ring"
          aria-label={`Week of ${formatWeekRange(weekStart)}: ${count} interaction${count !== 1 ? "s" : ""}`}
        >
          <span
            className="block w-full h-full rounded-sm dark:hidden"
            style={{ backgroundColor: lightColor }}
          />
          <span
            className="hidden w-full h-full rounded-sm dark:block"
            style={{ backgroundColor: darkColor }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>{formatWeekRange(weekStart)}</p>
        <p className="font-semibold">
          {count} interaction{count !== 1 ? "s" : ""}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

interface InteractionHeatmapProps {
  onWeekClick?: (weekStart: string, weekEnd: string, count: number) => void
  heatmapFilter?: { startDate: string; endDate: string } | null
  clearHeatmapFilter?: () => void
  defaultExpanded?: boolean
}

export function InteractionHeatmap({
  onWeekClick,
  heatmapFilter,
  clearHeatmapFilter,
  defaultExpanded = false,
}: InteractionHeatmapProps) {
  const { contactId } = useParams({ from: "/_layout/contacts/$contactId" })
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Auto-expand if a week filter is active
  useEffect(() => {
    if (heatmapFilter) {
      setIsExpanded(true)
    }
  }, [heatmapFilter])

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", contactId, "heatmap"],
    queryFn: () =>
      ContactsService.getContactHeatmap({ contactId: contactId as any }),
  })

  if (isLoading) {
    return (
      <div className="h-7 w-48 bg-muted/50 animate-pulse rounded-md mt-2" />
    )
  }

  if (error || !data?.data) {
    return null
  }

  const buckets = data.data
  const totalInteractions = buckets.reduce((acc, b) => acc + b.count, 0)

  // Group weeks into rows of ~13 weeks (quarterly view)
  const rows: (typeof buckets)[] = []
  for (let i = 0; i < buckets.length; i += 13) {
    rows.push(buckets.slice(i, i + 13))
  }

  const handleWeekClick = (weekStart: string, count: number) => {
    if (count === 0) return
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    onWeekClick?.(weekStart, end.toISOString(), count)
  }

  if (!isExpanded) {
    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 hover:bg-muted/70 border border-border/50 text-xs text-muted-foreground transition-all group"
        >
          <Activity className="size-3.5 text-muted-foreground group-hover:text-foreground" />
          <span className="font-medium text-foreground">
            {totalInteractions}{" "}
            {totalInteractions === 1 ? "interaction" : "interactions"}
          </span>
          <span>(past 52w)</span>

          {/* Mini Sparkline preview: last 16 weeks */}
          <div className="flex gap-[2px] items-center ml-1 opacity-85">
            {buckets.slice(-16).map((bucket, idx) => {
              const step = getIntensityStep(bucket.count)
              const [lightColor, darkColor] = INTENSITY_COLORS[step]
              return (
                <span
                  key={idx}
                  className="w-1.5 h-2.5 rounded-[1px] inline-block"
                >
                  <span
                    className="block w-full h-full dark:hidden rounded-[1px]"
                    style={{ backgroundColor: lightColor }}
                  />
                  <span
                    className="hidden w-full h-full dark:block rounded-[1px]"
                    style={{ backgroundColor: darkColor }}
                  />
                </span>
              )
            })}
          </div>

          <ChevronDown className="size-3.5 ml-0.5 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div className="pt-2">
      <div className="p-3 rounded-lg border bg-card/60 space-y-2.5 max-w-fit">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h3 className="text-sm font-medium">Interaction Activity</h3>
            <span className="text-xs text-muted-foreground font-normal">
              ({totalInteractions} total across 52 weeks)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>Less</span>
              {INTENSITY_COLORS.map(([light, dark], i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-sm">
                  <span
                    className="block w-full h-full rounded-sm dark:hidden"
                    style={{ backgroundColor: light }}
                  />
                  <span
                    className="hidden w-full h-full rounded-sm dark:block"
                    style={{ backgroundColor: dark }}
                  />
                </div>
              ))}
              <span>More</span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse heatmap"
            >
              <ChevronUp className="size-4" />
            </button>
          </div>
        </div>

        {heatmapFilter && (
          <div className="flex items-center gap-2 text-xs bg-muted/60 px-2.5 py-1 rounded-md text-muted-foreground">
            <span>
              Filtered to week of{" "}
              {new Date(heatmapFilter.startDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {clearHeatmapFilter && (
              <button
                type="button"
                onClick={clearHeatmapFilter}
                className="inline-flex items-center gap-1 underline hover:text-foreground ml-auto font-medium"
              >
                <X className="size-3" /> Clear filter
              </button>
            )}
          </div>
        )}

        <div className="space-y-0.5">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5">
              {row.map((bucket, colIndex) => (
                <HeatmapCell
                  key={colIndex}
                  weekStart={bucket.week_start}
                  count={bucket.count}
                  onClick={handleWeekClick}
                />
              ))}
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Click any active week square to filter timeline events
        </p>
      </div>
    </div>
  )
}
