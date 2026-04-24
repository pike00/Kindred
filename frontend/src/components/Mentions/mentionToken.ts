// Token format: @[Name](contact_id) - backs improvements.md item 2 (note_mention table)

export const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

export type ParsedMention = {
  name: string
  contactId: string
  start: number
  end: number
}

export function parseMentions(text: string): ParsedMention[] {
  const results: ParsedMention[] = []
  for (const match of text.matchAll(MENTION_TOKEN_REGEX)) {
    if (match.index === undefined) continue
    results.push({
      name: match[1],
      contactId: match[2],
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return results
}

export function formatMentionToken(name: string, contactId: string): string {
  const safeName = name.replace(/[[\]]/g, "").trim() || "unknown"
  return `@[${safeName}](${contactId})`
}

type TriggerMatch = {
  query: string
  triggerStart: number
}

export function findActiveTrigger(
  value: string,
  caret: number,
): TriggerMatch | null {
  if (caret <= 0 || caret > value.length) return null

  let i = caret - 1
  while (i >= 0) {
    const ch = value[i]
    if (ch === "@") {
      const prev = i === 0 ? "" : value[i - 1]
      if (prev && /[A-Za-z0-9_]/.test(prev)) return null
      const query = value.slice(i + 1, caret)
      if (/[\s\][()]/.test(query)) return null
      return { query, triggerStart: i }
    }
    if (/\s/.test(ch)) return null
    i--
  }
  return null
}
