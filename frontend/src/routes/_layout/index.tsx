import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ContactsService,
  InteractionsService,
  JournalService,
  RemindersService,
} from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { SectionHeading } from "@/components/Common/SectionHeading"
import { StayInTouchWidget } from "@/components/Dashboard/StayInTouchWidget"
import { Badge } from "@/components/ui/badge"
import useAuth from "@/hooks/useAuth"
import { MessagesSquare } from "@/lib/icons"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard · Kindred",
      },
    ],
  }),
})

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function Dashboard() {
  const { user: currentUser } = useAuth()
  const { data: contacts } = useSuspenseQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts({ limit: 100 }),
  })
  const { data: reminders } = useSuspenseQuery({
    queryKey: ["reminders"],
    queryFn: () => RemindersService.listReminders(),
  })
  const { data: journal } = useSuspenseQuery({
    queryKey: ["journal"],
    queryFn: () => JournalService.listJournalEntries(),
  })
  const { data: losingTouch } = useQuery({
    queryKey: ["losing-touch"],
    queryFn: () => ContactsService.listOverdueContacts({ limit: 10 }),
  })
  const { data: recentInteractions } = useQuery({
    queryKey: ["interactions-recent"],
    queryFn: () => InteractionsService.listInteractions({ limit: 5 }),
  })

  const firstName =
    currentUser?.full_name?.split(" ")[0] || currentUser?.email || "there"
  const overdueCount = losingTouch?.count ?? 0

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {greeting()}, {firstName}.
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>
            <b className="font-display font-semibold tracking-tight text-foreground">
              {contacts?.count ?? 0}
            </b>{" "}
            contacts
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <b className="font-display font-semibold tracking-tight text-foreground">
              {reminders?.count ?? 0}
            </b>{" "}
            reminders
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <b className="font-display font-semibold tracking-tight text-foreground">
              {journal?.count ?? 0}
            </b>{" "}
            journal entries
          </span>
        </div>
      </div>

      {/* Stay in touch — only shown when user has opted in via contact_frequency_days */}
      {overdueCount > 0 && <StayInTouchWidget />}

      {/* Recent interactions */}
      <div>
        <SectionHeading
          icon={MessagesSquare}
          title="Recent interactions"
          count={recentInteractions?.count}
          className="mb-4"
        />
        {recentInteractions?.data && recentInteractions.data.length > 0 ? (
          <div className="space-y-2">
            {recentInteractions.data.map((ix) => {
              const primary = (ix.attendees ?? [])[0]
              const others = (ix.attendees ?? []).slice(1)
              const fullName = primary
                ? [primary.first_name, primary.last_name]
                    .filter(Boolean)
                    .join(" ")
                : ""
              const extra =
                others.length > 0
                  ? ` +${others.length} other${others.length === 1 ? "" : "s"}`
                  : ""
              if (!primary) return null
              return (
                <Link
                  key={ix.id}
                  to="/contacts/$contactId"
                  params={{ contactId: primary.id }}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/50"
                >
                  <ContactAvatar
                    contact={{
                      id: primary.id,
                      first_name: primary.first_name,
                      last_name: primary.last_name,
                    }}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {(fullName || "Unknown contact") + extra}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {ix.channel}
                      </Badge>
                    </div>
                    {ix.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {ix.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(ix.occurred_at).toLocaleDateString()}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={MessagesSquare}
            title="No interactions yet"
            description="Log a call, meeting, or message to start your timeline."
          />
        )}
      </div>
    </div>
  )
}
