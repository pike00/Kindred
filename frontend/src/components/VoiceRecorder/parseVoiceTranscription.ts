import type { ContactPublic } from "@/client"

export interface ParsedVoiceNote {
  matchedAttendeeIds: string[]
  detectedChannel:
    | "call"
    | "in_person"
    | "text"
    | "email"
    | "video"
    | "social"
    | "other"
  cleanedNotes: string
}

/**
 * Remove initial filler words, stuttering, and audio transcription artifacts.
 */
function stripLeadingFillers(text: string): string {
  let cleaned = text.trim()
  const fillerRegex =
    /^(?:at that|so uh|so um|and uh|and um|okay so|alright so|so|um|uh|like|hey|just|well|and so)\b[\s,:-]*/i

  let prev = ""
  while (cleaned !== prev) {
    prev = cleaned
    cleaned = cleaned.replace(fillerRegex, "").trim()
  }
  return cleaned
}

/**
 * Identify contact attendees from the spoken text.
 */
export function identifyAttendees(
  text: string,
  contacts: ContactPublic[],
): { matchedIds: string[]; matchedNames: string[] } {
  if (!text || contacts.length === 0) {
    return { matchedIds: [], matchedNames: [] }
  }

  const normalizedText = ` ${text.toLowerCase().replace(/['".,/#!$%^&*;:{}=\-_`~()]/g, " ")} `
  const matchedContacts: Array<{ id: string; name: string; index: number }> = []

  // 1. Check full names first (highest precision)
  for (const contact of contacts) {
    const firstName = (contact.first_name || "").trim().toLowerCase()
    const lastName = (contact.last_name || "").trim().toLowerCase()

    if (firstName && lastName) {
      const fullName = `${firstName} ${lastName}`
      const regex = new RegExp(`\\b${fullName}\\b`, "i")
      const match = normalizedText.match(regex)
      if (match && match.index !== undefined) {
        matchedContacts.push({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name}`,
          index: match.index,
        })
      }
    }
  }

  // 2. Check first names if unique among contacts and not already matched
  const firstNameCounts = new Map<string, number>()
  for (const contact of contacts) {
    const fn = (contact.first_name || "").trim().toLowerCase()
    if (fn.length >= 3) {
      firstNameCounts.set(fn, (firstNameCounts.get(fn) || 0) + 1)
    }
  }

  for (const contact of contacts) {
    const fn = (contact.first_name || "").trim().toLowerCase()
    if (
      fn.length >= 3 &&
      firstNameCounts.get(fn) === 1 &&
      !matchedContacts.some((m) => m.id === contact.id)
    ) {
      const regex = new RegExp(`\\b${fn}\\b`, "i")
      const match = normalizedText.match(regex)
      if (match && match.index !== undefined) {
        matchedContacts.push({
          id: contact.id,
          name: contact.first_name || "",
          index: match.index,
        })
      }
    }
  }

  // Sort by order of appearance in the text
  matchedContacts.sort((a, b) => a.index - b.index)

  return {
    matchedIds: matchedContacts.map((m) => m.id),
    matchedNames: matchedContacts.map((m) => m.name),
  }
}

/**
 * Detect the interaction channel from keywords in the transcript.
 */
export function detectChannel(
  text: string,
): "call" | "in_person" | "text" | "email" | "video" | "social" | "other" {
  if (
    /\b(called|phone\s*call|on\s*the\s*phone|spoke\s*on\s*the\s*phone|gave\s*a\s*call|rang)\b/i.test(
      text,
    )
  ) {
    return "call"
  }
  if (
    /\b(texted|sent\s*a\s*text|text\s*message|sms|imessage|messaged|whatsapp)\b/i.test(
      text,
    )
  ) {
    return "text"
  }
  if (
    /\b(emailed|sent\s*an\s*email|wrote\s*an\s*email|email\s*thread)\b/i.test(
      text,
    )
  ) {
    return "email"
  }
  if (
    /\b(zoomed|zoom\s*call|zoom\s*meeting|facetime|facetimed|video\s*call|google\s*meet|teams\s*call|webex)\b/i.test(
      text,
    )
  ) {
    return "video"
  }
  if (
    /\b(dmed|instagram|twitter|tweeted|linkedin|facebook|slack|slacked)\b/i.test(
      text,
    )
  ) {
    return "social"
  }
  if (
    /\b(met\s*with|had\s*lunch|had\s*dinner|had\s*coffee|grabbed\s*coffee|met\s*up|in\s*person|hung\s*out|visited|stopped\s*by|saw)\b/i.test(
      text,
    )
  ) {
    return "in_person"
  }

  return "in_person"
}

/**
 * Clean up the transcribed note by stripping conversational logging preambles
 * (e.g. "I called Nora Taylor and followed up with her about X" -> "Followed up with her about X").
 */
export function cleanTranscriptionText(
  rawText: string,
  matchedNames: string[] = [],
): string {
  if (!rawText) return ""

  let text = stripLeadingFillers(rawText)

  // Pattern: "(I|We) (called|met with|talked to|spoke with|texted|emailed) <Name> (and|to|,|about) <Content>"
  // Strip the preamble and keep the content.
  const namePattern =
    matchedNames.length > 0
      ? matchedNames
          .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join("|")
      : "[A-Za-z\\s]+"

  const preambleRegex = new RegExp(
    `^(?:i|we)?\\s*(?:called|met with|talked to|spoke with|spoke to|texted|emailed|had a call with|caught up with|had a meeting with|met)\\s+(?:${namePattern})\\s*(?:,|and|to|about|regarding)?\\s*`,
    "i",
  )

  const match = text.match(preambleRegex)
  if (match?.[0]) {
    const remainder = text.slice(match[0].length).trim()
    if (remainder.length > 3) {
      text = remainder
    }
  }

  // Also clean up any leading connective words after stripping preamble
  text = text.replace(/^(?:and|to|that|about|regarding|for)\s+/i, "").trim()

  if (!text) {
    text = rawText.trim()
  }

  // Capitalize first character
  text = text.charAt(0).toUpperCase() + text.slice(1)

  // Ensure ending punctuation
  if (!/[.!?]$/.test(text)) {
    text += "."
  }

  return text
}

/**
 * Main parser entry point.
 */
export function parseVoiceTranscription(
  rawText: string,
  contacts: ContactPublic[],
): ParsedVoiceNote {
  const { matchedIds, matchedNames } = identifyAttendees(rawText, contacts)
  const detectedChannel = detectChannel(rawText)
  const cleanedNotes = cleanTranscriptionText(rawText, matchedNames)

  return {
    matchedAttendeeIds: matchedIds,
    detectedChannel,
    cleanedNotes,
  }
}
