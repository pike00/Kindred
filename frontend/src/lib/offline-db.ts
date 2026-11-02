import { assertSession, captureSession, currentAccountId } from "./session"

export interface OfflineDraft {
  id: string
  ownerId: string
  contactId: string
  body: string
  createdAt: string
  syncedAt?: string
  error?: string
  attempts?: number
  lastAttemptAt?: string
  nextAttemptAt?: string
}

const DB_NAME = "kindred-offline"
const STORE_NAME = "draft-queue"
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    let blocked = false
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      if (blocked) {
        request.transaction?.abort()
        return
      }
      const db = request.result
      // Version 1 never stored an owner. It cannot be safely attributed to any
      // subsequent login. Quarantine it without exposing it through account APIs.
      if (db.objectStoreNames.contains(STORE_NAME)) {
        request.transaction!.objectStore(STORE_NAME).name =
          "unowned-draft-quarantine"
        localStorage.setItem("kindred-legacy-drafts-quarantined", "true")
      }
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: ["ownerId", "id"],
      })
      store.createIndex("ownerId", "ownerId")
    }
    request.onblocked = () => {
      blocked = true
      dbPromise = null
      reject(
        new Error(
          "Close other Kindred tabs and reload to update offline drafts safely.",
        ),
      )
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close()
        dbPromise = null
      }
      resolve(request.result)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    ownerId: string,
    done: (value: T) => void,
  ) => void,
): Promise<T> {
  const session = captureSession()
  const ownerId = currentAccountId()
  const db = await openDB()
  assertSession(session)
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    let result: T
    transaction.oncomplete = () => {
      try {
        assertSession(session)
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
    operation(transaction.objectStore(STORE_NAME), ownerId, (value) => {
      result = value
    })
  })
}

export function addDraft(
  draft: Omit<OfflineDraft, "ownerId" | "createdAt"> & { createdAt?: string },
): Promise<OfflineDraft> {
  return withStore("readwrite", (store, ownerId, done) => {
    const fullDraft = {
      ...draft,
      ownerId,
      createdAt: draft.createdAt || new Date().toISOString(),
    }
    store.put(fullDraft)
    done(fullDraft)
  })
}

export function getAllDrafts(): Promise<OfflineDraft[]> {
  return withStore("readonly", (store, ownerId, done) => {
    const request = store.index("ownerId").getAll(ownerId)
    request.onsuccess = () => done(request.result as OfflineDraft[])
  })
}

export async function getPendingDrafts(): Promise<OfflineDraft[]> {
  // Missing syncedAt values have no index entry; enumerate the owner's records.
  return (await getAllDrafts())
    .filter((draft) => !draft.syncedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function getDraft(id: string): Promise<OfflineDraft | undefined> {
  return withStore("readonly", (store, ownerId, done) => {
    const request = store.get([ownerId, id])
    request.onsuccess = () => done(request.result as OfflineDraft | undefined)
  })
}

function updateDraft(
  id: string,
  update: (draft: OfflineDraft) => void,
): Promise<void> {
  return withStore("readwrite", (store, ownerId, done) => {
    const request = store.get([ownerId, id])
    request.onsuccess = () => {
      const draft = request.result as OfflineDraft | undefined
      if (draft) {
        update(draft)
        store.put(draft)
      }
      done(undefined)
    }
  })
}

export function markDraftSynced(
  id: string,
  syncedAt = new Date().toISOString(),
): Promise<void> {
  return updateDraft(id, (draft) => {
    draft.syncedAt = syncedAt
    draft.error = undefined
  })
}

export function markDraftError(id: string, error: string): Promise<void> {
  return updateDraft(id, (draft) => {
    draft.error = error
  })
}

export function markDraftAttempt(
  id: string,
  {
    error,
    attempts,
    attemptedAt,
    nextAttemptAt,
  }: {
    error: string
    attempts: number
    attemptedAt: string
    nextAttemptAt: string
  },
): Promise<void> {
  return updateDraft(id, (draft) => {
    draft.error = error
    draft.attempts = attempts
    draft.lastAttemptAt = attemptedAt
    draft.nextAttemptAt = nextAttemptAt
  })
}

/** Remove only the current account's drafts; used for tests and resets. */
export function clearDrafts(): Promise<void> {
  return withStore("readwrite", (store, ownerId, done) => {
    const request = store.index("ownerId").getAllKeys(ownerId)
    request.onsuccess = () => {
      for (const key of request.result) store.delete(key)
      done(undefined)
    }
  })
}

export function removeDraft(id: string): Promise<void> {
  return withStore("readwrite", (store, ownerId, done) => {
    store.delete([ownerId, id])
    done(undefined)
  })
}

export function generateUUID(): string {
  return crypto.randomUUID()
}
