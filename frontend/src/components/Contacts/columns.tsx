import type { ColumnDef } from "@tanstack/react-table"

import type { ContactPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Star } from "@/lib/icons"
import { getInitials } from "@/utils"
import { ContactActionsMenu } from "./ContactActionsMenu"

export const columns: ColumnDef<ContactPublic>[] = [
  {
    accessorKey: "first_name",
    header: "Name",
    cell: ({ row }) => {
      const contact = row.original
      const fullName = [
        contact.prefix,
        contact.first_name,
        contact.middle_name,
        contact.last_name,
        contact.suffix,
      ]
        .filter(Boolean)
        .join(" ")
      const initials = getInitials(fullName || "Unknown")

      return (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-full font-semibold bg-primary text-primary-foreground text-xs">
            {initials}
          </div>
          <div>
            <div className="font-medium">{fullName || "Unnamed Contact"}</div>
            {contact.title && (
              <div className="text-xs text-muted-foreground">
                {contact.title}
              </div>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const contact = row.original
      if (!contact.tags || contact.tags.length === 0) return "—"

      return (
        <div className="flex flex-wrap gap-1">
          {contact.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}
          {contact.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{contact.tags.length - 3}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "last_contacted_at",
    header: "Last Contacted",
    cell: ({ row }) => {
      const date = row.original.last_contacted_at
      if (!date) return "Never"
      const d = new Date(date)
      return d.toLocaleDateString()
    },
  },
  {
    accessorKey: "is_favorite",
    header: "",
    cell: ({ row }) => {
      const contact = row.original

      return (
        <div className="flex justify-end items-center gap-1">
          {contact.is_favorite && (
            <Star className="size-4 fill-amber-400 text-amber-400" />
          )}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const contact = row.original
      return <ContactActionsMenu contact={contact} />
    },
  },
]
