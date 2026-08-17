import { useQuery } from "@tanstack/react-query"
import { OpenAPI } from "@/client"
import { EnvironmentChip } from "@/components/Common/EnvironmentChip"

type VersionInfo = {
  version: string
  git_hash: string
}

async function fetchVersionInfo(): Promise<VersionInfo> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/utils/info/`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`version fetch failed: ${res.status}`)
  return res.json()
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { data } = useQuery({
    queryKey: ["version-info"],
    queryFn: fetchVersionInfo,
    staleTime: Infinity,
    retry: false,
  })

  const rawVersion = data?.version || __APP_VERSION__
  const displayVersion = rawVersion === "0.0.0" ? "0.2.106" : rawVersion
  const rawHash = data?.git_hash || __APP_HASH__
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
    <footer className="border-t py-4 px-6 text-sm text-muted-foreground">
      <div className="flex items-center justify-center gap-3">
        <span>Kindred · {currentYear}</span>
        <a
          href={commitUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={versionLabel}
          className="flex items-center gap-1.5 hover:underline"
        >
          <img
            src="/assets/github-mark.svg"
            alt="GitHub"
            width={14}
            height={14}
            className="opacity-60 dark:invert"
          />
          {versionLabel}
        </a>
        <EnvironmentChip />
      </div>
    </footer>
  )
}
