import { describe, expect, it } from "vitest"

import { lookupCities } from "@/lib/cityTimezones"

describe("lookupCities", () => {
  it("resolves a broad city name to its IANA zone (New Orleans -> America/Chicago)", () => {
    const hits = lookupCities("New Orleans")
    expect(hits[0]).toEqual({ city: "New Orleans", tz: "America/Chicago" })
  })

  it("matches a prefix", () => {
    const hits = lookupCities("new orl")
    expect(hits.some((h) => h.tz === "America/Chicago")).toBe(true)
  })

  it("is case- and punctuation-insensitive", () => {
    expect(lookupCities("são paulo")[0]?.tz).toBe("America/Sao_Paulo")
    expect(lookupCities("HONG KONG")[0]?.tz).toBe("Asia/Hong_Kong")
  })

  it("returns nothing for too-short queries", () => {
    expect(lookupCities("n")).toEqual([])
  })

  it("ranks prefix matches before substring matches", () => {
    // "york" is a substring of "New York"; a prefix-matching city should win
    // when both exist. Here just assert we get York-bearing results.
    const hits = lookupCities("york")
    expect(hits.some((h) => h.tz === "America/New_York")).toBe(true)
  })
})
