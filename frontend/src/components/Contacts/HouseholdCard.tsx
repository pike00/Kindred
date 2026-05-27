import { useQuery } from "@tanstack/react-query"

import { ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Cake, Info, Users } from "@/lib/icons"

function InfoHint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="More info"
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  )
}

function formatHouseholdDisplay(members: HouseholdMember[]): string {
  return members
    .map((m) => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(" ")
      return m.age !== null && m.age !== undefined ? `${name} (${m.age})` : name
    })
    .join(", ")
}

interface HouseholdMember {
  id: string
  first_name: string
  last_name: string | null
  nickname: string | null
  birthday: string | null
  age: number | null
}

interface HouseholdCardProps {
  contactId: string
  contactName: string
}

function HouseholdMemberRow({
  member,
  isPrimary,
}: {
  member: HouseholdMember
  isPrimary: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <ContactAvatar
        contact={{
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
        }}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {[member.first_name, member.last_name].filter(Boolean).join(" ")}
          {isPrimary && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Primary
            </Badge>
          )}
        </p>
        {member.age !== null && member.age !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Cake className="size-3" /> Age: {member.age}
          </p>
        )}
      </div>
    </div>
  )
}

export function HouseholdCard({ contactId, contactName }: HouseholdCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", contactId, "household"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (ContactsService as any).getContactHousehold({ contactId }),
  })

  const members: HouseholdMember[] =
    (data as { data?: HouseholdMember[] } | undefined)?.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" /> Household
          <InfoHint>
            Derived from spouse, child, parent, and sibling relationships. Shows
            household members with their ages for gift occasions and visit
            planning.
          </InfoHint>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-1">
            {members.map((member) => (
              <HouseholdMemberRow
                key={member.id}
                member={member}
                isPrimary={member.id === contactId}
              />
            ))}
            <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
              {formatHouseholdDisplay(members)}
            </p>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No household detected"
            description={`Add relationships like spouse, parent, or child to ${contactName}'s contact page to see household members here.`}
          />
        )}
      </CardContent>
    </Card>
  )
}
