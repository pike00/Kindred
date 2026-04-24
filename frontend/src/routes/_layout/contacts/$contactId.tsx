import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"

import type {
  DebtPublic,
  GiftPublic,
  MediaRecommendationPublic,
} from "@/client"
import {
  ContactsService,
  DebtsService,
  GiftsService,
  MediaRecommendationsService,
} from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
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
import { NotesCard } from "@/components/Notes/NotesCard"
import { UnifiedTimeline } from "@/components/Timeline/UnifiedTimeline"
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

  const gifts = giftsData?.data ?? []
  const debts = debtsData?.data ?? []
  const mediaRecs = mediaData?.data ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-5">
        <ContactAvatar contact={contact} size="lg" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <h1 className="font-display text-4xl font-bold tracking-tight">
                {fullName}
              </h1>
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
            <EditContactDialog contact={contact} />
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
                <UserRoundSearch className="size-3.5" /> Met:{" "}
                {contact.how_we_met}
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
      </div>

      {/* Grid: left + right columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          <UnifiedTimeline contactId={contactId} />
          <NotesCard contactId={contactId} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContactFieldsCard contactId={contactId} />
            <AddressesCard contactId={contactId} />
          </div>
          <PetsCard contactId={contactId} />
          <LifeEventsCard contactId={contactId} />
          <CustomFieldsCard contactId={contactId} />
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          <div className="flex justify-end">
            <AddInteractionDialog contactId={contactId} />
          </div>

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
                    <Link
                      key={tag.id}
                      to="/contacts"
                      search={{ search: tag.name }}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer transition-colors hover:bg-secondary/80"
                      >
                        {tag.name}
                      </Badge>
                    </Link>
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

      {/* Tabbed section: Gifts, Debts, Media */}
      <Tabs defaultValue="gifts">
        <div className="flex items-center justify-between mb-2 gap-2">
          <TabsList>
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
