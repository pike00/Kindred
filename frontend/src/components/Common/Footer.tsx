import {
  EnvironmentChip,
  useEnvironment,
} from "@/components/Common/EnvironmentChip"

export function Footer() {
  const { data } = useEnvironment()
  const isDev = Boolean(data?.environment && data.environment !== "production")

  if (!isDev) return null

  return (
    <footer
      data-testid="app-footer"
      className="border-t border-red-700 bg-red-600 py-3 px-6 text-sm font-medium text-white shadow-inner transition-colors"
    >
      <div className="flex items-center justify-center">
        <EnvironmentChip />
      </div>
    </footer>
  )
}
