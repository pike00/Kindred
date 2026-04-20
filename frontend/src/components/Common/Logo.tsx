import { Link } from "@tanstack/react-router"

import { KindredMark } from "@/components/Common/KindredMark"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

function FullMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-lg leading-none",
        className,
      )}
    >
      <KindredMark
        aria-hidden="true"
        className="h-[1.5em] w-[1.5em] shrink-0 text-foreground"
      />
      <span className="font-extrabold tracking-tight">
        <span className="text-primary">KIN</span>
        <span className="text-foreground">DRED</span>
      </span>
      <span className="sr-only">Kindred</span>
    </span>
  )
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  if (variant === "icon") {
    const mark = (
      <KindredMark
        className={cn("h-7 w-7 text-foreground", className)}
        aria-label="Kindred"
      />
    )
    return asLink ? <Link to="/">{mark}</Link> : mark
  }

  if (variant === "responsive") {
    const content = (
      <>
        <FullMark
          className={cn(
            "group-data-[collapsible=icon]:hidden",
            className,
          )}
        />
        <KindredMark
          aria-hidden="true"
          className="hidden h-7 w-7 text-foreground group-data-[collapsible=icon]:block"
        />
      </>
    )
    return asLink ? <Link to="/">{content}</Link> : content
  }

  const content = <FullMark className={className} />
  return asLink ? <Link to="/">{content}</Link> : content
}
