import { Link } from "@tanstack/react-router"

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

  // Per spec §6 (option B): no icon-only variant exists, so render nothing
  // when only the icon would be visible. The collapsed sidebar header stays empty.
  if (variant === "icon") {
    return null
  }

  const img = (
    <img
      src={src}
      alt="Kindred"
      className={cn(
        "h-7 w-auto",
        variant === "responsive" && "group-data-[collapsible=icon]:hidden",
        className,
      )}
    />
  )

  return asLink ? <Link to="/">{img}</Link> : img
}
