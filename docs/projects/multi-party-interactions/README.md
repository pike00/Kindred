---
title: Multi-Party Interactions
status: completed
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-24
next_step: Investigate @-mention timeline follow-ups below before archiving.
---

# Multi-Party Interactions

## Goal
Replace the current one-to-one `Interaction.contact_id` design with a many-to-many relationship using an `interaction_attendee` junction table. This enables logging a single event (dinner, group call, meeting) once and attaching it to every participant, keeping `last_contacted_at` accurate across all attendees without duplicating the interaction record.

## Tasks
- [x] Create Alembic migration adding `interaction_attendee` junction table
- [x] Update Interaction model to support optional `contact_id` and add attendees relationship
- [x] Create InteractionAttendee model (junction) with contact_id and interaction_id
- [x] Update InteractionCreate/InteractionUpdate/InteractionPublic schemas for attendee_ids
- [x] Backfill existing rows: migrate single contact_id to interaction_attendee entries
- [x] Update last_contacted_at recomputation on every attendee add/remove/delete (Python helper, not DB trigger)
- [x] Add API tests for multi-attendee creation, attendee diffing, recompute-on-delete, and tag-share visibility filtering (13 passing)
- [x] Update interaction list/detail endpoints to return attendee names/avatars (InteractionPublic.attendees, viewer-filtered)

## Session Log

### 2026-04-24
- Shipped multi-party interactions end-to-end in commit ecc2b5f. Migration a7b8c9d0e1f2 creates `interaction_attendee`, backfills from the old column, and drops `Interaction.contact_id`.
- Backend: `InteractionCreate.attendee_ids: list[UUID]` (min 1); `InteractionPublic.attendees: [{id, first_name, last_name, avatar_url}]`; crud.recompute_last_contacted_at bumps/repairs each attendee on create / attendee-diff / delete; "any visible attendee" access control with non-visible attendees filtered from responses.
- Frontend: multi-select attendee picker in AddInteractionDialog, attendee rendering in InteractionTimeline + dashboard recent list + UnifiedTimeline ("with X +N others"). OpenAPI client regenerated.
- Verified: 13/13 interaction tests pass (added multi-attendee, attendee diff, delete-recompute, tag-share filtering). Full backend suite 96/98 (2 pre-existing failures unrelated). Live Puppeteer click-through confirmed: log a multi-attendee interaction from a contact page, both contacts' last_contacted_at bumped, interaction appears on each contact's timeline.
- Plan doc at docs/projects/multi-party-interactions/PLAN.md.

### 2026-04-21
- Project created.

## Notes

### 2026-04-24
- **Decisions:**
  - Dropped `Interaction.contact_id` entirely instead of leaving it nullable. One source of truth, no dual-write ambiguity. Migration downgrade is data-lossy for true multi-attendee rows (documented in the migration docstring).
  - Access control is "any visible attendee" — seeing one attendee is enough to see the interaction, but attendees the viewer can't see are filtered from the `attendees` list (no name leak). Matches existing tag-share semantics.
  - `last_contacted_at` recomputed in Python (crud helper) rather than DB triggers. Easier to test and to read in one place.
  - Skipped the DB-level CHECK for ≥1 attendee — enforced in the Pydantic schema with `min_length=1`; can add the DB constraint later if needed.
- **Gotchas:**
  - List endpoint had to `SELECT DISTINCT` on the Interaction → attendee join, otherwise multi-attendee rows were duplicated per matching attendee.
  - Access-control path for update/delete checks the *current* attendee set ∩ visible, not just ownership — a viewer with a tag share on one attendee can PATCH if the interaction has that attendee.
- **Accomplished:** schema migration + CRUD + API route + webhooks + seeder + 8 backend tests + multi-select UI + attendee display everywhere + regenerated OpenAPI client. Frontend client type break handled in the same PR (no dual schema).

- **Current schema**: `Interaction` has `contact_id` (FK to Contact, non-nullable, cascade). See [models.py](../../../backend/app/models.py) lines 961-989 (Interaction table definition).

- **Migration strategy**: Alembic migration should:
  - Add `interaction_attendee` table with (interaction_id, contact_id) composite PK, both cascading FKs
  - Backfill: for each existing Interaction, insert one row into interaction_attendee with its current contact_id
  - Make `Interaction.contact_id` nullable (legacy; can deprecate after backfill)
  - Optionally: add a CHECK constraint to ensure at least one attendee exists

- **Cascade semantics**: Deleting a Contact cascades to Interaction (current behavior preserved) and to all its InteractionAttendee rows. Deleting an InteractionAttendee does *not* delete the Interaction—just detaches one attendee. Deleting an Interaction cascades to all InteractionAttendees.

- **last_contacted_at computation**: Currently bumped by INSERT trigger on Interaction. Post-migration, also trigger on DELETE from interaction_attendee (to recompute if attendee is removed). Query logic: `SELECT MAX(occurred_at) FROM interaction i JOIN interaction_attendee ia ON i.id = ia.interaction_id WHERE ia.contact_id = ?`

- **API breaking changes**: POST /interactions will accept `attendee_ids: [uuid, ...]` instead of `contact_id: uuid`. Backward-compat endpoint or deprecation warning needed. GET /interactions/{id} returns new InteractionPublic with `attendees: [{id, first_name, last_name, avatar_url}, ...]`. Tests must cover both single and multi-contact scenarios.

## Look into later

- **Notes with @-mentions not appearing in the other person's @ timeline.** When a note is written on contact A and @-mentions contact B, it does not show up on contact B's mentions/@-timeline view. Need to trace whether the mention extraction runs on notes (vs only on interactions/journal entries), whether the backfill covers existing notes, and whether the timeline query filters it out. Repro: create a note on one contact that @-references another, then check the referenced contact's timeline.
- **Do you need to @-reference the current contact in their own note?** Unclear whether a note authored on contact A's page is implicitly associated with A, or whether you must also `@A` inside the note body for it to surface in A's @ timeline / mention views. If implicit, the UI should make that obvious; if explicit, self-reference feels redundant. Decide the intended behavior and make it consistent with how interactions handle attendee vs. body mentions.
