---
title: iCal Importer (Backfill)
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Design .ics parser and attendee-to-contact matching heuristics
---

# iCal Importer (Backfill)

## Goal

Enable users to upload past calendar exports (.ics files) and heuristically extract events into historical `Interaction` or `LifeEvent` rows. The system parses attendee names and emails, fuzzy-matches them to existing contacts, classifies events (meeting, anniversary, birthday), and presents a confirmation UI before inserting any records.

## Tasks

- [ ] Backend: POST /api/ical/upload endpoint accepting `.ics` file upload
- [ ] Backend: icalendar parser library integration (python-icalendar or similar)
- [ ] Backend: Attendee-to-contact matching (email exact match, name fuzzy match with configurable threshold)
- [ ] Backend: Heuristic event classification (meeting keywords vs. anniversary/birthday patterns)
- [ ] Backend: Proposal storage and idempotency (UID-based duplicate detection)
- [ ] Backend: Bulk confirmation endpoint POST /api/ical/confirm accepting proposal list
- [ ] Frontend: Upload form component with drag-and-drop .ics input
- [ ] Frontend: Proposal review UI showing matches, classification, and before/after record counts
- [ ] Frontend: Bulk action controls (confirm, reject, re-match, edit before insert)

## Session Log

### 2026-04-21
- Project created. Scope set: one-shot backfill, past events only, manual confirmation required.

## Notes

- **Heuristic Classification**: Keywords like "meeting", "call", "sync" → `Interaction` (with channel inference). Keywords like "anniversary", "birthday", "celebration" plus single-contact invitees → `LifeEvent`. Ambiguous cases present both options for user selection.

- **Timezone Handling**: iCal events may have TZID or be in UTC. Parse TZID metadata; fall back to user's account timezone (future schema addition) if unspecified. Store all occurred_at / occurred_date in UTC after conversion.

- **Attendee Matching Strategy**:
  1. Extract all ATTENDEE properties from VEVENT
  2. Parse email and CN (common name) from each attendee
  3. First pass: exact email match against contact_field values (email type)
  4. Second pass: fuzzy name match (email local part or CN against first_name + last_name) with threshold ~80% (configurable)
  5. Return ordered list of (attendee, [matched_contacts]) sorted by match confidence
  6. UI allows user to override/confirm each match before insert

- **Idempotency via UID**: VEVENT.UID is globally unique per calendar system. Store (owner_id, UID, contact_id, event_type) as a dedup tuple. On re-upload of the same .ics, skip already-inserted events.

- **Backfill Only**: Filter out future events (occurred_at > now()) at parse time. Show count of skipped future events in proposal summary.

- **Confirmation Flow**:
  - Upload → Parse → Dedup (show "X events already in DB") → Propose → Show table of (VEVENT.SUMMARY, matched_contact, classification, occurred_at) → User bulk-selects rows → POST /api/ical/confirm with row IDs → Insert all or rollback on any FK error.

- **Data Models**:
  - `Interaction` schema from models.py: channel, occurred_at (datetime), notes, contact_id, owner_id, created_at
  - `LifeEvent` schema from models.py: event_type, title, description, occurred_at (date), contact_id, owner_id, create_annual_reminder, created_at
  - Event summary → Interaction.notes or LifeEvent.title; calendar description → LifeEvent.description or Interaction.notes (append)

- **Error Handling**: Malformed .ics → return HTTP 422 with parse error detail. No matching contacts for an event → show as "unknown" in proposal; allow user to skip or assign manually via a select dropdown in the UI.
