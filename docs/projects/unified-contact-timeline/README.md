---
title: Unified Contact Timeline
status: completed
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: UnifiedTimeline (interactions+notes+life-events+gifts+debts) live; Log-Interaction dropdown added in v0.2.88.
---

# Unified Contact Timeline

## Goal
Display all contact-related events in a single reverse-chronological feed on the contact detail page. Each event type (Interaction, Note, Gift, LifeEvent, Debt, stage change) appears as a colored card, with filters along the top to show/hide event types, enabling users to see the complete history of a relationship at a glance.

## Tasks
- [ ] **Verify (LLM-built, to_review):** confirm UnifiedTimeline (commit 1978daa) aggregates all event types in reverse-chron with working per-type filter chips on the contact detail page — note it ships client-side aggregation, NOT the backend endpoint the tasks below describe
- [ ] Backend: `/contacts/{id}/timeline` endpoint with SQL UNION ALL, cursor-based pagination by `occurred_at`, owner_id filter
- [ ] Backend: Timestamp normalization helper (map each entity type to its timestamp column)
- [ ] Backend: Response schema unifying timeline events (type, timestamp, payload)
- [ ] Frontend: Timeline card renderers for each event type (Interaction, Note, Gift, LifeEvent, Debt, StageChange)
- [ ] Frontend: Infinite scroll + cursor pagination on contact detail page
- [ ] Frontend: Filter bar (checkboxes by event type) + visual type colors

## Session Log

### 2026-06-05
- Housekeeping: UnifiedTimeline (interactions+notes+life-events+gifts+debts) live; Log-Interaction dropdown added in v0.2.88.

### 2026-05-31
- Housekeeping: status `archived` → `to_review`. Shipped by an LLM (commit 1978daa, client-side aggregation with no backend endpoint) but archived with all tasks unchecked and no human verification. Pulled back into review with a verification task.

### 2026-04-24
- Project archived. UnifiedTimeline shipped in commit 1978daa: single client-side aggregation of Interactions / Notes / Gifts / LifeEvents / Debts on the contact detail page, with per-type filter chips. No dedicated backend endpoint — reuses existing per-type list endpoints. Stage changes deferred (no audit table yet).

### 2026-04-21
- Project created.
- Analyzed models.py to identify timeline entities and timestamp fields.

## Notes

- **SQL UNION ALL strategy**: Normalize timestamp across entity types and stack via UNION ALL. Each SELECT projects the same columns: `type` (literal), `id`, `contact_id`, `occurred_at`, `payload` (JSON-serialized relevant fields). This is cleaner than N separate queries and easier to paginate than client-side merging.

- **Timestamp field mapping** (see [models.py](../../../backend/app/models.py)):
  - `Interaction`: `occurred_at` (datetime, when the interaction happened)
  - `Note`: `created_at` (datetime, when the note was added)
  - `Gift`: `gift_date` (date; convert to datetime at midnight for sorting) or `created_at` if not set
  - `LifeEvent`: `occurred_at` (date; convert to datetime at midnight for sorting)
  - `Debt`: `created_at` (datetime) — consider adding an optional `incurred_at` field for when the debt arose
  - `StageChange`: Synthesized from `Contact.stage` column; track changes via audit table or manually log (out of scope for MVP)

- **Include contact stage events**: Stage transitions (Active → Dormant, etc.) are meaningful timeline events. If no stage audit table exists, consider deferring stage change visibility to a second iteration.

- **Exclude drafts**: Assume all entities in the models are "published" by default (no `is_draft` column). If draft logic is added later, filter by `is_draft = false` in the UNION query.

- **Pairing with interaction heatmap**: The timeline complements the interaction heatmap (frequency over time). The heatmap shows cadence; the timeline shows *what* happened and *notes*.

- **Pagination**: Use `cursor` (serialized `occurred_at` + `id` for tiebreaking) to handle large timelines. Fetch cursor + limit from frontend, decode on backend, `WHERE (occurred_at, id) < cursor ORDER BY occurred_at DESC, id DESC`.

- **Color scheme**: Define a type-to-color map in the frontend (e.g., Interaction=blue, Note=green, Gift=yellow, LifeEvent=purple, Debt=red, StageChange=gray). Use as background or left border on each card.
