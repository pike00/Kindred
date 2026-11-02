import { describe, expect, it } from "vitest"

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
})
