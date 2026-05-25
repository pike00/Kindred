import { createFileRoute } from "@tanstack/react-router"

import { KanbanBoard } from "@/components/Contacts/KanbanBoard"

export const Route = createFileRoute("/_layout/contacts/kanban")({
  component: KanbanBoard,
  head: () => ({
    meta: [{ title: "Kanban Board · Kindred" }],
  }),
})
