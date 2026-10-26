import { IDBFactory } from "fake-indexeddb"
import { beforeEach, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal("indexedDB", new IDBFactory())
})

it("keeps drafts with their verified owner across logout and account switching", async () => {
  const session = await import("@/lib/session")
  const db = await import("@/lib/offline-db")
  session.acceptIdentity("account-a")
  await db.addDraft({ id: "draft-a", contactId: "contact-a", body: "private A" })
  expect(await db.getPendingDrafts()).toHaveLength(1)
  session.resetSession()
  await expect(db.getPendingDrafts()).rejects.toThrow()
  session.acceptIdentity("account-b")
  expect(await db.getPendingDrafts()).toEqual([])
  await db.markDraftSynced("draft-a")
  await db.removeDraft("draft-a")
  session.resetSession()
  session.acceptIdentity("account-a")
  expect(await db.getPendingDrafts()).toEqual([
    expect.objectContaining({ id: "draft-a", ownerId: "account-a", contactId: "contact-a" }),
  ])
})

it("quarantines legacy unowned records without replaying or deleting them", async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("kindred-offline", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("draft-queue", { keyPath: "id" })
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const tx = request.result.transaction("draft-queue", "readwrite")
      tx.objectStore("draft-queue").put({ id: "legacy", body: "unknown owner", contactId: "old" })
      tx.oncomplete = () => { request.result.close(); resolve() }
    }
  })
  const session = await import("@/lib/session")
  session.acceptIdentity("account-b")
  const db = await import("@/lib/offline-db")
  expect(await db.getAllDrafts()).toEqual([])
  const quarantined = await new Promise<unknown[]>((resolve) => {
    const request = indexedDB.open("kindred-offline", 2)
    request.onsuccess = () => {
      const tx = request.result.transaction("unowned-draft-quarantine", "readonly")
      const read = tx.objectStore("unowned-draft-quarantine").getAll()
      read.onsuccess = () => resolve(read.result)
      tx.oncomplete = () => request.result.close()
    }
  })
  expect(quarantined).toEqual([expect.objectContaining({ id: "legacy", body: "unknown owner" })])
})

it("refuses A-owned draft operations after a sibling installs B before its storage event", async () => {
  const session = await import("@/lib/session")
  const db = await import("@/lib/offline-db")
  localStorage.setItem("access_token", "token-a")
  session.acceptIdentity("account-a")
  await db.addDraft({ id: "draft-a", contactId: "contact-a", body: "private A" })
  localStorage.setItem("access_token", "token-b")
  await expect(db.addDraft({ id: "must-not-save", contactId: "shared", body: "A body" })).rejects.toThrow("session changed")
  await expect(db.getPendingDrafts()).rejects.toThrow("session changed")
  expect(localStorage.getItem("access_token")).toBe("token-b")
  session.resetSession()
  localStorage.setItem("access_token", "token-a")
  session.acceptIdentity("account-a")
  expect((await db.getPendingDrafts()).map((draft) => draft.id)).toEqual(["draft-a"])
})
