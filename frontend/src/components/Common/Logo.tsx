import { Link } from "@tanstack/react-router"

import { KindredMark } from "@/components/Common/KindredMark"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import logo from "/assets/images/kindred-logo.png"
import logoDark from "/assets/images/kindred-logo-dark.png"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const { resolvedTheme } = useTheme()
  const src = resolvedTheme === "dark" ? logoDark : logo

  const mark = (
    <KindredMark
      className={cn("h-7 w-7 text-foreground", className)}
      aria-label="Kindred"
    />
  )

  if (variant === "icon") {
    return asLink ? <Link to="/">{mark}</Link> : mark
  }

  if (variant === "responsive") {
    const content = (
      <>
        <img
          src={src}
          alt="Kindred"
          className={cn(
            "h-7 w-auto group-data-[collapsible=icon]:hidden",
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

  const img = (
    <img src={src} alt="Kindred" className={cn("h-7 w-auto", className)} />
  )

  return asLink ? <Link to="/">{img}</Link> : img
}
