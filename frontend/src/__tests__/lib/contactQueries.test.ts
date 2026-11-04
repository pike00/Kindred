import { describe, expect, it, vi } from "vitest"

const listContacts = vi.hoisted(() => vi.fn())
vi.mock("@/client", () => ({ ContactsService: { listContacts } }))
import { contactSearchQueryOptions } from "@/lib/contactQueries"

describe("contactSearchQueryOptions", () => {
  it("uses a unique key for each query and limit", () => {
    const first = contactSearchQueryOptions("alice", 50)
    const second = contactSearchQueryOptions("bob", 50)
    const third = contactSearchQueryOptions("alice", 8)

    expect(first.queryKey).not.toEqual(second.queryKey)
    expect(first.queryKey).not.toEqual(third.queryKey)
  })

  it("normalizes surrounding whitespace in the query key", () => {
    expect(contactSearchQueryOptions("  alice  ", 50).queryKey).toEqual(
      contactSearchQueryOptions("alice", 50).queryKey,
    )
  })

  it("cancels the generated request when the query signal aborts", async () => {
    const cancel = vi.fn()
    listContacts.mockReturnValue(
      Object.assign(Promise.resolve({ data: [], count: 0 }), { cancel }),
    )
    const controller = new AbortController()
    const query = contactSearchQueryOptions("alice", 50)

    const result = query.queryFn!({
      signal: controller.signal,
    } as never)
    controller.abort()

    await result
    expect(cancel).toHaveBeenCalledOnce()
    expect(listContacts).toHaveBeenCalledWith({ limit: 50, search: "alice" })
  })
})
