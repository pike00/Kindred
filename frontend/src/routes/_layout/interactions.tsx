import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { InteractionTimeline } from "@/components/Interactions/InteractionTimeline"
Workshop2§import { DraftsList } from "@/components/Interactions/DraftsList"
import { Skeleton } from "@/components/ui/skeleton"
Envelope2§import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const Route = createFileRoute("/_layout/interactions")({
  component: InteractionsPage,
})

function InteractionsPage() {
  return (
    <Tabs defaultValue="all" className="w-full">
Transportation2§      <TabsList>
Transportation3§        <TabsTrigger value="all">All Interactions</TabsTrigger>
Transportation4§        <TabsTrigger value="drafts">Drafts</TabsTrigger>
Transportation5§      </TabsList>
Transportation6§      <TabsContent value="all">
Transportation7§        <Suspense fallback={<Skeleton className="h-96" />}>
Transportation8§          <InteractionTimeline />
Transportation9§        </Suspense>
Transportation10§      </TabsContent>
Transportation11§      <TabsContent value="drafts">
Transportation12§        <Suspense fallback={<Skeleton className="h-96" />}>
Transportation13§          <DraftsList />
Transportation14§        </Suspense>
Transportation15§      </TabsContent>
Transportation16§    </Tabs>
  )
}
