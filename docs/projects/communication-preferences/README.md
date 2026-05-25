---
title: Communication Preferences
status: paused
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-28
progress: 0/6
next_step: Create Alembic migration for communication_preference table with preferred_channel, best_time_local, do_not_contact fields
---

# Communication Preferences

## Goal
Replace free-text `how_we_met` narrative with structured communication metadata: `preferred_channel` (enum reusing InteractionChannel), `best_time_local` (HH:MM range for local contact window), `do_not_contact` flag with reason. Enable dashboard filtering by communication channel and reminder suppression when do-not-contact is active.

## Tasks
- [ ] Create Alembic migration: add communication_preference table with foreign key to contact, reuse InteractionChannel enum
- [ ] Add CommunicationPreferenceBase/Create/Update/Public models to [models.py](../../../backend/app/models.py); wire up Pydantic validation for best_time_local HH:MM format
- [ ] Implement CRUD endpoints: GET /api/v1/contacts/{id}/communication-preference, PATCH (upsert), DELETE
- [ ] Create React form section in contact edit dialog with channel selector, time range picker, do-not-contact toggle + reason textarea
- [ ] Add dashboard widget to filter contacts by preferred_channel and visualize do_not_contact status
- [ ] Update reminder suppression logic to skip reminders when contact.communication_preference.do_not_contact is true and reason is logged

## Session Log

### 2026-04-28
- Loaded as prerequisite for stay-in-touch-dashboard, which is now blocked on shipping this. Status flipped active → paused; verified pristine starting state — no `CommunicationPreference` model, table, migration, or related fields exist anywhere in `backend/`.
- Brainstorm initiated but paused before clarifying questions; design decisions not yet locked.
- Resumed context exploration: Alembic head confirmed as `f5a6b7c8d9e0`; `check_cadences` (worker.py:89) is the cadence overdue function (distinct from `check_reminders`) — both need `do_not_contact` filtering.
- Asked Q1 (separate `communication_preference` table vs. columns on Contact); user saved before answering.
- **Next:** Resume brainstorm — answer Q1, then how_we_met treatment, dashboard widget scope, timezone placement; write spec + plan.

### 2026-04-21
- Project created.

## Notes

### 2026-04-28
- **State sync:** No work started since 2026-04-21 scaffold; verified spec prerequisites against current codebase. Status flipped active → paused. Loaded as prerequisite for the stay-in-touch-dashboard project (now blocked on this).
- **Discrepancies:** None (no false claims in the README).
- **Verified clean:** `backend/app/models.py` and `worker.py` exist; `frontend/src/components/Contacts/EditContactDialog.tsx` exists (correct attach point for the new form section); `InteractionChannel` enum at `models.py:126-133` confirmed; `how_we_met` field present on Contact model (lines 403, 454); ARQ worker `check_reminders` exists with no `do_not_contact` filter yet (correct starting state for task 6); no `CommunicationPreference` model/table or related migrations exist anywhere in `backend/` (correct starting state for tasks 1-3).
- **Decisions:** Promoted to prerequisite-of-record for stay-in-touch-dashboard; that project is now formally `blocked` on shipping the full scope here (preferred_channel + best_time_local + do_not_contact + reason + reminder suppression). User explicitly rejected the do_not_contact-only thin slice in favor of full scope.
- **Issues:** Q1 (schema: separate table vs columns) not yet answered — brainstorm resumes here. Remaining open: (b) how_we_met treatment, (c) dashboard widget scope, (d) reminder-suppression composition with `is_deceased`, (e) timezone field placement.
- **Gotchas:** `check_cadences` (worker.py:89) is the cadence overdue notification function — distinct from `check_reminders` (Reminder record handler). Both need `do_not_contact` filtering once comm-prefs ships. Neither currently checks `is_deceased` either.
- **Accomplished:** Worktree created at `.claude/worktrees/communication-preferences`; README state-synced; pristine starting state confirmed across backend models, migrations, ARQ worker, and frontend dialog; relevant code locations cataloged in Notes.

- **InteractionChannel enum:** [Defined in models.py](../../../backend/app/models.py) lines 126-133; values are CALL, IN_PERSON, TEXT, EMAIL, VIDEO, SOCIAL, OTHER. Communication preferences will reuse this to keep sync between interaction tracking and preferred contact method.
- **best_time_local timezone pairing:** The best_time_local field (HH:MM range like "09:00-17:00") operates in the contact's local timezone. Contacts lack a timezone field currently; consider adding timezone (IANA string, e.g. "America/Denver") to Contact model or storing in communication_preference itself to enable proper scheduling recommendations (item 8 in original spec).
- **Dashboard consumption:** Item 32 (original spec) describes a dashboard widget that surfaces contacts grouped by preferred_channel. This widget will query contacts with a communication_preference join and render channel-segmented lists or filter controls. Implement alongside the contact list views in frontend/src/components/Contacts/.
- **do_not_contact audit trail:** The reason field on do_not_contact is audit-sensitive (e.g. "Do not contact: deceased", "Requested to be removed", "Legal hold"). Store as free text (max 500 chars) but consider adding a created_at/updated_at timestamp to track when the restriction was put in place; useful for compliance and recall.
- **Soft-delete alignment:** Contact already has is_archived and is_deceased flags. do_not_contact is distinct: it suppresses outbound contact but does not hide the record. Reminders (via ARQ worker in backend/app/worker.py) must check both do_not_contact and is_deceased before firing.
- **Schema migration collision pattern:** Personal-CRM uses Alembic for migrations. New migration revision IDs are auto-numbered and may collide if multiple agents commit simultaneously. Use the depends_on pattern documented in project memory: https://pike00.mempalace.example.com (item: Personal-CRM Alembic migration collision) to chain uncommitted migrations and avoid conflicts.
