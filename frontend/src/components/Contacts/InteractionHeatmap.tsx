import { useQuery } from "@tanstack/react-query"
import { useParams } from "@tanstack/react-router"
import { ContactsService } from "@/client"
import { useTheme } from "@/components/theme-provider"
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
  const { resolvedTheme } = useTheme()
  const color = resolvedTheme === "dark" ? darkColor : lightColor

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onClick?.(weekStart, count)}
          className="w-3.5 h-3.5 rounded-sm transition-colors hover:ring-1 hover:ring-ring"
          style={{ backgroundColor: color }}
          aria-label={`Week of ${formatWeekRange(weekStart)}: ${count} interaction${count !== 1 ? "s" : ""}`}
        />
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
}

export function InteractionHeatmap({ onWeekClick }: InteractionHeatmapProps) {
  const { contactId } = useParams({ from: "/_layout/contacts/$contactId" })

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", contactId, "heatmap"],
    queryFn: () =>
      ContactsService.getContactHeatmap({ contactId: contactId as any }),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-52 gap-0.5">
          {Array.from({ length: 52 }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-sm bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data?.data) {
    return null
  }

  const buckets = data.data

  // Group weeks into rows of ~13 weeks (quarterly view)
  const rows: (typeof buckets)[] = []
  for (let i = 0; i < buckets.length; i += 13) {
    rows.push(buckets.slice(i, i + 13))
  }

  const handleWeekClick = (weekStart: string, count: number) => {
    if (count === 0) return
    // Calculate week end (Sunday)
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    onWeekClick?.(weekStart, end.toISOString(), count)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Interaction Activity</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          {INTENSITY_COLORS.map(([light, _dark], i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm dark:hidden"
              style={{ backgroundColor: light }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

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

      <p className="text-xs text-muted-foreground">
        Last 52 weeks of interaction activity
      </p>
    </div>
  )
}
