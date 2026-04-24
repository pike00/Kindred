# Multi-Party Interactions — Implementation Plan

Drafted: 2026-04-24

## Intent

One dinner, group call, or meeting should log once and attach to every participant. `last_contacted_at` must stay accurate for all attendees. The junction table `interaction_attendee` replaces the current `Interaction.contact_id` FK.

## Key design decisions

1. **Drop `Interaction.contact_id` after backfill.** One source of truth (the junction), not two. Readers that need "which contacts attended" always JOIN `interaction_attendee`.
2. **At least one attendee.** Enforced in API schema (`attendee_ids: list[UUID]` with `min_length=1`) and DB CHECK constraint via a query-on-insert trigger (or a deferred constraint). For MVP, enforce in the app layer and skip the DB-level check — simpler, test-covered.
3. **Access control: "any visible attendee."** A user sees an interaction iff at least one attendee is in their `visible_contact_ids`. When rendering, attendees not visible to the user are filtered out of the displayed list (no leaking names of private contacts). Matches existing tag-share semantics.
4. **`last_contacted_at` recomputation.**
   - On interaction create: bump every attendee's `last_contacted_at = max(existing, occurred_at)`.
   - On interaction update of `occurred_at`: recompute each attendee's `last_contacted_at = max(occurred_at of all their interactions)`.
   - On interaction delete or attendee removal: recompute the affected contact's `last_contacted_at` from remaining interactions.
   - All done in Python (crud.py helper). No DB triggers — easier to test, visible in code.
5. **Attendee mutation via PATCH.** Accept optional `attendee_ids` on `InteractionUpdate`; if present, diff and rewrite the junction rows, then recompute `last_contacted_at` for all affected contacts (added and removed).
6. **No backwards-compat shim for `contact_id` on POST.** The API contract is replaced. Callers (webhooks, seeder, frontend) all get updated in the same PR.

## Alembic migration

New revision chained after the most recent migration. Steps:

1. Create table `interaction_attendee`:
   - `interaction_id UUID FK interaction(id) ON DELETE CASCADE NOT NULL`
   - `contact_id UUID FK contact(id) ON DELETE CASCADE NOT NULL`
   - Composite PK `(interaction_id, contact_id)`
   - Index on `contact_id` for per-contact filters
2. Backfill: `INSERT INTO interaction_attendee(interaction_id, contact_id) SELECT id, contact_id FROM interaction`.
3. Drop `Interaction.contact_id` column and its FK/index.

Downgrade reverses: re-add column, backfill the first attendee per interaction, drop the junction table. (Data-lossy if multi-attendee rows exist — document this in the migration.)

## Files to touch

### Backend
- `backend/app/models.py`
  - Add `InteractionAttendee(table=True)` with composite PK.
  - Remove `contact_id` from `Interaction` and `InteractionBase`.
  - Add `attendees: list["Contact"]` relationship via link table.
  - Update `InteractionCreate` → `attendee_ids: list[UUID]` (min_length=1).
  - Update `InteractionUpdate` → optional `attendee_ids`.
  - Update `InteractionPublic` → replace `contact_id/contact_first_name/contact_last_name/contact_avatar_url` with `attendees: list[AttendeeSummary]` where `AttendeeSummary = { id, first_name, last_name, avatar_url }`.
- `backend/app/crud.py`
  - `create_interaction`: accept `attendee_ids`, insert attendee rows, bump each contact's `last_contacted_at`.
  - New helper `recompute_last_contacted_at(session, contact_id)`.
  - `update_interaction` logic inlined in route (today) or promoted to crud helper — either way, handle attendee diff.
- `backend/app/api/routes/interactions.py`
  - Rewrite `list_interactions`: filter via `EXISTS (SELECT 1 FROM interaction_attendee WHERE interaction_id = interaction.id AND contact_id = :contact_id AND contact_id IN visible_ids)`. Return attendees filtered to the viewer's visible set.
  - Rewrite create/update/delete to use attendee model.
  - `_interaction_to_public` takes attendee list, returns visible-only summaries.
- `backend/app/api/routes/webhooks.py`
  - When creating an interaction from a webhook, create one attendee (the matched contact). Existing single-contact webhook payload stays as-is.
- `backend/app/seed_fake_data.py`
  - Update seed: create interactions with attendee rows. Optionally seed some multi-attendee interactions for realism.
- `backend/tests/api/routes/test_interactions.py`
  - Update all existing assertions (response shape now has `attendees`).
  - Add: create with multiple attendees, list filtered by one attendee, update attendees (add/remove), delete, access control with shared vs unshared co-attendee, recompute of `last_contacted_at` on delete.

### Frontend
- Regenerate OpenAPI client (`bun run generate-client`).
- `frontend/src/components/Interactions/AddInteractionDialog.tsx`
  - Replace single-select contact field with multi-select chip picker (reuse Command primitive from #29; similar UX to #30 mention picker).
  - If invoked with `contactId` prop (from contact detail page), seed as first attendee; still allow adding more.
- `frontend/src/components/Interactions/InteractionTimeline.tsx`
  - Render attendee row (avatars + names) instead of one channel badge's contact.
- `frontend/src/components/Timeline/UnifiedTimeline.tsx` (just built)
  - The per-contact filter uses the list API's `contactId` param — still works via the junction. Display: a multi-attendee interaction on contact X's timeline shows "with Alice and 2 others" inline.
- `frontend/src/routes/_layout/contacts/$contactId.tsx`
  - The right-column "Log Interaction" button now opens the multi-select dialog with the current contact pre-seeded.
- Remove any remaining `ix.contact_id` / `ix.contact_first_name` usages.

## Migration & rollout

Single PR. Dev DB is rebuilt from the Alembic chain on prestart, so migration runs automatically on `hl up` / `docker compose up`. No prod deploy concerns (personal CRM).

## Test plan

**Backend (pytest):**
- Create interaction with 1 attendee → response.attendees has 1 entry, contact's last_contacted_at bumped.
- Create with 3 attendees → all three `last_contacted_at` bumped; interaction listable from each contact.
- Update attendees (add B, remove A) → A's last_contacted_at recomputed (falls back to prior interaction or null), B bumped.
- Delete interaction → each attendee's last_contacted_at recomputed.
- Access control: Alice creates interaction with [Bob_private, Charlie_shared]. Dave (sharing tag on Charlie) GETs interaction → sees it, but attendees list shows only Charlie.
- Access control (denied): interaction with [Bob_private] only → Dave can't see it.
- Isolation: creating an interaction on another user's contact → 404.

**Frontend (manual browser test):**
- Log interaction from `/interactions` with multi-select → appears once in list with attendee chips.
- Log interaction from a contact page → pre-seeded, can add more.
- Contact detail timeline shows the multi-attendee interaction.
- `last_contacted_at` on contact card updates correctly after multi-attendee log.

## Out of scope (intentional)

- Retroactive merging of "same event logged twice against different contacts" (no dedupe).
- DB-level CHECK constraint enforcing >=1 attendee (app layer enforces it; deferring pending need).
- Attendee roles/attribution ("organizer", "tagged by mistake"). Flat list for now.
- Group-attendee shortcut ("invite all of Group X"). User can multi-select manually.
