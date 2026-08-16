import { queryOptions } from "@tanstack/react-query"
import {
  CalendarService,
  ContactsService,
  GiftsService,
  InteractionsService,
  RemindersService,
  SavedFiltersService,
  TagsService,
} from "@/client"
import { CustomContactsService } from "@/client/custom"

// Single source of truth for the route-level queries. Components call these via
// `useSuspenseQuery(...)` and the matching route `loader` calls
// `queryClient.ensureQueryData(...)` with the same factory, so the data is warm
// before the route commits and the component never suspends on navigation.
// Keys/args here MUST stay identical to the component call sites.

// --- Dashboard (`/_layout/`) -------------------------------------------------
// Note: intentionally distinct from `contactsListQueryOptions` — the dashboard
// caps at 100 under key ["contacts"], the list page keys by saved filter.
export const dashboardContactsQueryOptions = () =>
  queryOptions({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts({ limit: 100 }),
  })

export const remindersQueryOptions = () =>
  queryOptions({
    queryKey: ["reminders"],
    queryFn: () => RemindersService.listReminders(),
  })

// --- Contacts list (`/_layout/contacts/`) ------------------------------------
export const savedFiltersQueryOptions = () =>
  queryOptions({
    queryKey: ["saved-filters"],
    queryFn: () => SavedFiltersService.listSavedFilters(),
  })

export const contactsListQueryOptions = (savedFilterId?: string) =>
  queryOptions({
    queryKey: ["contacts", savedFilterId],
    queryFn: () =>
      ContactsService.listContacts(savedFilterId ? { savedFilterId } : {}),
  })

// --- Contact detail (`/_layout/contacts/$contactId`) -------------------------
export const contactQueryOptions = (contactId: string) =>
  queryOptions({
    queryKey: ["contacts", contactId],
    queryFn: () => ContactsService.getContact({ contactId }),
  })

// --- Contacts kanban (`/_layout/contacts/kanban`) ----------------------------
export const contactStagesQueryOptions = () =>
  queryOptions({
    queryKey: ["contact-stages"],
    queryFn: () => ContactsService.getDistinctStages(),
  })

export const kanbanBoardQueryOptions = (search = "") =>
  queryOptions({
    queryKey: ["kanban-board", search],
    queryFn: () => ContactsService.getKanbanBoard({ search: search || null }),
  })

// --- Tags (`/_layout/tags`) --------------------------------------------------
export const tagsQueryOptions = () =>
  queryOptions({
    queryKey: ["tags"],
    queryFn: () => TagsService.listTags(),
  })

// --- Interactions (`/_layout/interactions`) ----------------------------------
export const interactionsQueryOptions = () =>
  queryOptions({
    queryKey: ["interactions"],
    queryFn: () => InteractionsService.listInteractions({ limit: 1000 }),
  })

// --- Calendar (`/_layout/calendar`) ------------------------------------------
export const calendarMonthQueryOptions = (month: string) =>
  queryOptions({
    queryKey: ["calendar", month],
    queryFn: () => CalendarService.getCalendarMonth({ yyyyMm: month }),
  })

// --- Gifts kanban (`/_layout/gifts/kanban`) ----------------------------------
export const giftsKanbanQueryOptions = () =>
  queryOptions({
    queryKey: ["gifts-kanban"],
    queryFn: () => GiftsService.getKanbanBoard(),
  })

// --- Contacts map (`/_layout/contacts/map`) ----------------------------------
type GeoBounds = {
  minLat?: number
  maxLat?: number
  minLng?: number
  maxLng?: number
}

export const contactsGeoQueryOptions = (bounds: GeoBounds = {}) =>
  queryOptions({
    queryKey: ["contactsGeo", bounds],
    queryFn: () =>
      CustomContactsService.listContactsGeo({
        minLat: bounds?.minLat,
        maxLat: bounds?.maxLat,
        minLng: bounds?.minLng,
        maxLng: bounds?.maxLng,
      }),
  })
