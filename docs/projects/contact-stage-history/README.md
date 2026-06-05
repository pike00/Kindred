---
title: Contact Stage History
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Create Alembic migration for contact_stage_event table
---

# Contact Stage History

## Goal

Audit all contact stage transitions (e.g., Active -> Dormant -> Lost) with timestamps and optional notes. Keep Contact.stage as a denormalized cache of the latest event so Kanban queries stay fast, and log each drag-and-drop as a historical record for "time in stage" analytics and debugging.

## Tasks

- [ ] Create Alembic migration for contact_stage_event table (contact_id, from_stage, to_stage, occurred_at, note, owner_id, created_at)
- [ ] Service-layer write path: wrap all Contact.stage updates to emit events (prefer service methods over raw model updates for testability)
- [ ] Backfill seed event for existing contacts (one row per contact capturing current stage as the initial event)
- [ ] Query helpers: get_contact_stage_history(contact_id), get_stage_duration(contact_id, stage), latest_stage_event(contact_id)
- [ ] Time-in-stage analytics view (aggregate dwell time per stage per contact)
- [ ] Pair with Contacts Kanban feature: wire drag-drop mutations to emit events via the service layer

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.
- Examined models.py: Contact.stage is a string field with example values "Active, Dormant, Lost" (no formal enum yet).
- Planned table schema and write-path strategy.

## Notes

- **Trigger vs. service writes**: Triggers keep writes consistent but are harder to test; service-layer methods let you test the event emission logic directly. Service-preferred here unless performance testing shows otherwise.
- **Denormalization**: Contact.stage is a cached copy of the latest row in contact_stage_event. Deriving it on-the-fly would require a LEFT JOIN with ordering on every query; keeping the cache trades writes for read speed (worth it for Kanban).
- **Enum values**: Currently open-ended (string field); consider creating a formal ContactStage enum once the Kanban feature is built and the stage taxonomy is stable.
- **Backfill**: Contacts with NULL stage or existing string stages need a seed event with occurred_at = contact.created_at so the history is complete from day one.
- **Pairing with Kanban**: The Contacts Kanban UI will mutate Contact.stage via the service layer; the service method emits the event row. Ensure all stage mutations go through the service, not direct ORM calls.
- **Time-in-stage report**: Useful for "who do we contact least" and "how long does a contact stay dormant before we re-engage" questions. Build the query as a view or a service method that groups by stage and sums (next_event.occurred_at - event.occurred_at).
