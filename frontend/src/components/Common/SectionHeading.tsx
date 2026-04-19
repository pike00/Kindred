import type { ReactNode } from "react"

import type { LucideIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  icon: LucideIcon
  title: string
  count?: number
  action?: ReactNode
  className?: string
}

export function SectionHeading({
  icon: Icon,
  title,
  count,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className="size-4 text-primary" />
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {count != null && (
        <span className="text-sm text-muted-foreground">{count}</span>
      )}
      {action != null && <div className="ml-auto">{action}</div>}
    </div>
  )
}
