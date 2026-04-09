import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { GroupsList } from "@/components/Groups/GroupsList"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/_layout/groups")({
  component: GroupsPage,
})

function GroupsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <GroupsList />
    </Suspense>
  )
}
