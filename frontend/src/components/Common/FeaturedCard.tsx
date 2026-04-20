import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type Tone = "amber" | "blue" | "green" | "rose"

interface FeaturedCardProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

const toneBorder: Record<Tone, string> = {
  amber: "border-accent-amber",
  blue: "border-accent-blue",
  green: "border-accent-green",
  rose: "border-accent-rose",
}

const toneGradient: Record<Tone, string> = {
  amber:
    "bg-[radial-gradient(circle_at_top_right,var(--accent-amber),transparent_65%)]",
  blue: "bg-[radial-gradient(circle_at_top_right,var(--accent-blue),transparent_65%)]",
  green:
    "bg-[radial-gradient(circle_at_top_right,var(--accent-green),transparent_65%)]",
  rose: "bg-[radial-gradient(circle_at_top_right,var(--accent-rose),transparent_65%)]",
}

export function FeaturedCard({
  tone = "amber",
  children,
  className,
}: FeaturedCardProps) {
  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-[18px] border p-6 shadow-xs transition-shadow hover:shadow-sm",
        toneBorder[tone],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70",
          toneGradient[tone],
        )}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
