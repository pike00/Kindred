import { Link } from "@tanstack/react-router"

import type { LucideIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

export type StatTone = "blue" | "amber" | "green" | "purple" | "rose" | "teal"

const toneClasses: Record<StatTone, string> = {
  blue: "bg-accent-blue text-accent-blue-fg",
  amber: "bg-accent-amber text-accent-amber-fg",
  green: "bg-accent-green text-accent-green-fg",
  purple: "bg-accent-purple text-accent-purple-fg",
  rose: "bg-accent-rose text-accent-rose-fg",
  teal: "bg-accent-teal text-accent-teal-fg",
}

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: number | string
  tone: StatTone
  to?: string
  className?: string
}

export function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  to,
  className,
}: StatTileProps) {
  const body = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </div>
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          toneClasses[tone],
        )}
      >
        <Icon className="size-5" />
      </div>
    </div>
  )

  const containerClass = cn(
    "rounded-xl border bg-card p-4 shadow-xs transition-colors",
    to && "hover:bg-accent/50",
    className,
  )

  if (to) {
    return (
      <Link to={to} className={containerClass}>
        {body}
      </Link>
    )
  }
  return <div className={containerClass}>{body}</div>
}
