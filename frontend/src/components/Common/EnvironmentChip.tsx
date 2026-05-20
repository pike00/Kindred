import { useQuery } from "@tanstack/react-query"

import { OpenAPI } from "@/client"

type EnvironmentInfo = { environment: string }

async function fetchEnvironment(): Promise<EnvironmentInfo> {
  const res = await fetch(`${OpenAPI.BASE}/api/v1/utils/environment/`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(`environment fetch failed: ${res.status}`)
  return res.json()
}

export function EnvironmentChip() {
  const { data } = useQuery({
    queryKey: ["environment"],
    queryFn: fetchEnvironment,
    staleTime: Infinity,
    retry: false,
  })

  if (!data?.environment || data.environment === "production") return null

  return (
    <span className="rounded-full border border-red-400/60 bg-red-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white shadow shadow-red-900/40">
      {data.environment} environment
    </span>
  )
}
