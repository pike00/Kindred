import { describe, expect, it } from "vitest"
import {
  findActiveTrigger,
  formatMentionToken,
  MENTION_TOKEN_REGEX,
  parseMentions,
} from "../../../components/Mentions/mentionToken"

describe("MENTION_TOKEN_REGEX", () => {
  it("matches valid mention tokens", () => {
    const text = "@[John Doe](contact-123)"
    const matches = [...text.matchAll(MENTION_TOKEN_REGEX)]
    expect(matches).toHaveLength(1)
    expect(matches[0][1]).toBe("John Doe")
    expect(matches[0][2]).toBe("contact-123")
  })

  it("matches multiple mention tokens in text", () => {
    const text = "@[John](id1) and @[Jane](id2)"
    const matches = [...text.matchAll(MENTION_TOKEN_REGEX)]
    expect(matches).toHaveLength(2)
  })

  it("does not match incomplete tokens", () => {
    const text = "@[John (id1)"
    const matches = [...text.matchAll(MENTION_TOKEN_REGEX)]
    expect(matches).toHaveLength(0)
  })

  it("does not match malformed tokens", () => {
    const text = "@[John]id1"
    const matches = [...text.matchAll(MENTION_TOKEN_REGEX)]
    expect(matches).toHaveLength(0)
  })
})

describe("parseMentions", () => {
  it("returns empty array for text without mentions", () => {
    expect(parseMentions("hello world")).toEqual([])
  })

  it("parses single mention", () => {
    const result = parseMentions("@[John Doe](contact-123)")
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      name: "John Doe",
      contactId: "contact-123",
      start: 0,
      end: 24,
    })
  })

  it("parses multiple mentions", () => {
    const result = parseMentions("Hi @[John](id1) and @[Jane](id2)")
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("John")
    expect(result[0].contactId).toBe("id1")
    expect(result[1].name).toBe("Jane")
    expect(result[1].contactId).toBe("id2")
  })

  it("parses mentions in middle of text", () => {
    const result = parseMentions("Hello @[John Doe](id123) how are you?")
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("John Doe")
    expect(result[0].start).toBe(6)
  })

  it("calculates correct start and end positions", () => {
    const text = "Check this @[Alice](abc-123) out"
    const result = parseMentions(text)
    expect(result[0].start).toBe(11)
    expect(result[0].end).toBe(28)
    expect(text.substring(result[0].start, result[0].end)).toBe(
      "@[Alice](abc-123)",
    )
  })

  it("handles consecutive mentions", () => {
    const result = parseMentions("@[John](id1)@[Jane](id2)")
    expect(result).toHaveLength(2)
    expect(result[0].contactId).toBe("id1")
    expect(result[1].contactId).toBe("id2")
  })

  it("handles mentions with special characters in ID", () => {
    const result = parseMentions("@[John](id-123-abc-def)")
    expect(result[0].contactId).toBe("id-123-abc-def")
  })

  it("handles mentions with numbers in name", () => {
    const result = parseMentions("@[John123 Doe456](id)")
    expect(result[0].name).toBe("John123 Doe456")
  })

  it("handles empty mentions text", () => {
    expect(parseMentions("")).toEqual([])
  })

  it("handles mentions with whitespace in name", () => {
    const result = parseMentions("@[John Michael Doe](id)")
    expect(result[0].name).toBe("John Michael Doe")
  })
})

describe("formatMentionToken", () => {
  it("formats valid mention token", () => {
    const result = formatMentionToken("John Doe", "contact-123")
    expect(result).toBe("@[John Doe](contact-123)")
  })

  it("removes brackets from name", () => {
    const result = formatMentionToken("John [Doe]", "id")
    expect(result).toBe("@[John Doe](id)")
  })

  it("removes opening bracket from name", () => {
    const result = formatMentionToken("[John", "id")
    expect(result).toBe("@[John](id)")
  })

  it("removes closing bracket from name", () => {
    const result = formatMentionToken("John]", "id")
    expect(result).toBe("@[John](id)")
  })

  it("handles empty name by using unknown", () => {
    const result = formatMentionToken("", "id")
    expect(result).toBe("@[unknown](id)")
  })

  it("handles name with only brackets", () => {
    const result = formatMentionToken("[]", "id")
    expect(result).toBe("@[unknown](id)")
  })

  it("handles name with only whitespace", () => {
    const result = formatMentionToken("   ", "id")
    expect(result).toBe("@[unknown](id)")
  })

  it("trims whitespace from name", () => {
    const result = formatMentionToken("  John Doe  ", "id")
    expect(result).toBe("@[John Doe](id)")
  })

  it("handles name with mixed brackets", () => {
    const result = formatMentionToken("[John ] Doe]", "id")
    expect(result).toBe("@[John  Doe](id)")
  })

  it("handles name with brackets and spaces", () => {
    const result = formatMentionToken("[ John [ Doe ] ]", "id")
    expect(result).toBe("@[John  Doe](id)")
  })

  it("preserves contact ID exactly", () => {
    const result = formatMentionToken("John", "special-id-123-xyz")
    expect(result).toBe("@[John](special-id-123-xyz)")
  })

  it("handles name with unicode characters", () => {
    const result = formatMentionToken("François Müller", "id")
    expect(result).toBe("@[François Müller](id)")
  })

  it("handles multiple consecutive brackets in name", () => {
    const result = formatMentionToken("John [[[Doe]]]", "id")
    expect(result).toBe("@[John Doe](id)")
  })
})

describe("findActiveTrigger", () => {
  it("returns null when caret is at or before 0", () => {
    expect(findActiveTrigger("@test", 0)).toBeNull()
    expect(findActiveTrigger("@test", -1)).toBeNull()
  })

  it("returns null when caret is beyond text length", () => {
    expect(findActiveTrigger("hello", 10)).toBeNull()
  })

  it("finds trigger at caret position", () => {
    const result = findActiveTrigger("@joh", 4)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("joh")
    expect(result?.triggerStart).toBe(0)
  })

  it("returns null when no @ symbol found before caret", () => {
    expect(findActiveTrigger("hello world", 5)).toBeNull()
  })

  it("returns null when @ is preceded by alphanumeric", () => {
    expect(findActiveTrigger("a@hello", 7)).toBeNull()
  })

  it("returns null when @ is preceded by underscore", () => {
    expect(findActiveTrigger("_@hello", 7)).toBeNull()
  })

  it("returns trigger when @ is preceded by space", () => {
    const result = findActiveTrigger("hello @joh", 10)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("joh")
  })

  it("returns trigger when @ is at start of string", () => {
    const result = findActiveTrigger("@joh", 4)
    expect(result).not.toBeNull()
    expect(result?.triggerStart).toBe(0)
  })

  it("returns null when query contains whitespace", () => {
    expect(findActiveTrigger("@joh n", 6)).toBeNull()
  })

  it("returns null when query contains closing bracket", () => {
    expect(findActiveTrigger("@joh]n", 6)).toBeNull()
  })

  it("returns null when query contains opening paren", () => {
    expect(findActiveTrigger("@joh(n", 6)).toBeNull()
  })

  it("returns null when query contains closing paren", () => {
    expect(findActiveTrigger("@joh)n", 6)).toBeNull()
  })

  it("handles query with alphanumeric characters", () => {
    const result = findActiveTrigger("hello @abc123", 13)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("abc123")
  })

  it("returns null when @ is preceded by digit", () => {
    expect(findActiveTrigger("1@hello", 7)).toBeNull()
  })

  it("handles multiple @ symbols finding closest", () => {
    const result = findActiveTrigger("@first @second", 14)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("second")
    expect(result?.triggerStart).toBe(7)
  })

  it("returns null when searching stops at space before @", () => {
    const result = findActiveTrigger("hello world @test", 17)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("test")
  })

  it("handles @ with empty query before caret", () => {
    const result = findActiveTrigger("@", 1)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("")
  })

  it("returns null when @ precedes non-alphanumeric preceding char but query has space", () => {
    expect(findActiveTrigger("  @joh n", 8)).toBeNull()
  })

  it("handles @ in middle of text with valid trigger", () => {
    const result = findActiveTrigger("say @hello there", 10)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("hello")
    expect(result?.triggerStart).toBe(4)
  })

  it("handles @ with dash in query", () => {
    const result = findActiveTrigger("@hello-world", 12)
    expect(result).not.toBeNull()
    expect(result?.query).toBe("hello-world")
  })

  it("returns null when query starts with space after @", () => {
    expect(findActiveTrigger("@ hello", 7)).toBeNull()
  })
})
