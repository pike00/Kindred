import { describe, expect, it } from "vitest"
import {
  dateTimeLocalToIso,
  isoToDateTimeLocal,
  createManualAction,
  validateActions,
} from "@/components/VoiceRecorder/voiceCaptureUtils"

describe("voice capture review helpers", () => {
  it("converts local wall time to an offset ISO timestamp and back", () => {
    const iso = dateTimeLocalToIso("2026-01-15T09:30")
    expect(iso).toMatch(/^2026-01-15T09:30:00[+-]\d\d:\d\d$/)
    expect(isoToDateTimeLocal(iso)).toBe("2026-01-15T09:30")
  })

  it("formats a local wall time with a negative UTC offset when local time is west of UTC", () => {
    const previousTz = process.env.TZ
    process.env.TZ = "Pacific/Honolulu"
    try {
      expect(dateTimeLocalToIso("2026-01-15T09:30")).toMatch(/-10:00$/)
    } finally {
      if (previousTz === undefined) delete process.env.TZ
      else process.env.TZ = previousTz
    }
  })

  it("preserves a date-only value without interpreting it in UTC", () => {
    expect(isoToDateTimeLocal("2026-05-03")).toBe("2026-05-03")
    expect(isoToDateTimeLocal("not a date")).toBe("")
    expect(isoToDateTimeLocal(null)).toBe("")
    expect(dateTimeLocalToIso("")).toBeNull()
    expect(dateTimeLocalToIso("not a date")).toBeNull()
  })

  it("requires complete enabled actions while ignoring skipped incomplete cards", () => {
    expect(
      validateActions([
        {
          id: "one",
          kind: "note",
          enabled: true,
          evidence: "",
          body: "A note",
          contact_id: null,
        },
        {
          id: "two",
          kind: "reminder",
          enabled: false,
          evidence: "",
          title: "",
          remind_at: null,
        },
      ] as never),
    ).toEqual(["Note needs a contact."])
  })

  it("reports missing interaction attendees and time", () => {
    expect(
      validateActions([
        {
          id: "one",
          kind: "interaction",
          enabled: true,
          evidence: "",
          attendee_ids: [],
          occurred_at: null,
        },
      ] as never),
    ).toEqual([
      "Interaction needs at least one attendee.",
      "Interaction needs a date and time.",
      "Interaction needs notes.",
    ])
  })

  it("validates every action kind and permits incomplete disabled cards", () => {
    const actions = [
      { id: "i", kind: "interaction", enabled: false, attendee_ids: [], occurred_at: null, notes: "" },
      { id: "n", kind: "note", enabled: true, contact_id: null, body: "" },
      { id: "u", kind: "contact_update", enabled: true, contact_id: null, fields: [] },
      { id: "e", kind: "life_event", enabled: true, contact_id: null, event_type: "", title: "", occurred_at: "bad-date" },
      { id: "r", kind: "reminder", enabled: true, contact_id: "", title: "", remind_at: null },
    ] as never
    expect(validateActions(actions)).toEqual([
      "Note needs a contact.",
      "Note needs text.",
      "Contact update needs a contact.",
      "Contact update needs at least one field.",
      "Life event needs a contact.",
      "Life event needs a type and title.",
      "Life event date must be a calendar date.",
      "Reminder needs a title.",
      "Reminder needs a date and time.",
      "Choose a reminder contact.",
    ])
  })

  it("rejects future interactions and duplicate contact fields", () => {
    const errors = validateActions([
      { id: "i", kind: "interaction", enabled: true, attendee_ids: ["c"], occurred_at: "2999-01-01T00:00:00Z", notes: "x" },
      { id: "u", kind: "contact_update", enabled: true, contact_id: "c", fields: [{ field: "company", value: "a" }, { field: "company", value: "b" }] },
    ] as never)
    expect(errors).toEqual([
      "Interaction date and time must be in the past.",
      "Contact update contains a repeated field.",
    ])
  })

  it("accepts complete past interactions, contact updates, life events, and reminders", () => {
    expect(validateActions([
      { id: "i", kind: "interaction", enabled: true, attendee_ids: ["c"], occurred_at: "2000-01-01T12:00:00-06:00", notes: "Met" },
      { id: "u", kind: "contact_update", enabled: true, contact_id: "c", fields: [{ field: "company", value: "Acme" }] },
      { id: "e", kind: "life_event", enabled: true, contact_id: "c", event_type: "move", title: "New home", occurred_at: "2026-10-01" },
      { id: "r", kind: "reminder", enabled: true, contact_id: null, title: "Call", remind_at: "2026-11-07T09:00:00-06:00" },
    ] as never)).toEqual([])
  })

  it("creates unique incomplete manual actions for all five supported kinds", () => {
    const kinds = ["interaction", "note", "contact_update", "life_event", "reminder"] as const
    const actions = kinds.map(createManualAction)
    expect(actions.map((action) => action.kind)).toEqual(kinds)
    expect(new Set(actions.map((action) => action.id)).size).toBe(5)
    expect(actions.every((action) => action.enabled && action.evidence === "")).toBe(true)
  })
})
