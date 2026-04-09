import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { JournalList } from "@/components/Journal/JournalList"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_layout/journal")({
  component: JournalPage,
})

function JournalPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <JournalList />
    </Suspense>
  )
}
