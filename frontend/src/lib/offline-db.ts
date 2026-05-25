/**
 * IndexedDB utility for offline draft queue
 * Stores notes drafted offline with sync status
 */

export interface OfflineDraft {
  id: string // client-generated UUID
  contactId: string
  body: string
  createdAt: string // ISO timestamp
  syncedAt?: string // ISO timestamp when synced
  error?: string // error message if sync failed
}

const DB_NAME = "kindred-offline"
const DB_VERSION = 1
const STORE_NAME = "draft-queue"

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("contactId", "contactId", { unique: false })
        store.createIndex("syncedAt", "syncedAt", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

export async function addDraft(
  draft: Omit<OfflineDraft, "createdAt"> & { createdAt?: string },
): Promise<OfflineDraft> {
  const db = await openDB()
  const fullDraft: OfflineDraft = {
    ...draft,
    createdAt: draft.createdAt || new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(fullDraft)

    request.onsuccess = () => resolve(fullDraft)
    request.onerror = () => reject(request.error)
  })
}

export async function getPendingDrafts(): Promise<OfflineDraft[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index("syncedAt")
    const request = index.getAll(null)

    request.onsuccess = () => {
      const allDrafts = request.result as OfflineDraft[]
      // Return drafts that haven't been synced (syncedAt is undefined)
      const pending = allDrafts.filter((d) => !d.syncedAt)
      resolve(pending)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function markDraftSynced(
  id: string,
  syncedAt: string = new Date().toISOString(),
): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const draft = getRequest.result as OfflineDraft
      if (draft) {
        draft.syncedAt = syncedAt
        draft.error = undefined // Clear any previous errors
        const putRequest = store.put(draft)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        resolve()
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function markDraftError(id: string, error: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const draft = getRequest.result as OfflineDraft
      if (draft) {
        draft.error = error
        const putRequest = store.put(draft)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        resolve()
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function removeDraft(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getAllDrafts(): Promise<OfflineDraft[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as OfflineDraft[])
    request.onerror = () => reject(request.error)
  })
}

export function generateUUID(): string {
  // Simple UUID v4 generation for client-side use
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
