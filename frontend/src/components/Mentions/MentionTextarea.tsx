import { useQuery } from "@tanstack/react-query"
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { type ContactPublic, ContactsService } from "@/client"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { findActiveTrigger, formatMentionToken } from "./mentionToken"

const MAX_SUGGESTIONS = 6

function contactLabel(contact: ContactPublic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    "Unnamed contact"
  )
}

function rankContacts(
  contacts: ContactPublic[],
  query: string,
): ContactPublic[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return contacts.slice(0, MAX_SUGGESTIONS)
  const scored = contacts
    .map((c) => {
      const label = contactLabel(c).toLowerCase()
      if (label.startsWith(needle)) return { c, score: 0 }
      if (label.includes(needle)) return { c, score: 1 }
      const company = (c.company ?? "").toLowerCase()
      if (company.includes(needle)) return { c, score: 2 }
      return { c, score: -1 }
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => a.score - b.score)
  return scored.slice(0, MAX_SUGGESTIONS).map((x) => x.c)
}

export interface MentionTextareaProps
  extends Omit<React.ComponentProps<"textarea">, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
}

export const MentionTextarea = forwardRef<
  HTMLTextAreaElement,
  MentionTextareaProps
>(function MentionTextarea({ value, onChange, className, ...rest }, ref) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el
      if (typeof ref === "function") ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )

  const [trigger, setTrigger] = useState<{
    query: string
    triggerStart: number
  } | null>(null)
  const [highlight, setHighlight] = useState(0)

  const { data } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => ContactsService.listContacts(),
    enabled: trigger !== null,
  })

  const suggestions = useMemo(
    () => (trigger ? rankContacts(data?.data ?? [], trigger.query) : []),
    [data, trigger],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on query change
  useEffect(() => {
    setHighlight(0)
  }, [trigger?.query])

  const updateTrigger = useCallback((text: string, caret: number) => {
    setTrigger(findActiveTrigger(text, caret))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    updateTrigger(e.target.value, e.target.selectionStart)
  }

  const handleKeyUpOrClick = (
    e:
      | React.KeyboardEvent<HTMLTextAreaElement>
      | React.MouseEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.currentTarget
    updateTrigger(el.value, el.selectionStart)
  }

  const insertMention = useCallback(
    (contact: ContactPublic) => {
      if (!trigger || !innerRef.current) return
      const el = innerRef.current
      const caret = el.selectionStart
      const before = value.slice(0, trigger.triggerStart)
      const after = value.slice(caret)
      const token = formatMentionToken(contactLabel(contact), contact.id)
      const next = `${before}${token} ${after}`
      const nextCaret = before.length + token.length + 1
      onChange(next)
      setTrigger(null)
      queueMicrotask(() => {
        el.focus()
        el.setSelectionRange(nextCaret, nextCaret)
      })
    },
    [onChange, trigger, value],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!trigger || suggestions.length === 0) {
      rest.onKeyDown?.(e)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
      return
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      const picked = suggestions[highlight]
      if (picked) insertMention(picked)
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      setTrigger(null)
      return
    }
    rest.onKeyDown?.(e)
  }

  return (
    <div className="relative">
      <Textarea
        {...rest}
        ref={setRefs}
        value={value}
        onChange={handleChange}
        onKeyUp={handleKeyUpOrClick}
        onClick={handleKeyUpOrClick}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          rest.onBlur?.(e)
          setTimeout(() => setTrigger(null), 120)
        }}
        className={className}
      />
      {trigger && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((contact, i) => (
            <button
              key={contact.id}
              type="button"
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(contact)
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                i === highlight && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate font-medium">
                {contactLabel(contact)}
              </span>
              {contact.company && (
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {contact.company}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})
