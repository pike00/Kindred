import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { InteractionTimeline } from "@/components/Interactions/InteractionTimeline"
import { Skeleton } from "@/components/ui/skeleton"
import { interactionsQueryOptions } from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"

export const Route = createFileRoute("/_layout/interactions")({
  component: InteractionsPage,
  loader: () => queryClient.ensureQueryData(interactionsQueryOptions()),
})

function InteractionsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <InteractionTimeline />
    </Suspense>
  )
}
