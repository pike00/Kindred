import {
  EnvironmentChip,
  useEnvironment,
} from "@/components/Common/EnvironmentChip"
import { cn } from "@/lib/utils"

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { data } = useEnvironment()
  const isDev = Boolean(data?.environment && data.environment !== "production")

  return (
    <footer
      data-testid="app-footer"
      className={cn(
        "border-t py-4 px-6 text-sm transition-colors",
        isDev
          ? "border-red-700 bg-red-600 font-medium text-white shadow-inner"
          : "text-muted-foreground",
      )}
    >
      <div className="flex items-center justify-center gap-3">
        <span>Kindred · {currentYear}</span>
        <EnvironmentChip />
      </div>
    </footer>
  )
}
