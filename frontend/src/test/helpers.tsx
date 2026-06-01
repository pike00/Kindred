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
import type { CancelablePromise, ContactPublic, TagPublic } from "@/client"
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

/** Factory for a minimal ContactPublic object. Typed so it stays in sync. */
export function makeContact(
  overrides: Partial<ContactPublic> = {},
): ContactPublic {
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
    is_favorite: false,
    is_archived: false,
    is_deceased: false,
    do_not_contact: false,
    do_not_contact_reason: null,
    contact_frequency_days: null,
    how_we_met: null,
    timezone: null,
    pronouns: null,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    tags: [],
    ...overrides,
  }
}

/**
 * Wrap a value as a CancelablePromise (the SDK return type) so test mocks of
 * generated services typecheck. CancelablePromise is structurally a Promise
 * plus cancel handlers tests don't exercise, so the cast is sound here.
 */
export function cancelable<T>(value: T): CancelablePromise<T> {
  return Promise.resolve(value) as unknown as CancelablePromise<T>
}

/** Factory for a minimal TagPublic object. Typed so it stays in sync. */
export function makeTag(overrides: Partial<TagPublic> = {}): TagPublic {
  return {
    id: "tag-id",
    name: "Friends",
    color: "#3b82f6",
    created_at: "2026-01-01T00:00:00Z",
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
