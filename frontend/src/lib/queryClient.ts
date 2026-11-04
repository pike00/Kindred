import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { cfEnabled } from "@/auth/cf"
import { ApiError } from "@/client"
import { leaveSession, onSessionReset } from "./session"

// Shared on purpose: route `loader`s import this same instance so they can
// `ensureQueryData` into the cache the components read from. A second client
// would warm a different cache and the components would still suspend.
const handleApiError = (error: Error) => {
  if (error instanceof ApiError && error.status === 401) {
    leaveSession(cfEnabled() ? "/" : "/login")
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

onSessionReset(() => {
  void queryClient.cancelQueries()
  queryClient.clear()
})
