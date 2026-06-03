import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ContactsService,
  InteractionsService,
  RemindersService,
} from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { SectionHeading } from "@/components/Common/SectionHeading"
import { StayInTouchWidget } from "@/components/Dashboard/StayInTouchWidget"
import { Badge } from "@/components/ui/badge"
import useAuth from "@/hooks/useAuth"
import { Bell, Cake, MessagesSquare } from "@/lib/icons"
import { formatDateWithRelative } from "@/lib/utils"

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

/** Whole days until the next occurrence of a birthday (MM-DD of any year). */
function daysUntilBirthday(birthday: string, now: Date = new Date()): number {
  const parts = birthday.split("-").map(Number)
  const mm = parts[parts.length - 2]
  const dd = parts[parts.length - 1]
  if (!mm || !dd) return Number.POSITIVE_INFINITY
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, mm - 1, dd)
  }
  return Math.round((next.getTime() - today.getTime()) / 86_400_000)
}

function untilLabel(days: number): string {
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  return `in ${days} days`
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
  const { data: losingTouch } = useQuery({
    queryKey: ["losing-touch"],
    queryFn: () => ContactsService.listOverdueContacts({}),
  })
  const { data: recentInteractions } = useQuery({
    queryKey: ["interactions-recent"],
    queryFn: () => InteractionsService.listInteractions({ limit: 5 }),
  })
  const { data: dueReminders } = useQuery({
    queryKey: ["reminders-due"],
    queryFn: () => RemindersService.listDueReminders({ limit: 5 }),
  })

  const firstName =
    currentUser?.full_name?.split(" ")[0] || currentUser?.email || "there"
  const overdueCount = losingTouch?.count ?? 0

  // Upcoming birthdays — computed client-side from the contacts already loaded
  // above (next 60 days), so no extra request.
  const upcomingBirthdays = (contacts?.data ?? [])
    .filter((c) => c.birthday)
    .map((c) => ({ contact: c, days: daysUntilBirthday(c.birthday as string) }))
    .filter((b) => b.days <= 60)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6)

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
              {reminders?.data?.length ?? 0}
            </b>{" "}
            reminders
          </span>
        </div>
      </div>

      {/* Stay in touch — only shown when user has opted in via contact_frequency_days */}
      {overdueCount > 0 && <StayInTouchWidget />}

      {/* Upcoming birthdays + Due reminders */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <SectionHeading
            icon={Cake}
            title="Upcoming birthdays"
            count={upcomingBirthdays.length}
            className="mb-4"
          />
          {upcomingBirthdays.length > 0 ? (
            <div className="space-y-2">
              {upcomingBirthdays.map(({ contact, days }) => {
                const fullName =
                  [contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unnamed contact"
                return (
                  <Link
                    key={contact.id}
                    to="/contacts/$contactId"
                    params={{ contactId: contact.id }}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/50"
                  >
                    <ContactAvatar contact={contact} size="sm" />
                    <p className="min-w-0 flex-1 truncate font-medium text-sm">
                      {fullName}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {untilLabel(days)}
                    </Badge>
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Cake}
              title="No birthdays coming up"
              description="Add birthdays to contacts to see them here."
            />
          )}
        </div>

        <div>
          <SectionHeading
            icon={Bell}
            title="Due reminders"
            count={dueReminders?.count}
            className="mb-4"
          />
          {dueReminders?.data && dueReminders.data.length > 0 ? (
            <div className="space-y-2">
              {dueReminders.data.map((r) => {
                const row = (
                  <>
                    <Bell className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{r.title}</p>
                      {r.contact_name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {r.contact_name}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateWithRelative(r.remind_at)}
                    </span>
                  </>
                )
                const cls =
                  "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors hover:bg-accent/50"
                return r.contact_id ? (
                  <Link
                    key={r.id}
                    to="/contacts/$contactId"
                    params={{ contactId: r.contact_id }}
                    className={cls}
                  >
                    {row}
                  </Link>
                ) : (
                  <Link key={r.id} to="/reminders" className={cls}>
                    {row}
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="All caught up"
              description="No reminders are due right now."
            />
          )}
        </div>
      </div>

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
                    {formatDateWithRelative(ix.occurred_at)}
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
