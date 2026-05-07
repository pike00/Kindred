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

  if (!data || data.environment === "production") return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-3">
      <div className="pointer-events-auto rounded-full border border-red-400/60 bg-red-600 px-5 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-red-900/40">
        {data.environment} environment
      </div>
    </div>
  )
}
