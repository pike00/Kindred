import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { ContactsList } from "@/components/Contacts/ContactsList"
import {
  contactsListQueryOptions,
  savedFiltersQueryOptions,
} from "@/lib/queries"
import { queryClient } from "@/lib/queryClient"

const searchSchema = z.object({
  search: z.string().optional(),
  saved_filter_id: z.string().optional(),
})

export const Route = createFileRoute("/_layout/contacts/")({
  component: ContactsList,
  validateSearch: searchSchema,
  // Only the active saved-filter id changes which contacts load; the free-text
  // `search` is filtered client-side, so it isn't a loader dep.
  loaderDeps: ({ search }) => ({ savedFilterId: search.saved_filter_id }),
  loader: ({ deps }) =>
    Promise.all([
      queryClient.ensureQueryData(savedFiltersQueryOptions()),
      queryClient.ensureQueryData(contactsListQueryOptions(deps.savedFilterId)),
    ]),
  head: () => ({
    meta: [{ title: "Contacts · Kindred" }],
  }),
})
