import { useQuery } from "@tanstack/react-query"
import { OpenAPI } from "@/client"
import {
  EnvironmentChip,
  useEnvironment,
} from "@/components/Common/EnvironmentChip"

type VersionInfo = {
  version: string
  git_hash: string
  hash?: string
}

async function fetchVersionInfo(): Promise<VersionInfo> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/utils/info/`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`version fetch failed: ${res.status}`)
  return res.json()
}

export function Footer() {
  const { data: envData } = useEnvironment()
  const { data: versionData } = useQuery({
    queryKey: ["version-info"],
    queryFn: fetchVersionInfo,
    staleTime: 60 * 1000,
    retry: false,
  })

  const isDev = Boolean(
    envData?.environment && envData.environment !== "production",
  )

  const rawVersion = versionData?.version || __APP_VERSION__
  const displayVersion = rawVersion === "0.0.0" ? "0.2.106" : rawVersion
  const rawHash = versionData?.git_hash || versionData?.hash || __APP_HASH__
  const hasHash = Boolean(
    typeof rawHash === "string" && rawHash.trim() && rawHash !== "unknown",
  )

  const commitUrl = hasHash
    ? `https://github.com/pike00/Kindred/commit/${rawHash}`
    : "https://github.com/pike00/Kindred"
  const versionLabel = hasHash
    ? `v${displayVersion} · ${rawHash}`
    : `v${displayVersion}`

  if (!isDev) {
    return (
      <footer
        data-testid="app-footer"
        className="py-3 px-6 text-xs text-muted-foreground flex items-center justify-center"
      >
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={versionLabel}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors opacity-75 hover:opacity-100"
        >
          <img
            src="/assets/github-mark.svg"
            alt="GitHub"
            width={12}
            height={12}
            className="opacity-60 dark:invert shrink-0"
          />
          <span>{versionLabel}</span>
        </a>
      </footer>
    )
  }

  return (
    <footer
      data-testid="app-footer"
      className="border-t border-red-700 bg-red-600 py-2.5 px-6 text-sm font-medium text-white shadow-inner transition-colors"
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <EnvironmentChip />
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={versionLabel}
          className="flex items-center gap-1.5 text-[11px] font-normal text-white/80 hover:text-white transition-colors"
        >
          <img
            src="/assets/github-mark.svg"
            alt="GitHub"
            width={11}
            height={11}
            className="brightness-200 shrink-0 opacity-80"
          />
          <span>{versionLabel}</span>
        </a>
      </div>
    </footer>
  )
}
