---
title: Multi-Party Interactions
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Alembic migration for interaction_attendee junction table
---

# Multi-Party Interactions

## Goal
Replace the current one-to-one `Interaction.contact_id` design with a many-to-many relationship using an `interaction_attendee` junction table. This enables logging a single event (dinner, group call, meeting) once and attaching it to every participant, keeping `last_contacted_at` accurate across all attendees without duplicating the interaction record.

## Tasks
- [ ] Create Alembic migration adding `interaction_attendee` junction table
- [ ] Update Interaction model to support optional `contact_id` and add attendees relationship
- [ ] Create InteractionAttendee model (junction) with contact_id and interaction_id
- [ ] Update InteractionCreate/InteractionUpdate/InteractionPublic schemas for attendee_ids
- [ ] Backfill existing rows: migrate single contact_id to interaction_attendee entries
- [ ] Update last_contacted_at triggers to fire on any attendee deletion or update
- [ ] Add API tests for multi-attendee creation and single-attendee backward compatibility
- [ ] Update interaction list/detail endpoints to return attendee names/avatars

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Current schema**: `Interaction` has `contact_id` (FK to Contact, non-nullable, cascade). See [models.py](../../../backend/app/models.py) lines 961-989 (Interaction table definition).

- **Migration strategy**: Alembic migration should:
  - Add `interaction_attendee` table with (interaction_id, contact_id) composite PK, both cascading FKs
  - Backfill: for each existing Interaction, insert one row into interaction_attendee with its current contact_id
  - Make `Interaction.contact_id` nullable (legacy; can deprecate after backfill)
  - Optionally: add a CHECK constraint to ensure at least one attendee exists

- **Cascade semantics**: Deleting a Contact cascades to Interaction (current behavior preserved) and to all its InteractionAttendee rows. Deleting an InteractionAttendee does *not* delete the Interaction—just detaches one attendee. Deleting an Interaction cascades to all InteractionAttendees.

- **last_contacted_at computation**: Currently bumped by INSERT trigger on Interaction. Post-migration, also trigger on DELETE from interaction_attendee (to recompute if attendee is removed). Query logic: `SELECT MAX(occurred_at) FROM interaction i JOIN interaction_attendee ia ON i.id = ia.interaction_id WHERE ia.contact_id = ?`

- **API breaking changes**: POST /interactions will accept `attendee_ids: [uuid, ...]` instead of `contact_id: uuid`. Backward-compat endpoint or deprecation warning needed. GET /interactions/{id} returns new InteractionPublic with `attendees: [{id, first_name, last_name, avatar_url}, ...]`. Tests must cover both single and multi-contact scenarios.
