import { createFileRoute } from "@tanstack/react-router"

import { KanbanBoard } from "@/components/Contacts/KanbanBoard"
import {
  contactStagesQueryOptions,
  kanbanBoardQueryOptions,
} from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"

export const Route = createFileRoute("/_layout/contacts/kanban")({
  component: KanbanBoard,
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(contactStagesQueryOptions()),
      queryClient.ensureQueryData(kanbanBoardQueryOptions()),
    ]),
  head: () => ({
    meta: [{ title: "Kanban Board · Kindred" }],
  }),
})
