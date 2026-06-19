import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/client"

// Shared on purpose: route `loader`s import this same instance so they can
// `ensureQueryData` into the cache the components read from. A second client
// would warm a different cache and the components would still suspend.
const handleApiError = (error: Error) => {
  if (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  ) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})
