import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type ContactPublic, ContactsService } from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { AddInteractionDialog } from "@/components/Interactions/AddInteractionDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock } from "@/lib/icons"

interface OverdueContact extends ContactPublic {
  days_overdue?: number
}

const DISPLAY_LIMIT = 2

export function OverdueContacts() {
  const [isExpanded, setIsExpanded] = useState(false)
  const queryClient = useQueryClient()
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["overdue-contacts"],
    queryFn: () =>
      ContactsService.listOverdueContacts({}).catch(() =>
        ContactsService.listLosingTouchContacts(),
      ),
  })

  const contacts = (contactsData?.data || []) as OverdueContact[]
  const count = contactsData?.count || 0
  const displayedContacts = isExpanded
    ? contacts
    : contacts.slice(0, DISPLAY_LIMIT)
  const remainingCount = contacts.length - DISPLAY_LIMIT

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

  const handleSnooze = async (contactId: string, duration: string) => {
    try {
      await ContactsService.snoozeContact({
        contactId,
        requestBody: { duration },
      })
      queryClient.invalidateQueries({ queryKey: ["overdue-contacts"] })
      queryClient.invalidateQueries({ queryKey: ["losing-touch"] })
    } catch (error) {
      console.error("Failed to snooze contact:", error)
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
          {displayedContacts.map((contact) => {
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Snooze contact"
                            aria-label={`Snooze ${fullName || "contact"}`}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                            Snooze for...
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleSnooze(contact.id, "1w")}
                          >
                            1w
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSnooze(contact.id, "2w")}
                          >
                            2w
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSnooze(contact.id, "1m")}
                          >
                            1 month
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSnooze(contact.id, "3m")}
                          >
                            3 months
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSnooze(contact.id, "6m")}
                          >
                            6 months
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleSnooze(contact.id, "indefinitely")
                            }
                          >
                            indefinitely
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {!isExpanded && remainingCount > 0 && (
            <div className="pt-1 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(true)}
              >
                + {remainingCount} more overdue
              </Button>
            </div>
          )}
          {isExpanded && contacts.length > DISPLAY_LIMIT && (
            <div className="pt-1 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(false)}
              >
                Show less
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
