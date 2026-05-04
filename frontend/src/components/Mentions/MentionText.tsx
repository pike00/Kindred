import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Fragment } from "react"

import { ContactsService } from "@/client"

import { parseMentions } from "./mentionToken"

function formatName(c: { first_name: string; last_name?: string | null }) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "(unnamed)"
}

function MentionLink({
  contactId,
  fallbackName,
}: {
  contactId: string
  fallbackName: string
}) {
  // Resolve the current contact name at render time so renames propagate
  // without rewriting note bodies. The cached name on the token is a fallback
  // for unresolved IDs (deleted contact, network error).
  const { data } = useQuery({
    queryKey: ["contacts", contactId],
    queryFn: () => ContactsService.getContact({ contactId }),
    staleTime: 30_000,
  })

  const displayName = data ? formatName(data) : fallbackName

  return (
    <Link
      to="/contacts/$contactId"
      params={{ contactId }}
      className="font-medium text-primary hover:underline"
    >
      @{displayName}
    </Link>
  )
}

export function MentionText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const mentions = parseMentions(text)
  if (mentions.length === 0) {
    return <span className={className}>{text}</span>
  }

  const nodes: React.ReactNode[] = []
  let cursor = 0
  mentions.forEach((m, i) => {
    if (m.start > cursor) {
      nodes.push(
        <Fragment key={`t-${i}`}>{text.slice(cursor, m.start)}</Fragment>,
      )
    }
    nodes.push(
      <MentionLink
        key={`m-${i}`}
        contactId={m.contactId}
        fallbackName={m.name}
      />,
    )
    cursor = m.end
  })
  if (cursor < text.length) {
    nodes.push(<Fragment key="t-end">{text.slice(cursor)}</Fragment>)
  }
  return <span className={className}>{nodes}</span>
}
