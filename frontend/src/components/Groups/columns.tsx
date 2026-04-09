import type { ColumnDef } from "@tanstack/react-table"

import type { GroupPublic } from "@/client"
import { GroupActionsMenu } from "./GroupActionsMenu"

export const columns: ColumnDef<GroupPublic>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description || "—",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const group = row.original
      return <GroupActionsMenu group={group} />
    },
  },
]
