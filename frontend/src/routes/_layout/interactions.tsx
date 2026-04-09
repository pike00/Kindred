import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { InteractionTimeline } from "@/components/Interactions/InteractionTimeline"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_layout/interactions")({
  component: InteractionsPage,
})

function InteractionsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <InteractionTimeline />
    </Suspense>
  )
}
