import type { ColumnDef } from "@tanstack/react-table"

import type { ReminderPublic } from "@/client"
import { Bell, Clock } from "@/lib/icons"
import { ReminderActionsMenu } from "./ReminderActionsMenu"

export const columns: ColumnDef<ReminderPublic>[] = [
  {
    accessorKey: "title",
    header: "Reminder",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.original.title}</span>
      </div>
    ),
  },
  {
    accessorKey: "remind_at",
    header: "Scheduled",
    cell: ({ row }) => {
      const date = row.original.remind_at
      if (!date) return "—"
      const d = new Date(date)
      return (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {d.toLocaleDateString()}{" "}
          {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const reminder = row.original
      return <ReminderActionsMenu reminder={reminder} />
    },
  },
]
