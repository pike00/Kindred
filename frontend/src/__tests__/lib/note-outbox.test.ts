import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockCreateNote = vi.hoisted(() => vi.fn())

vi.mock("@/client", async () => {
  const actual = await vi.importActual("@/client")
  return {
    ...actual,
    NotesService: {
      createNoteRoute: mockCreateNote,
    },
  }
})

describe("note outbox", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal("indexedDB", new IDBFactory())
    localStorage.clear()
  })

  it("retries a failed draft with the same id without blocking other drafts", async () => {
    const session = await import("@/lib/session")
    const db = await import("@/lib/offline-db")
    const outbox = await import("@/lib/note-outbox")
    session.acceptIdentity("account-a")

    const first = await outbox.enqueueNote("contact-a", "first note")
    const second = await outbox.enqueueNote("contact-b", "second note")
    mockCreateNote.mockImplementation(async ({ requestBody }) => {
      if (requestBody.body === "first note") throw new Error("temporary failure")
      return { id: "note-b" }
    })

    const results = await outbox.syncNoteOutbox({ force: true })

    expect(mockCreateNote).toHaveBeenCalledWith({
      requestBody: {
        contact_id: "contact-a",
        body: "first note",
        client_id: first.id,
      },
    })
    expect(mockCreateNote).toHaveBeenCalledWith({
      requestBody: {
        contact_id: "contact-b",
        body: "second note",
        client_id: second.id,
      },
    })
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, synced: false }),
        expect.objectContaining({ id: second.id, synced: true }),
      ]),
    )

    const pending = await db.getPendingDrafts()
    expect(pending).toHaveLength(1)
    expect(pending[0]).toEqual(
      expect.objectContaining({
        id: first.id,
        attempts: 1,
        error: "temporary failure",
      }),
    )
    expect(Date.parse(pending[0].nextAttemptAt!)).toBeGreaterThan(Date.now())

    mockCreateNote.mockResolvedValue({ id: "note-a" })
    await outbox.syncNoteOutbox({ force: true })

    expect(mockCreateNote).toHaveBeenLastCalledWith({
      requestBody: {
        contact_id: "contact-a",
        body: "first note",
        client_id: first.id,
      },
    })
    expect(await db.getPendingDrafts()).toEqual([])
  })
})
