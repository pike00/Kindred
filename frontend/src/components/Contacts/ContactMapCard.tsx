import { MapIcon } from "lucide-react"
import type { ContactGeoPoint } from "@/client/types.gen"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/utils"

interface ContactMapCardProps {
  point: ContactGeoPoint
}

export function ContactMapCard({ point }: ContactMapCardProps) {
  const initials = getInitials(point.contact_name)

  return (
    <div className="w-[260px] text-sm">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage
            src={point.avatar_url || undefined}
            alt={point.contact_name}
          />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{point.contact_name}</div>
          {point.address_label && (
            <div className="text-muted-foreground text-xs capitalize">
              {point.address_label}
            </div>
          )}
        </div>
      </div>

      {(point.street || point.city || point.country) && (
        <div className="flex items-start gap-2 mb-2 text-muted-foreground">
          <MapIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="text-xs">
            {point.street && <div>{point.street}</div>}
            <div>{[point.city, point.country].filter(Boolean).join(", ")}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <Button asChild size="sm" className="h-7 text-xs flex-1">
          <a href={`/contacts/${point.contact_id}`}>View Contact</a>
        </Button>
      </div>
    </div>
  )
}
