import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Archive, Calendar, Clock, Star, Users } from "lucide-react"
import type {
  DebtPublic,
  GiftPublic,
  InteractionPublic,
  NotePublic,
} from "@/client"
import {
  ContactsService,
  DebtsService,
  GiftsService,
  InteractionsService,
  NotesService,
} from "@/client"
import { AddressesCard } from "@/components/Contacts/AddressesCard"
import { ContactFieldsCard } from "@/components/Contacts/ContactFieldsCard"
import { CustomFieldsCard } from "@/components/Contacts/CustomFieldsCard"
import { EditContactDialog } from "@/components/Contacts/EditContactDialog"
import { LifeEventsCard } from "@/components/Contacts/LifeEventsCard"
import { PetsCard } from "@/components/Contacts/PetsCard"
import { RelationshipsCard } from "@/components/Contacts/RelationshipsCard"
import { AddDebt } from "@/components/Debts/AddDebt"
import { AddGift } from "@/components/Gifts/AddGift"
import { AddInteractionDialog } from "@/components/Interactions/AddInteractionDialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const Route = createFileRoute("/_layout/contacts/$contactId")({
  loader: async ({ params }) => {
    return ContactsService.getContact({ contactId: params.contactId })
  },
  component: ContactDetailPage,
})

const channelLabels: Record<string, string> = {
  call: "Call",
  in_person: "In person",
  text: "Text",
  email: "Email",
  video: "Video",
  social: "Social",
  other: "Other",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

function ContactDetailPage() {
  const { contactId } = Route.useParams()
  const { data: contact } = useSuspenseQuery({
    queryKey: ["contacts", contactId],
    queryFn: () => ContactsService.getContact({ contactId }),
  })

  const { data: interactionsData, isLoading: interactionsLoading } = useQuery({
    queryKey: ["interactions", contactId],
    queryFn: () => InteractionsService.listInteractions({ contactId }),
  })

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ["notes", contactId],
    queryFn: () => NotesService.listNotes({ contactId }),
  })

  const { data: giftsData, isLoading: giftsLoading } = useQuery({
    queryKey: ["gifts", contactId],
    queryFn: () => GiftsService.listGifts({ contactId }),
  })

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ["debts", contactId],
    queryFn: () => DebtsService.listDebts({ contactId }),
  })

  const fullName = [
    contact.prefix,
    contact.first_name,
    contact.middle_name,
    contact.last_name,
    contact.suffix,
  ]
    .filter(Boolean)
    .join(" ")

  const interactions = interactionsData?.data ?? []
  const notes = notesData?.data ?? []
  const gifts = giftsData?.data ?? []
  const debts = debtsData?.data ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <EditContactDialog contact={contact} />
          <h1 className="text-3xl font-bold">{fullName}</h1>
          {contact.is_favorite && (
            <Badge variant="secondary">
              <Star className="size-3" /> Favorite
            </Badge>
          )}
          {contact.is_archived && (
            <Badge variant="outline">
              <Archive className="size-3" /> Archived
            </Badge>
          )}
        </div>
        {contact.company && (
          <p className="text-lg text-muted-foreground">
            {contact.title ? `${contact.title} at ` : ""}
            {contact.company}
          </p>
        )}
        {!contact.company && contact.title && (
          <p className="text-lg text-muted-foreground">{contact.title}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {contact.birthday && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" /> Birthday: {contact.birthday}
            </span>
          )}
          {contact.how_we_met && (
            <span className="flex items-center gap-1">
              <Users className="size-3.5" /> Met: {contact.how_we_met}
            </span>
          )}
          {contact.last_contacted_at && (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> Last contacted:{" "}
              {formatDate(contact.last_contacted_at)}
            </span>
          )}
        </div>
      </div>

      {/* Grid: left + right columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          <ContactFieldsCard contactId={contactId} />
          <AddressesCard contactId={contactId} />
          <PetsCard contactId={contactId} />
          <LifeEventsCard contactId={contactId} />
          <CustomFieldsCard contactId={contactId} />
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Groups */}
          {contact.groups && contact.groups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {contact.groups.map((group) => (
                    <Badge key={group.id} variant="outline">
                      {group.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <RelationshipsCard contactId={contactId} />

          {/* Quick info from contact record */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tabbed section: Interactions & Notes */}
      <div className="flex justify-end mb-2">
        <AddInteractionDialog contactId={contactId} />
      </div>
      <Tabs defaultValue="interactions">
        <TabsList>
          <TabsTrigger value="interactions">
            Interactions {!interactionsLoading && `(${interactions.length})`}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes {!notesLoading && `(${notes.length})`}
          </TabsTrigger>
          <TabsTrigger value="gifts">
            Gifts {!giftsLoading && `(${gifts.length})`}
          </TabsTrigger>
          <TabsTrigger value="debts">
            Debts {!debtsLoading && `(${debts.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interactions" className="mt-4">
          {interactionsLoading ? (
            <SectionSkeleton />
          ) : interactions.length > 0 ? (
            <div className="space-y-3">
              {interactions.map((ix: InteractionPublic) => (
                <Card key={ix.id} className="py-4">
                  <CardContent className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0 mt-0.5">
                      {channelLabels[ix.channel] ?? ix.channel}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(ix.occurred_at)}</span>
                        {ix.duration_minutes && (
                          <span>{ix.duration_minutes} min</span>
                        )}
                        {ix.mood && <span>Mood: {ix.mood}</span>}
                      </div>
                      {ix.notes && (
                        <p className="text-sm mt-1 whitespace-pre-wrap">
                          {ix.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No interactions yet</p>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          {notesLoading ? (
            <SectionSkeleton />
          ) : notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note: NotePublic) => (
                <Card key={note.id} className="py-4">
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.created_at)}
                      {note.updated_at !== note.created_at &&
                        ` (edited ${formatDate(note.updated_at)})`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </TabsContent>

        <TabsContent value="gifts" className="mt-4">
          <div className="flex justify-end mb-2">
            <AddGift contactId={contactId} />
          </div>
          {giftsLoading ? (
            <SectionSkeleton />
          ) : gifts.length > 0 ? (
            <div className="space-y-3">
              {gifts.map((gift: GiftPublic) => (
                <Card key={gift.id} className="py-4">
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{gift.name}</p>
                        {gift.description && (
                          <p className="text-sm text-muted-foreground">
                            {gift.description}
                          </p>
                        )}
                      </div>
                      {gift.value_amount && (
                        <p className="text-sm font-medium">
                          ${gift.value_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {gift.status} {gift.occasion && `— ${gift.occasion}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No gifts tracked</p>
          )}
        </TabsContent>

        <TabsContent value="debts" className="mt-4">
          <div className="flex justify-end mb-2">
            <AddDebt contactId={contactId} />
          </div>
          {debtsLoading ? (
            <SectionSkeleton />
          ) : debts.length > 0 ? (
            <div className="space-y-3">
              {debts.map((debt: DebtPublic) => (
                <Card key={debt.id} className="py-4">
                  <CardContent>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {debt.reason || "Debt"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {debt.direction === "they_owe"
                            ? "They owe me"
                            : "I owe them"}
                        </p>
                      </div>
                      <p className="text-sm font-medium">
                        ${debt.amount.toFixed(2)}
                      </p>
                    </div>
                    {debt.settled_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Settled: {formatDate(debt.settled_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No debts tracked</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
