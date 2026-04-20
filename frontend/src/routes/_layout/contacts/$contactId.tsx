import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import type {
  DebtPublic,
  GiftPublic,
  InteractionPublic,
  MediaRecommendationPublic,
  NotePublic,
} from "@/client"
import {
  ContactsService,
  DebtsService,
  GiftsService,
  InteractionsService,
  MediaRecommendationsService,
  NotesService,
} from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
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
import { AddMediaRecommendation } from "@/components/MediaRecommendations/AddMediaRecommendation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Archive,
  Cake,
  Clock,
  Film,
  Info,
  MessagesSquare,
  Star,
  UserRoundSearch,
} from "@/lib/icons"

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

export const Route = createFileRoute("/_layout/contacts/$contactId")({
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

const mediaCategoryLabels: Record<string, string> = {
  movie: "Movie",
  tv_show: "TV Show",
  podcast: "Podcast",
  musician: "Musician",
  book: "Book",
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

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ["media-recommendations", contactId],
    queryFn: () =>
      MediaRecommendationsService.listMediaRecommendations({ contactId }),
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
  const mediaRecs = mediaData?.data ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <EditContactDialog contact={contact} />
          <h1 className="text-3xl font-semibold tracking-tight">{fullName}</h1>
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
              <Cake className="size-3.5" /> Birthday: {contact.birthday}
            </span>
          )}
          {contact.how_we_met && (
            <span className="flex items-center gap-1">
              <UserRoundSearch className="size-3.5" /> Met: {contact.how_we_met}
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
          {/* Interactions log */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessagesSquare className="size-4" /> Interactions
                {!interactionsLoading && ` (${interactions.length})`}
              </CardTitle>
              <AddInteractionDialog contactId={contactId} />
            </CardHeader>
            <CardContent>
              {interactionsLoading ? (
                <SectionSkeleton />
              ) : interactions.length > 0 ? (
                <div className="space-y-3">
                  {interactions.map((ix: InteractionPublic) => (
                    <div
                      key={ix.id}
                      className="flex items-start gap-2 text-sm border-b pb-2 last:border-b-0 last:pb-0"
                    >
                      <Badge variant="outline" className="shrink-0 mt-0.5">
                        {channelLabels[ix.channel] ?? ix.channel}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No interactions yet. Log a call, meeting, or message to start
                  your timeline.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Tags
                  <InfoHint>
                    Small colored labels for free-form classification, like
                    "college", "book club", or "runner". A contact can have
                    many. Good for quick filtering.
                  </InfoHint>
                </CardTitle>
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
                <CardTitle className="flex items-center gap-2">
                  Groups
                  <InfoHint>
                    Named collections of people with a shared context, like
                    "Family", "D&D Group", or "Work Team". Groups have a
                    description; tags don't.
                  </InfoHint>
                </CardTitle>
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
        </div>
      </div>

      {/* Tabbed section: Notes, Gifts, Debts, Media */}
      <Tabs defaultValue="notes">
        <div className="flex items-center justify-between mb-2 gap-2">
          <TabsList>
            <TabsTrigger value="notes">
              Notes {!notesLoading && `(${notes.length})`}
            </TabsTrigger>
            <TabsTrigger value="gifts">
              Gifts {!giftsLoading && `(${gifts.length})`}
            </TabsTrigger>
            <TabsTrigger value="debts">
              Debts {!debtsLoading && `(${debts.length})`}
            </TabsTrigger>
            <TabsTrigger value="media">
              Media {!mediaLoading && `(${mediaRecs.length})`}
            </TabsTrigger>
          </TabsList>
        </div>

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
            <EmptyState
              icon={MessagesSquare}
              title="No notes yet"
              description="Capture quick observations or context about this contact."
            />
          )}
        </TabsContent>

        <TabsContent value="gifts" className="mt-4">
          {giftsLoading ? (
            <SectionSkeleton />
          ) : gifts.length > 0 ? (
            <>
              <div className="flex justify-end mb-2">
                <AddGift contactId={contactId} />
              </div>
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
            </>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="No gifts tracked"
              description="Track gifts you've given or plan to give to this contact."
              action={<AddGift contactId={contactId} />}
            />
          )}
        </TabsContent>

        <TabsContent value="debts" className="mt-4">
          {debtsLoading ? (
            <SectionSkeleton />
          ) : debts.length > 0 ? (
            <>
              <div className="flex justify-end mb-2">
                <AddDebt contactId={contactId} />
              </div>
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
            </>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="No debts tracked"
              description="Track money you owe or are owed by this contact."
              action={<AddDebt contactId={contactId} />}
            />
          )}
        </TabsContent>

        <TabsContent value="media" className="mt-4">
          {mediaLoading ? (
            <SectionSkeleton />
          ) : mediaRecs.length > 0 ? (
            <>
              <div className="flex justify-end mb-2">
                <AddMediaRecommendation contactId={contactId} />
              </div>
              <div className="space-y-3">
                {mediaRecs.map((rec: MediaRecommendationPublic) => (
                  <Card key={rec.id} className="py-4">
                    <CardContent>
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{rec.title}</p>
                          {rec.creator && (
                            <p className="text-xs text-muted-foreground">
                              {rec.creator}
                            </p>
                          )}
                          {rec.note && (
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {rec.note}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {mediaCategoryLabels[rec.category] ?? rec.category}
                        </Badge>
                      </div>
                      {rec.recommended_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(rec.recommended_at)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Film}
              title="No media recommendations yet"
              description="Save movies, shows, podcasts, musicians, or books this contact recommended."
              action={<AddMediaRecommendation contactId={contactId} />}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
