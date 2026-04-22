import { createFileRoute } from "@tanstack/react-router"

import Webhooks from "@/components/UserSettings/Webhooks"

export const Route = createFileRoute("/_layout/admin/webhooks")({
  component: Webhooks,
})
