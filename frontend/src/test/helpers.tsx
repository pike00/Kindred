/**
 * Shared test utilities for Kindred frontend tests.
 *
 * Provides:
 *  - renderWithProviders() — renders inside QueryClientProvider with a fresh client
 *  - createQueryClient()  — bare QueryClient suitable for tests (no retries)
 *  - mockRouter           — pre-built vi.mock() factory for @tanstack/react-router
 *
 * Import patterns in tests:
 *   import { renderWithProviders } from "@/test/helpers"
 *   import { vi } from "vitest"
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type RenderOptions, render } from "@testing-library/react"
import { Suspense, type ReactElement, type ReactNode } from "react"
import { ShortcutRegistryProvider } from "@/hooks/useKeyboardShortcuts"

// ---------------------------------------------------------------------------
// QueryClient factory
// ---------------------------------------------------------------------------
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Never retry in tests — failures surface immediately
        retry: false,
        // Don't refetch on window focus
        refetchOnWindowFocus: false,
        // Don't consider data stale immediately — avoids background fetches
        staleTime: Infinity,
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------
interface ExtendedRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, ...options }: ExtendedRenderOptions = {},
) {
  const client = queryClient ?? createQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ShortcutRegistryProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </ShortcutRegistryProvider>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient: client,
  }
}

// ---------------------------------------------------------------------------
// Common mock factories
// ---------------------------------------------------------------------------

/** Factory for a minimal ContactPublic object. */
export function makeContact(
  overrides: Partial<{
    id: string
    first_name: string
    last_name: string | null
    nickname: string | null
    company: string | null
    title: string | null
    birthday: string | null
    prefix: string | null
    middle_name: string | null
    suffix: string | null
    last_contacted_at: string | null
    is_starred: boolean
    is_favorite: boolean
    is_archived: boolean
    is_deceased: boolean
    do_not_contact: boolean
    do_not_contact_reason: string | null
    contact_frequency_days: number | null
    how_we_met: string | null
    timezone: string | null
    pronouns: string | null
    tags: { id: string; name: string; color: string | null }[]
  }> = {},
) {
  return {
    id: "test-contact-id",
    first_name: "Alice",
    last_name: "Smith",
    nickname: null,
    company: null,
    title: null,
    birthday: null,
    prefix: null,
    middle_name: null,
    suffix: null,
    last_contacted_at: null,
    is_starred: false,
    is_favorite: false,
    is_archived: false,
    is_deceased: false,
    do_not_contact: false,
    do_not_contact_reason: null,
    contact_frequency_days: null,
    how_we_met: null,
    timezone: null,
    pronouns: null,
    tags: [],
    ...overrides,
  }
}

/** Factory for a minimal TagPublic object. */
export function makeTag(
  overrides: Partial<{ id: string; name: string; color: string | null }> = {},
) {
  return {
    id: "tag-id",
    name: "Friends",
    color: "#3b82f6",
    ...overrides,
  }
}

/** Factory for a minimal JournalEntryPublic object. */
export function makeJournalEntry(
  overrides: Partial<{
    id: string
    title: string
    body: string | null
    created_at: string
  }> = {},
) {
  return {
    id: "journal-id",
    title: "Test Entry",
    body: "Test body",
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/** Factory for a minimal ReminderPublic object. */
export function makeReminder(
  overrides: Partial<{
    id: string
    title: string
    remind_at: string
    contact_id: string | null
  }> = {},
) {
  return {
    id: "reminder-id",
    title: "Test Reminder",
    remind_at: new Date(Date.now() + 3_600_000).toISOString(),
    contact_id: null,
    ...overrides,
  }
}

/** Factory for a minimal UserPublic object. */
export function makeUser(
  overrides: Partial<{
    id: string
    email: string
    full_name: string | null
    is_active: boolean
    is_superuser: boolean
  }> = {},
) {
  return {
    id: "user-id",
    email: "alice@example.com",
    full_name: "Alice Smith",
    is_active: true,
    is_superuser: false,
    ...overrides,
  }
}
