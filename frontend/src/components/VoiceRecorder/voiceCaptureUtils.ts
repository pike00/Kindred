import type {
  ContactUpdateAction,
  InteractionAction,
  LifeEventAction,
  NoteAction,
  ReminderAction,
} from "@/client"

export type VoiceAction =
  | InteractionAction
  | NoteAction
  | ContactUpdateAction
  | LifeEventAction
  | ReminderAction

export function dateTimeLocalToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const pad = (part: number) => String(Math.abs(part)).padStart(2, "0")
  const local = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-")
  const time = [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(":")
  return `${local}T${time}${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
}

export function isoToDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ""
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function validateActions(actions: VoiceAction[]): string[] {
  const errors: string[] = []
  for (const action of actions) {
    if (action.enabled === false) continue
    switch (action.kind) {
      case "interaction": {
        if (!action.attendee_ids?.length)
          errors.push("Interaction needs at least one attendee.")
        if (!action.occurred_at)
          errors.push("Interaction needs a date and time.")
        else if (new Date(action.occurred_at).getTime() > Date.now())
          errors.push("Interaction date and time must be in the past.")
        if (!action.notes?.trim()) errors.push("Interaction needs notes.")
        break
      }
      case "note":
        if (!action.contact_id) errors.push("Note needs a contact.")
        if (!action.body.trim()) errors.push("Note needs text.")
        break
      case "contact_update": {
        if (!action.contact_id) errors.push("Contact update needs a contact.")
        if (!action.fields.length)
          errors.push("Contact update needs at least one field.")
        const seen = new Set<string>()
        for (const field of action.fields) {
          if (seen.has(field.field)) {
            errors.push("Contact update contains a repeated field.")
            break
          }
          seen.add(field.field)
        }
        break
      }
      case "life_event":
        if (!action.contact_id) errors.push("Life event needs a contact.")
        if (!action.event_type.trim() || !action.title.trim())
          errors.push("Life event needs a type and title.")
        if (!action.occurred_at)
          errors.push("Life event needs a date.")
        else if (!/^\d{4}-\d{2}-\d{2}$/.test(action.occurred_at))
          errors.push("Life event date must be a calendar date.")
        break
      case "reminder":
        if (!action.title.trim()) errors.push("Reminder needs a title.")
        if (!action.remind_at)
          errors.push("Reminder needs a date and time.")
        if (action.contact_id === "") errors.push("Choose a reminder contact.")
        break
    }
  }
  return [...new Set(errors)]
}

export function createManualAction(kind: VoiceAction["kind"]): VoiceAction {
  const base = {
    id: crypto.randomUUID(),
    kind,
    enabled: true,
    evidence: "",
    review_warning: null,
  }
  switch (kind) {
    case "interaction":
      return {
        ...base,
        kind,
        attendee_ids: [],
        channel: "in_person",
        occurred_at: null,
        notes: "",
        duration_minutes: null,
        location_label: null,
      }
    case "note":
      return { ...base, kind, contact_id: null, body: "" }
    case "contact_update":
      return { ...base, kind, contact_id: null, fields: [] }
    case "life_event":
      return {
        ...base,
        kind,
        contact_id: null,
        event_type: "",
        title: "",
        description: null,
        occurred_at: null,
        create_annual_reminder: false,
      }
    case "reminder":
      return {
        ...base,
        kind,
        contact_id: null,
        title: "",
        description: null,
        remind_at: null,
        frequency: "once",
        is_active: true,
      }
  }
}
