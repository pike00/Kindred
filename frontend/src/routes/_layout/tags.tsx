import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { TagsList } from "@/components/Tags/TagsList"
import { Skeleton } from "@/components/ui/skeleton"
import { tagsQueryOptions } from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"

export const Route = createFileRoute("/_layout/tags")({
  component: TagsPage,
  loader: () => queryClient.ensureQueryData(tagsQueryOptions()),
})

function TagsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TagsList />
    </Suspense>
  )
}
