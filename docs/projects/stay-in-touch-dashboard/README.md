---
title: Stay in Touch Dashboard Widget
status: to_review
repos: [personal-crm]
started: 2026-04-23
last_updated: 2026-04-28
progress: 0/6
blocker: Communication Preferences project (do_not_contact field) must ship first; user chose full-scope prerequisite path on 2026-04-28
next_step: After comm-prefs ships, resume brainstorm at the design-decisions checkpoint (endpoint scope=new /overdue, skip=SkipEntry table, log UI=AddInteractionDialog modal, FAB=dashboard-only)
---

# Stay in Touch Dashboard Widget

## Goal
Enrich the dashboard's overdue contacts section with visibility into how long each contact has been neglected, enable one-click interaction logging per row, and provide a lightweight "skip this week" action that defers the next due date without recording an interaction.

## Tasks
- [ ] Implement /api/v1/contacts/overdue endpoint returning contacts sorted by days_overdue (calculated as: current_time - last_contacted_at vs. contact_frequency_days), include contact name, last_contacted_at, contact_frequency_days, and whether do_not_contact is active
- [ ] Create inline "Log Interaction" modal (non-dismissible until saved or cancelled) with interaction type selector (CALL, EMAIL, TEXT, IN_PERSON, VIDEO, SOCIAL, OTHER), optional note field, and auto-populated timestamp
- [ ] Implement "Skip This Week" action (PATCH endpoint) that advances the next due date forward by 7 days via a new interaction with type SKIP (or uses a skip-specific field) without user narrative
- [ ] Add dashboard React component rendering overdue contacts as sortable/filterable table with days-overdue column, action buttons (Log Interaction, Skip, More), and visual indicators for do_not_contact status
- [ ] Respect do_not_contact flag in frontend (dim/disable action buttons when active, show reason tooltip)
- [ ] Wire up quick-log FAB (floating action button) on dashboard to trigger interaction log for currently selected contact

## Session Log

### 2026-04-28
- /project-load: synced README to current state (status active → blocked, last_updated 2026-04-23 → 2026-04-28, progress 0/6). Verified spec prerequisites — 4 mismatches surfaced: `/api/v1/contacts/overdue` not built (only `/losing-touch` exists), `do_not_contact` field missing (depends on Communication Preferences project), `SKIP` not in `InteractionChannel` enum, `frontend/src/components/shared/` and `frontend/src/styles/` paths in spec don't exist.
- Brainstormed and locked the design checkpoint (4 decisions): build new `/overdue` and deprecate `/losing-touch`; skip semantics → separate `skip_entry` table (audit-friendly); Log Interaction UI → open `AddInteractionDialog` modal prefilled with the row's contact; FAB scope → dashboard-only, prefills the most-overdue contact, disabled when zero overdue.
- Pivoted to Communication Preferences as prerequisite (user chose "Pause this brainstorm, switch to comm-prefs (full scope)"). Blocker recorded; this project resumes after comm-prefs ships full-scope (`preferred_channel` + `best_time_local` + `do_not_contact` + reason + reminder suppression).

### 2026-04-23
- Project created.

## Notes

### 2026-04-28
- **State sync:** No work started since 2026-04-23 scaffold; verified spec prerequisites against current codebase. Status flipped active → blocked.
- **Brainstorm checkpoint (design decisions locked):**
  - Endpoint: build new `/api/v1/contacts/overdue`, deprecate and remove `/losing-touch` afterwards (migrate `frontend/src/routes/_layout/index.tsx` caller).
  - Skip semantics: separate `skip_entry` table (contact_id, skipped_at, defer_days, created_by). Cadence calc: `effective_due = max(last_contacted_at + frequency_days, latest_active_skip.skipped_at + latest_active_skip.defer_days)`.
  - Log Interaction UI: open `AddInteractionDialog` modal prefilled with the row's contact (not inline). Coordinate with the in-flight changes to that file currently dirty on `main`.
  - FAB scope: dashboard-only; opens `AddInteractionDialog` with the most-overdue contact prefilled. Disabled when zero overdue.
  - do_not_contact: requires Communication Preferences project to ship first (this is the blocker).
- **Blocker decision:** User chose "Pause this brainstorm, switch to comm-prefs (full scope)" on 2026-04-28. Resuming this brainstorm requires comm-prefs to ship first (full scope: preferred_channel, best_time_local, do_not_contact + reason, reminder suppression).
- **Discrepancies:**
  - `/api/v1/contacts/overdue` endpoint not implemented; closest existing endpoint is `/api/v1/contacts/losing-touch` (used by current dashboard at `frontend/src/routes/_layout/index.tsx`). New endpoint must still be built per spec.
  - `do_not_contact` field absent from `backend/app/models.py`. Communication Preferences project (started 2026-04-21) is still active and unimplemented. Spec already contemplates this — defensive null check fallback applies.
  - `SKIP` value not present in `InteractionChannel` enum at `backend/app/models.py` lines 126-133 (only CALL, IN_PERSON, TEXT, EMAIL, VIDEO, SOCIAL, OTHER). "Skip This Week" task needs decision: extend enum vs. add `next_due_date_offset_days` field.
  - Notes reference `frontend/src/components/shared/` and `frontend/src/styles/` for the design system; neither directory exists. Re-discover the actual frontend conventions before styling work.
- **Verified clean:** `contact_frequency_days` (models.py:424-429), `last_contacted_at` (models.py:496-499), `create_interaction_route` in `backend/app/api/routes/interactions.py`, communication-preferences project README, `QuickLog.tsx` component (under `frontend/src/components/Timeline/`, not a FAB).

- **Days-overdue calculation:** Backend computes `days_overdue = (now - last_contacted_at).days` if `last_contacted_at` is set, otherwise contact is "never contacted" (special case). Compare against `contact_frequency_days` to flag overdue status. See [models.py](../../../backend/app/models.py) lines 424-429 and 496-499 for field definitions.
- **Skip-this-week mechanism:** "Skip This Week" is a lightweight action that pushes the due date forward without logging a user-facing interaction. Implement as a new Interaction with type SKIP (extend InteractionChannel enum or create a new SkipReason field), or add a `next_due_date_offset_days` field to Contact. The skip modifies when the contact appears overdue next, not the actual last_contacted_at timestamp. This preserves cadence honesty (you didn't actually talk to them) while deferring reminders.
- **do_not_contact integration:** Communication Preferences feature (see [communication-preferences/README.md](../communication-preferences/README.md)) defines a do_not_contact flag with optional reason text. The dashboard widget must read this field and suppress action buttons when active. If communication_preference table does not exist yet, add a defensive null check and treat missing preference as "contact is available."
- **Timezone handling:** Contacts may have a timezone field (IANA format like "America/Denver") defined in the Communication Preferences feature. Use it to determine local "now" when calculating overdue status, so contacts in UTC-7 don't get flagged as overdue at 23:00 local time if their frequency_days clock resets at midnight local. See communication-preferences notes on best_time_local and timezone pairing.
- **Quick-log FAB pairing:** The dashboard's floating action button for quick interaction logging should integrate with this widget. On click, the FAB should highlight/select the first overdue contact and open the Log Interaction modal. If no overdue contacts exist, the FAB is disabled or shows a "no contacts to update" state.
- **Interaction timestamp accuracy:** All logged interactions must include a created_at timestamp (auto-set to UTC now). The backend's create_interaction() endpoint (models.py line 964) automatically bumps the contact's last_contacted_at; ensure the widget respects this and refetches the overdue list after logging.
- **Styling and responsiveness:** Overdue contacts table should be mobile-friendly (collapse action buttons to icon menu on small screens). Use existing personal-CRM design system (if defined in frontend/src/components/shared/ or frontend/src/styles/).
