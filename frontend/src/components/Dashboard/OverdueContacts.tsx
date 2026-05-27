import { useQuery } from "@tanstack/react-query"
import { type ContactPublic, ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { AddInteractionDialog } from "@/components/Interactions/AddInteractionDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, SkipForward } from "@/lib/icons"

interface OverdueContact extends ContactPublic {
  days_overdue?: number
}

export function OverdueContacts() {
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["overdue-contacts"],
    queryFn: () =>
      ContactsService.listOverdueContacts({ limit: 50 }).catch(() => {
        // Fallback to losing-touch endpoint if overdue endpoint isn't available yet
        return ContactsService.listLosingTouch({ limit: 50 })
      }),
  })

  const contacts = (contactsData?.data || []) as OverdueContact[]
  const count = contactsData?.count || 0

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border bg-card p-3"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    )
  }

  const handleSkip = async (contactId: string) => {
    try {
      await fetch(`/api/v1/contacts/${contactId}/skip`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
      // Refresh the list
      window.location.reload()
    } catch (error) {
      console.error("Failed to skip contact:", error)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Stay in Touch
        </h2>
        <Badge variant="outline" className="text-xs">
          {count} overdue
        </Badge>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">
            Everyone's caught up!
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            No contacts are overdue for check-in.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => {
            const fullName = [contact.first_name, contact.last_name]
              .filter(Boolean)
              .join(" ")
            const daysOverdue = contact.days_overdue ?? 0
            const isDoNotContact = contact.do_not_contact

            return (
              <div
                key={contact.id}
                className={`flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs transition-colors ${
                  isDoNotContact ? "opacity-60" : "hover:bg-accent/50"
                }`}
              >
                <ContactAvatar contact={contact} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {fullName || "Unnamed contact"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contact.company && (
                      <span className="text-xs text-muted-foreground truncate">
                        {contact.company}
                      </span>
                    )}
                    {isDoNotContact && (
                      <Badge variant="secondary" className="text-xs">
                        Do not contact
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    className={`text-xs ${
                      daysOverdue > 30
                        ? "bg-red-100 text-red-700 border-red-200"
                        : daysOverdue > 14
                          ? "bg-orange-100 text-orange-700 border-orange-200"
                          : "bg-amber-100 text-amber-700 border-amber-200"
                    }`}
                  >
                    {daysOverdue}d overdue
                  </Badge>
                  {!isDoNotContact && (
                    <>
                      <AddInteractionDialog seedContact={contact} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSkip(contact.id)}
                        title="Skip this week"
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
