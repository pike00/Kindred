import { useQuery } from "@tanstack/react-query"
import { OpenAPI } from "@/client"

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

export function SidebarVersion() {
  const { data } = useQuery({
    queryKey: ["version-info"],
    queryFn: fetchVersionInfo,
    staleTime: 60 * 1000,
    retry: false,
  })

  const rawVersion = data?.version || __APP_VERSION__
  const displayVersion = rawVersion === "0.0.0" ? "0.2.106" : rawVersion
  const rawHash = data?.git_hash || data?.hash || __APP_HASH__
  const hasHash = Boolean(
    typeof rawHash === "string" && rawHash.trim() && rawHash !== "unknown",
  )

  const commitUrl = hasHash
    ? `https://github.com/pike00/Kindred/commit/${rawHash}`
    : "https://github.com/pike00/Kindred"
  const versionLabel = hasHash
    ? `v${displayVersion} · ${rawHash}`
    : `v${displayVersion}`

  return (
    <div
      data-testid="sidebar-version"
      className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2 group-data-[collapsible=icon]:hidden"
    >
      <a
        href={commitUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={versionLabel}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors truncate"
      >
        <img
          src="/assets/github-mark.svg"
          alt="GitHub"
          width={12}
          height={12}
          className="opacity-60 dark:invert shrink-0"
        />
        <span className="truncate">{versionLabel}</span>
      </a>
    </div>
  )
}
