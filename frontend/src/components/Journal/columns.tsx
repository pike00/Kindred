import type { ColumnDef } from "@tanstack/react-table"
import { BookOpen } from "lucide-react"

import type { JournalEntryPublic } from "@/client"
import { JournalActionsMenu } from "./JournalActionsMenu"

export const columns: ColumnDef<JournalEntryPublic>[] = [
  {
    accessorKey: "body",
    header: "Entry",
    cell: ({ row }) => {
      const entry = row.original
      return (
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
          <div>
            <div className="text-sm text-muted-foreground line-clamp-2">
              {entry.body}
            </div>
            {entry.mood && (
              <div className="text-xs text-muted-foreground mt-1">
                Mood: {entry.mood}
              </div>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => {
      const date = row.original.created_at
      const d = new Date(date)
      return d.toLocaleDateString()
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const entry = row.original
      return <JournalActionsMenu entry={entry} />
    },
  },
]
