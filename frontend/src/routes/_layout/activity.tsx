import { createFileRoute } from "@tanstack/react-router"

import { ActivityLogView } from "@/components/Activity/ActivityLogView"

export const Route = createFileRoute("/_layout/activity")({
  component: ActivityLogView,
  head: () => ({
    meta: [{ title: "Activity · Kindred" }],
  }),
})
