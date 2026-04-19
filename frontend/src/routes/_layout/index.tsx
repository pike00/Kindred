import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  Bell,
  BookOpen,
  FolderOpen,
  MessageCircle,
  Tag,
  Users,
} from "lucide-react"
import {
  ContactsService,
  GroupsService,
  InteractionsService,
  JournalService,
  RemindersService,
  TagsService,
} from "@/client"
import { Badge } from "@/components/ui/badge"
import useAuth from "@/hooks/useAuth"

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

  const stats = [
    {
      icon: Users,
      label: "Contacts",
      value: contacts?.count || 0,
      color: "bg-blue-100 text-blue-600",
      to: "/contacts",
    },
    {
      icon: Tag,
      label: "Tags",
      value: tags?.count || 0,
      color: "bg-purple-100 text-purple-600",
      to: "/tags",
    },
    {
      icon: FolderOpen,
      label: "Groups",
      value: groups?.count || 0,
      color: "bg-green-100 text-green-600",
      to: "/groups",
    },
    {
      icon: Bell,
      label: "Reminders",
      value: reminders?.count || 0,
      color: "bg-orange-100 text-orange-600",
      to: "/reminders",
    },
    {
      icon: BookOpen,
      label: "Entries",
      value: journal?.count || 0,
      color: "bg-indigo-100 text-indigo-600",
      to: "/journal",
    },
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Hi, {currentUser?.full_name || currentUser?.email} 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your relationship management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              to={stat.to}
              className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Losing Touch + Recent Interactions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {losingTouch?.data && losingTouch.data.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Losing Touch ({losingTouch.count})
            </h2>
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
                    className="block rounded-lg border bg-card p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">{fullName}</p>
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-300"
                      >
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
          </div>
        )}

        {recentInteractions?.data && recentInteractions.data.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              Recent Interactions
            </h2>
            <div className="space-y-2">
              {recentInteractions.data.map((ix) => (
                <div key={ix.id} className="rounded-lg border bg-card p-3">
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
          </div>
        )}
      </div>

      {contacts?.data && contacts.data.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Contacts</h2>
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
                <div key={contact.id} className="rounded-lg border bg-card p-4">
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
