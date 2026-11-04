import { queryOptions } from "@tanstack/react-query"

import { ContactsService } from "@/client"

export const CONTACT_PICKER_LIMIT = 50

/**
 * Canonical contact search used by pickers and command surfaces.
 *
 * The key includes both the normalized query and limit so callers never share
 * a cache entry produced by a different request.
 */
export const contactSearchQueryOptions = (
  query = "",
  limit = CONTACT_PICKER_LIMIT,
) => {
  const search = query.trim()
  return queryOptions({
    queryKey: ["contacts", "search", search, limit],
    queryFn: ({ signal }) => {
      const request = ContactsService.listContacts({
        limit,
        ...(search ? { search } : {}),
      })
      if (signal.aborted) {
        request.cancel()
        return Promise.reject(new DOMException("Aborted", "AbortError"))
      }
      const cancel = () => request.cancel()
      signal.addEventListener("abort", cancel, { once: true })
      return request.finally(() => signal.removeEventListener("abort", cancel))
    },
    staleTime: 30_000,
  })
}
