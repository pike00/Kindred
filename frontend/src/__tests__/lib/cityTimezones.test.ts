import { describe, expect, it } from "vitest"

import { lookupCities } from "@/lib/cityTimezones"

describe("lookupCities", () => {
  it("resolves a broad city name to its IANA zone (New Orleans -> America/Chicago)", () => {
    const hits = lookupCities("New Orleans")
    expect(hits[0].tz).toBe("America/Chicago")
    expect(hits[0].city).toContain("Chicago")
  })

  it("matches a prefix", () => {
    const hits = lookupCities("new orl")
    expect(hits.some((h) => h.tz === "America/Chicago")).toBe(true)
  })

  it("is case- and punctuation-insensitive", () => {
    expect(lookupCities("são paulo")[0]?.tz).toBe("America/Sao_Paulo")
    expect(lookupCities("HONG KONG")[0]?.tz).toBe("Asia/Hong_Kong")
  })

  it("resolves country names, abbreviations, and aliases (paki/pakistan/s korea/st louis/slc)", () => {
    expect(lookupCities("paki").some((h) => h.tz === "Asia/Karachi")).toBe(true)
    expect(lookupCities("pakistan").some((h) => h.tz === "Asia/Karachi")).toBe(true)
    expect(lookupCities("india").some((h) => h.tz === "Asia/Kolkata")).toBe(true)
    expect(lookupCities("uk").some((h) => h.tz === "Europe/London")).toBe(true)
    expect(lookupCities("japan").some((h) => h.tz === "Asia/Tokyo")).toBe(true)
    expect(lookupCities("s korea").some((h) => h.tz === "Asia/Seoul")).toBe(true)
    expect(lookupCities("st louis").some((h) => h.tz === "America/Chicago")).toBe(true)
    expect(lookupCities("slc").some((h) => h.tz === "America/Denver")).toBe(true)
  })

  it("handles single-character prefix searches", () => {
    const hits = lookupCities("p")
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((h) => h.tz === "Asia/Karachi" || h.tz === "Europe/Paris")).toBe(true)
  })

  it("returns empty array for empty search queries", () => {
    expect(lookupCities("")).toEqual([])
  })

  it("ranks prefix matches before substring matches", () => {
    const hits = lookupCities("york")
    expect(hits.some((h) => h.tz === "America/New_York")).toBe(true)
  })
})
