import { EnvironmentChip } from "@/components/Common/EnvironmentChip"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-4 px-6 text-sm text-muted-foreground">
      <div className="flex items-center justify-center gap-3">
        <span>Kindred · {currentYear}</span>
        <EnvironmentChip />
      </div>
    </footer>
  )
}
