import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import type { DebtPublic, GiftPublic } from "@/client"
import { DebtsService, GiftsService } from "@/client"
import { EmptyState } from "@/components/Common/EmptyState"
import { AddressesCard } from "@/components/Contacts/AddressesCard"
import { CustomFieldsCard } from "@/components/Contacts/CustomFieldsCard"
import { InlineContactDetailsCard } from "@/components/Contacts/InlineContactDetailsCard"
import { InlineContactHeader } from "@/components/Contacts/InlineContactHeader"
import { PeopleAndPetsCard } from "@/components/Contacts/PeopleAndPetsCard"
import { AddDebt } from "@/components/Debts/AddDebt"
import { AddGift } from "@/components/Gifts/AddGift"
import { AddInteractionDialog } from "@/components/Interactions/AddInteractionDialog"
import { AddNoteDialog } from "@/components/Notes/AddNoteDialog"
import { UnifiedTimeline } from "@/components/Timeline/UnifiedTimeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ChevronDown,
  Gift as GiftIcon,
  Info,
  MessagesSquare,
  NotebookPen,
} from "@/lib/icons"
import { contactQueryOptions } from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"
import { formatDateWithRelative } from "@/lib/utils"

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
  loader: ({ params }) =>
    queryClient.ensureQueryData(contactQueryOptions(params.contactId)),
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
  // Which "Add" dialog the log-interaction dropdown has open (item21).
  const [addOpen, setAddOpen] = useState<
    "interaction" | "note" | "gift" | null
  >(null)
  const { contactId } = Route.useParams()
  const { data: contact } = useSuspenseQuery(contactQueryOptions(contactId))

  const { data: giftsData, isLoading: giftsLoading } = useQuery({
    queryKey: ["gifts", contactId],
    queryFn: () => GiftsService.listGifts({ contactId }),
  })

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ["debts", contactId],
    queryFn: () => DebtsService.listDebts({ contactId }),
  })

  const gifts = giftsData?.data ?? []
  const debts = debtsData?.data ?? []
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Inline Editable Header */}
      <InlineContactHeader
        contact={contact}
        onWeekClick={handleWeekClick}
        heatmapFilter={heatmapFilter}
        clearHeatmapFilter={clearHeatmapFilter}
      />

      {/* Grid: left + right columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          <UnifiedTimeline
            contactId={contactId}
            startDate={heatmapFilter?.startDate ?? null}
            endDate={heatmapFilter?.endDate ?? null}
          />
          <PeopleAndPetsCard
            contactId={contactId}
            contactName={contact.first_name ?? ""}
          />
          <CustomFieldsCard contactId={contactId} />
        </div>

        {/* Right column (1/3 width) */}
        <div className="space-y-6">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  Log Interaction
                  <ChevronDown className="ml-1 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddOpen("interaction")}>
                  <MessagesSquare className="size-4" />
                  Log interaction
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddOpen("note")}>
                  <NotebookPen className="size-4" />
                  Add note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddOpen("gift")}>
                  <GiftIcon className="size-4" />
                  Add gift
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <AddInteractionDialog
            seedContact={contact}
            open={addOpen === "interaction"}
            onOpenChange={(o) => setAddOpen(o ? "interaction" : null)}
          />
          <AddNoteDialog
            contactId={contactId}
            open={addOpen === "note"}
            onOpenChange={(o) => setAddOpen(o ? "note" : null)}
          />
          <AddGift
            contactId={contactId}
            open={addOpen === "gift"}
            onOpenChange={(o) => setAddOpen(o ? "gift" : null)}
          />

          {/* Inline Editable Contact Properties Card */}
          <InlineContactDetailsCard contact={contact} />

          <AddressesCard contactId={contactId} />

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
