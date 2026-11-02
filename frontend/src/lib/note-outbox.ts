import { NotesService } from "@/client"

import {
  addDraft,
  generateUUID,
  getPendingDrafts,
  markDraftAttempt,
  markDraftSynced,
  type OfflineDraft,
} from "./offline-db"
import { queryClient } from "./queryClient"
import {
  assertSession,
  captureSession,
  onIdentityChange,
  SessionChangedError,
} from "./session"

export interface NoteSyncResult {
  id: string
  contactId: string
  synced: boolean
  error?: string
}

interface SyncOptions {
  force?: boolean
  ids?: string[]
}

const listeners = new Set<() => void>()
let activeSync: Promise<NoteSyncResult[]> | null = null
let started = false
let retryInterval: number | null = null
let unsubscribeIdentity: (() => void) | null = null

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeNoteOutbox(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Note sync failed"
}

function retryDelay(attempts: number): number {
  return Math.min(5 * 60_000, 5_000 * 2 ** Math.min(attempts - 1, 6))
}

export async function enqueueNote(
  contactId: string,
  body: string,
): Promise<OfflineDraft> {
  const draft = await addDraft({
    id: generateUUID(),
    contactId,
    body,
    createdAt: new Date().toISOString(),
  })
  notify()
  return draft
}

async function runSync({
  force = false,
  ids,
}: SyncOptions): Promise<NoteSyncResult[]> {
  if (!isOnline()) return []

  const session = captureSession()
  const now = Date.now()
  const idsToSync = ids ? new Set(ids) : null
  const drafts = (await getPendingDrafts()).filter((draft) => {
    if (idsToSync && !idsToSync.has(draft.id)) return false
    if (force || !draft.nextAttemptAt) return true
    return Date.parse(draft.nextAttemptAt) <= now
  })
  const results: NoteSyncResult[] = []

  for (const draft of drafts) {
    assertSession(session)
    try {
      await NotesService.createNoteRoute({
        requestBody: {
          contact_id: draft.contactId,
          body: draft.body,
          client_id: draft.id,
        },
      })
      assertSession(session)
      await markDraftSynced(draft.id)
      queryClient.invalidateQueries({ queryKey: ["notes", draft.contactId] })
      results.push({ id: draft.id, contactId: draft.contactId, synced: true })
    } catch (error) {
      if (error instanceof SessionChangedError) throw error
      const attempts = (draft.attempts ?? 0) + 1
      const attemptedAt = new Date().toISOString()
      const nextAttemptAt = new Date(
        Date.now() + retryDelay(attempts),
      ).toISOString()
      const message = errorMessage(error)
      await markDraftAttempt(draft.id, {
        error: message,
        attempts,
        attemptedAt,
        nextAttemptAt,
      })
      results.push({
        id: draft.id,
        contactId: draft.contactId,
        synced: false,
        error: message,
      })
    } finally {
      notify()
    }
  }

  return results
}

export async function syncNoteOutbox(
  options: SyncOptions = {},
): Promise<NoteSyncResult[]> {
  if (activeSync) await activeSync.catch(() => [])
  const sync = runSync(options).finally(() => {
    activeSync = null
    notify()
  })
  activeSync = sync
  return sync
}

function requestSync() {
  void syncNoteOutbox().catch((error: unknown) => {
    if (!(error instanceof SessionChangedError)) console.error(error)
  })
}

export function startNoteOutbox(): void {
  if (started || typeof window === "undefined") return
  started = true
  window.addEventListener("online", requestSync)
  unsubscribeIdentity = onIdentityChange(requestSync)
  retryInterval = window.setInterval(requestSync, 15_000)
}

export function stopNoteOutbox(): void {
  if (!started) return
  started = false
  window.removeEventListener("online", requestSync)
  unsubscribeIdentity?.()
  unsubscribeIdentity = null
  if (retryInterval !== null) window.clearInterval(retryInterval)
  retryInterval = null
}
