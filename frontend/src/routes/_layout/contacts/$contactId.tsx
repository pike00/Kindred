import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import type { DebtPublic, GiftPublic, InteractionPublic } from "@/client"
import {
  ContactsService,
  DebtsService,
  GiftsService,
  InteractionsService,
} from "@/client"
import { ContactAvatar } from "@/components/Common/ContactAvatar"
import { EmptyState } from "@/components/Common/EmptyState"
import { AddressesCard } from "@/components/Contacts/AddressesCard"
import { AvatarUploadDialog } from "@/components/Contacts/AvatarUploadDialog"
import { ContactFieldsCard } from "@/components/Contacts/ContactFieldsCard"
import { CustomFieldsCard } from "@/components/Contacts/CustomFieldsCard"
import { EditContactDialog } from "@/components/Contacts/EditContactDialog"
import { InteractionHeatmap } from "@/components/Contacts/InteractionHeatmap"
import { LifeEventsCard } from "@/components/Contacts/LifeEventsCard"
import { PetsCard } from "@/components/Contacts/PetsCard"
import { RelationshipsCard } from "@/components/Contacts/RelationshipsCard"
import { formatLocalTime } from "@/components/Contacts/TimezoneInput"
import { AddDebt } from "@/components/Debts/AddDebt"
import { AddGift } from "@/components/Gifts/AddGift"
import { AddInteractionDialog } from "@/components/Interactions/AddInteractionDialog"
import { InteractionMap } from "@/components/Interactions/InteractionMap"
import { NotesCard } from "@/components/Notes/NotesCard"
import { UnifiedTimeline } from "@/components/Timeline/UnifiedTimeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  BellOff,
  Cake,
  Camera,
  Clock,
  Download,
  Info,
  MapPin,
  MessagesSquare,
  Star,
  UserRoundSearch,
} from "@/lib/icons"
import { formatDateWithRelative } from "@/lib/utils"

function ContactLocalTime({ timezone }: { timezone: string }) {
  const [localTime, setLocalTime] = useState(() => formatLocalTime(timezone))

  useEffect(() => {
    const id = setInterval(
      () => setLocalTime(formatLocalTime(timezone)),
      60_000,
    )
    return () => clearInterval(id)
  }, [timezone])

  if (!localTime) return null

  return (
    <span className="flex items-center gap-1">
      <Clock className="size-3.5" />
      {localTime} their time
      <span className="text-muted-foreground text-xs">({timezone})</span>
    </span>
  )
}

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

function formatDate(iso: string) {
  return formatDateWithRelative(iso)
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
  const [heatmapFilter, setHeatmapFilter] = useState<{
    startDate: string
    endDate: string
  } | null>(null)

  const handleWeekClick = (
    weekStart: string,
    weekEnd: string,
    count: number,
  ) => {
    if (count === 0) return
    setHeatmapFilter({ startDate: weekStart, endDate: weekEnd })
  }

  const clearHeatmapFilter = () => setHeatmapFilter(null)
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

  const { data: interactionsData } = useQuery({
    queryKey: ["interactions", contactId],
    queryFn: () =>
      InteractionsService.listInteractions({ contactId, limit: 500 }),
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
  const interactions: InteractionPublic[] = interactionsData?.data ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="relative group">
          <ContactAvatar contact={contact} size="lg" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <AvatarUploadDialog
              contact={contact}
              trigger={
                <button
                  type="button"
                  className="text-white hover:text-white/80"
                >
                  <Camera className="size-6" />
                </button>
              }
            />
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Heatmap */}
          <InteractionHeatmap onWeekClick={handleWeekClick} />
          {heatmapFilter && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                Filtered to week of{" "}
                {new Date(heatmapFilter.startDate).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" },
                )}
              </span>
              <button
                type="button"
                onClick={clearHeatmapFilter}
                className="underline hover:text-foreground"
              >
                Clear filter
              </button>
            </div>
          )}
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
              {contact.source && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="size-3" />
                  {contact.source === "manual"
                    ? "Manual"
                    : contact.source === "vcard_import"
                      ? "vCard Import"
                      : contact.source === "carddav"
                        ? "CardDAV"
                        : contact.source === "google"
                          ? "Google"
                          : contact.source === "webhook"
                            ? "Webhook"
                            : contact.source}
                  {contact.source_external_id && (
                    <span className="text-muted-foreground text-xs">
                      {" "}
                      ({contact.source_external_id})
                    </span>
                  )}
                </Badge>
              )}
              {contact.is_archived && (
                <Badge variant="outline">
                  <Archive className="size-3" /> Archived
                </Badge>
              )}
              {contact.do_not_contact && (
                <Badge
                  variant="outline"
                  title={contact.do_not_contact_reason || undefined}
                >
                  <BellOff className="size-3" /> No reminders
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/api/v1/contacts/${contactId}.pdf`, "_blank")
                }}
              >
                <Download className="size-4 mr-2" />
                Download PDF
              </Button>
              <EditContactDialog contact={contact} />
            </div>
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
                <UserRoundSearch className="size-3.5" /> How we met:{" "}
                {contact.how_we_met}
              </span>
            )}
            {contact.pronouns && (
              <span className="flex items-center gap-1">
                <UserRoundSearch className="size-3.5" /> Pronouns:{" "}
                {contact.pronouns}
              </span>
            )}

            {contact.timezone && (
              <ContactLocalTime timezone={contact.timezone} />
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
          <UnifiedTimeline
            contactId={contactId}
            startDate={heatmapFilter?.startDate ?? null}
            endDate={heatmapFilter?.endDate ?? null}
          />
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
            <AddInteractionDialog seedContact={contact} />
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

          {/* Interaction Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4" />
                Interaction Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InteractionMap interactions={interactions} />
            </CardContent>
          </Card>

          <RelationshipsCard
            contactId={contactId}
            contactName={contact.first_name ?? ""}
          />
        </div>
      </div>

      {/* Tabbed section: Gifts, Debts */}
      <Tabs defaultValue="gifts">
        <div className="flex items-center justify-between mb-2 gap-2">
          <TabsList>
            <TabsTrigger value="gifts">
              Gifts {!giftsLoading && `(${gifts.length})`}
            </TabsTrigger>
            <TabsTrigger value="debts">
              Debts {!debtsLoading && `(${debts.length})`}
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
      </Tabs>
    </div>
  )
}
