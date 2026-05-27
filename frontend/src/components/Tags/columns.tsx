import type { ColumnDef } from "@tanstack/react-table"

import type { TagPublic } from "@/client"
import { TagActionsMenu } from "./TagActionsMenu"

export function createColumns(
  onShare: (tag: TagPublic) => void,
): ColumnDef<TagPublic>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const tag = row.original
        return (
          <div className="flex items-center gap-2">
            {tag.color && (
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
            )}
            <span className="font-medium">{tag.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = row.original.created_at
        return new Date(date).toLocaleDateString()
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const tag = row.original
        return <TagActionsMenu tag={tag} onShare={onShare} />
      },
    },
  ]
}
