import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"
import { DraftsList } from "@/components/Interactions/DraftsList"
import { InteractionTimeline } from "@/components/Interactions/InteractionTimeline"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const Route = createFileRoute("/_layout/interactions")({
  component: InteractionsPage,
})

function InteractionsPage() {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList>
        <TabsTrigger value="all">All Interactions</TabsTrigger>
        <TabsTrigger value="drafts">Drafts</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <InteractionTimeline />
        </Suspense>
      </TabsContent>
      <TabsContent value="drafts">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <DraftsList />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}
