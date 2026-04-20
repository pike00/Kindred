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
import { FeaturedCard } from "@/components/Common/FeaturedCard"
import { SectionHeading } from "@/components/Common/SectionHeading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import { Clock, MessagesSquare } from "@/lib/icons"

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

function daysBetween(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)
}

function daysUntilBirthday(birthday: string, now: Date = new Date()): number {
  const [, mm, dd] = birthday.split("-").map(Number)
  if (!mm || !dd) return Number.POSITIVE_INFINITY
  const thisYear = new Date(now.getFullYear(), mm - 1, dd)
  const next =
    thisYear.getTime() >= now.getTime()
      ? thisYear
      : new Date(now.getFullYear() + 1, mm - 1, dd)
  return Math.ceil((next.getTime() - now.getTime()) / 86_400_000)
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
    queryFn: () => ContactsService.listLosingTouch({ limit: 10 }),
  })
  const { data: recentInteractions } = useQuery({
    queryKey: ["interactions-recent"],
    queryFn: () => InteractionsService.listInteractions({ limit: 5 }),
  })

  const firstName =
    currentUser?.full_name?.split(" ")[0] || currentUser?.email || "there"
  const losingTouchList = losingTouch?.data ?? []
  const featured = losingTouchList[0]

  let featuredBody = "It's been a while since you caught up."
  let featuredContext = ""
  if (featured) {
    const days =
      featured.last_contacted_at != null
        ? daysBetween(featured.last_contacted_at)
        : null
    featuredContext =
      days != null
        ? `Last spoke ${days} days ago`
        : "No interactions logged yet"
    if (featured.birthday) {
      const daysToBirthday = daysUntilBirthday(featured.birthday)
      if (daysToBirthday <= 30) {
        featuredBody = `Their birthday is in ${daysToBirthday} day${daysToBirthday === 1 ? "" : "s"} — good excuse to reach out.`
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Editorial hero */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 items-start">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">
            {greeting()}, {firstName}.
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Here's who might need a nudge this week.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>
              <b className="font-display font-semibold tracking-tight text-foreground">
                {contacts?.count ?? 0}
              </b>{" "}
              contacts
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <b className="font-display font-semibold tracking-tight text-foreground">
                {losingTouch?.count ?? 0}
              </b>{" "}
              losing touch
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
              entries
            </span>
          </div>
        </div>

        {featured ? (
          <FeaturedCard tone="amber">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-amber-fg">
              Stay in touch
            </p>
            <div className="mt-3 mb-3 flex items-center gap-3">
              <ContactAvatar contact={featured} size="md" />
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold tracking-tight">
                  {[featured.first_name, featured.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unnamed contact"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {featuredContext}
                  {featured.company ? ` · ${featured.company}` : ""}
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{featuredBody}</p>
            <Button asChild>
              <Link
                to="/contacts/$contactId"
                params={{ contactId: featured.id }}
              >
                View contact →
              </Link>
            </Button>
          </FeaturedCard>
        ) : (
          <EmptyState
            icon={Clock}
            title="Everyone's caught up"
            description="No one's at risk of drifting — nice work."
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SectionHeading
            icon={Clock}
            title="Losing touch"
            count={losingTouch?.count}
            className="mb-4"
          />
          {losingTouchList.length > 0 ? (
            <div className="space-y-2">
              {losingTouchList.map((contact) => {
                const fullName = [contact.first_name, contact.last_name]
                  .filter(Boolean)
                  .join(" ")
                const daysSince = contact.last_contacted_at
                  ? daysBetween(contact.last_contacted_at)
                  : null
                return (
                  <Link
                    key={contact.id}
                    to="/contacts/$contactId"
                    params={{ contactId: contact.id }}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/50"
                  >
                    <ContactAvatar contact={contact} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">
                        {fullName || "Unnamed contact"}
                      </p>
                      {contact.company && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.company}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-accent-amber text-accent-amber-fg border-transparent shrink-0">
                      {daysSince != null ? `${daysSince}d ago` : "Never"}
                    </Badge>
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
                  className="rounded-2xl border bg-card p-3 shadow-xs"
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
    </div>
  )
}
