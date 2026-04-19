import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import {
  ContactsService,
  GroupsService,
  InteractionsService,
  JournalService,
  RemindersService,
  TagsService,
} from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { SectionHeading } from "@/components/Common/SectionHeading"
import { StatTile } from "@/components/Common/StatTile"
import { Badge } from "@/components/ui/badge"
import useAuth from "@/hooks/useAuth"
import {
  Bell,
  Clock,
  MessagesSquare,
  NotebookPen,
  Tag,
  Users,
  UsersRound,
} from "@/lib/icons"

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

function Dashboard() {
  const { user: currentUser } = useAuth()
  const { data: contacts } = useSuspenseQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts({ limit: 100 }),
  })
  const { data: tags } = useSuspenseQuery({
    queryKey: ["tags"],
    queryFn: () => TagsService.listTags(),
  })
  const { data: groups } = useSuspenseQuery({
    queryKey: ["groups"],
    queryFn: () => GroupsService.listGroups(),
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
    queryFn: () => ContactsService.listLosingTouch({ limit: 10 }),
  })
  const { data: recentInteractions } = useQuery({
    queryKey: ["interactions-recent"],
    queryFn: () => InteractionsService.listInteractions({ limit: 5 }),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Hi, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your relationship management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatTile
          icon={Users}
          label="Contacts"
          value={contacts?.count || 0}
          tone="blue"
          to="/contacts"
        />
        <StatTile
          icon={Tag}
          label="Tags"
          value={tags?.count || 0}
          tone="purple"
          to="/tags"
        />
        <StatTile
          icon={UsersRound}
          label="Groups"
          value={groups?.count || 0}
          tone="green"
          to="/groups"
        />
        <StatTile
          icon={Bell}
          label="Reminders"
          value={reminders?.count || 0}
          tone="amber"
          to="/reminders"
        />
        <StatTile
          icon={NotebookPen}
          label="Entries"
          value={journal?.count || 0}
          tone="teal"
          to="/journal"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SectionHeading
            icon={Clock}
            title="Losing touch"
            count={losingTouch?.count}
            className="mb-4"
          />
          {losingTouch?.data && losingTouch.data.length > 0 ? (
            <div className="space-y-2">
              {losingTouch.data.map((contact) => {
                const fullName = [contact.first_name, contact.last_name]
                  .filter(Boolean)
                  .join(" ")
                const daysSince = contact.last_contacted_at
                  ? Math.floor(
                      (Date.now() -
                        new Date(contact.last_contacted_at).getTime()) /
                        86400000,
                    )
                  : null
                return (
                  <Link
                    key={contact.id}
                    to="/contacts/$contactId"
                    params={{ contactId: contact.id }}
                    className="block rounded-xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/50"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">{fullName}</p>
                      <Badge className="bg-accent-amber text-accent-amber-fg border-transparent">
                        {daysSince != null ? `${daysSince}d ago` : "Never"}
                      </Badge>
                    </div>
                    {contact.company && (
                      <p className="text-xs text-muted-foreground">
                        {contact.company}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title="Everyone's caught up"
              description="No contacts you're at risk of losing touch with."
            />
          )}
        </div>

        <div>
          <SectionHeading
            icon={MessagesSquare}
            title="Recent interactions"
            count={recentInteractions?.count}
            className="mb-4"
          />
          {recentInteractions?.data && recentInteractions.data.length > 0 ? (
            <div className="space-y-2">
              {recentInteractions.data.map((ix) => (
                <div
                  key={ix.id}
                  className="rounded-xl border bg-card p-3 shadow-xs"
                >
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {ix.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ix.occurred_at).toLocaleDateString()}
                    </span>
                  </div>
                  {ix.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {ix.notes}
                    </p>
                  )}
                </div>
              ))}
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

      {contacts?.data && contacts.data.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold tracking-tight mb-4">
            Recent contacts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contacts.data.slice(0, 3).map((contact) => {
              const fullName = [
                contact.prefix,
                contact.first_name,
                contact.middle_name,
                contact.last_name,
                contact.suffix,
              ]
                .filter(Boolean)
                .join(" ")
              return (
                <div
                  key={contact.id}
                  className="rounded-xl border bg-card p-4 shadow-xs"
                >
                  <p className="font-medium">{fullName}</p>
                  {contact.company && (
                    <p className="text-sm text-muted-foreground">
                      {contact.company}
                    </p>
                  )}
                  {contact.title && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {contact.title}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
