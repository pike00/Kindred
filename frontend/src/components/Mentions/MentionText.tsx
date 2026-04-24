import { Link } from "@tanstack/react-router"
import { Fragment } from "react"

import { parseMentions } from "./mentionToken"

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
      <Link
        key={`m-${i}`}
        to="/contacts/$contactId"
        params={{ contactId: m.contactId }}
        className="font-medium text-primary hover:underline"
      >
        @{m.name}
      </Link>,
    )
    cursor = m.end
  })
  if (cursor < text.length) {
    nodes.push(<Fragment key="t-end">{text.slice(cursor)}</Fragment>)
  }
  return <span className={className}>{nodes}</span>
}
