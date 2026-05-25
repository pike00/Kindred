/**
 * Seed utility for dev-mode demo data.
 *
 * Calls the backend `/api/v1/private/seed` endpoint which triggers
 * the server-side seed_fake_data.py script. The seed is idempotent
 * at the backend level (it won't duplicate existing data for the same user).
 *
 * These helpers are no-ops in production (import.meta.env.DEV === false).
 */

import type { UseMutationResult } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PrivateService } from "@/client"

export interface SeedOptions {
  count?: number
  reset?: boolean
  rngSeed?: number | null
}

/**
 * Trigger a full seed (contacts + related entities) via the backend API.
 * Only works when the backend private routes are enabled (local/dev).
 */
export async function seedDemoData(options: SeedOptions = {}) {
  if (!import.meta.env.DEV) {
    console.warn("seedDemoData is a dev-only feature")
    return
  }

  const { count = 50, reset = false, rngSeed = null } = options

  return PrivateService.seedData({
    count,
    reset,
    rngSeed,
  })
}

/**
 * React hook that returns a mutation for seeding demo data.
 * Invalidates relevant query keys on success.
 */
export function useSeedDemo(): UseMutationResult<
  Record<string, unknown> | undefined,
  Error,
  SeedOptions
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (options: SeedOptions = {}) => seedDemoData(options),
    onSuccess: () => {
      // Invalidate all known list queries so the UI refreshes
      const keys = [
        ["contacts"],
        ["interactions"],
        ["reminders"],
        ["tags"],
        ["journal"],
        ["losing-touch"],
        ["interactions-recent"],
      ]
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/**
 * Minimal seed: just enough data to populate empty states for UX testing.
 * Creates ~8 contacts with a handful of related records.
 */
export async function seedMinimalDemo() {
  return seedDemoData({ count: 8, reset: false, rngSeed: 42 })
}
