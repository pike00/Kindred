---
title: Reminders Bell and Badge
status: completed
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-05-15
next_step: Released as v0.1.6. Log-as-interaction wiring (FAB pre-populated with contact_id) remains as a follow-up.
---

# Reminders Bell and Badge

## Goal

Persistent header bell icon with a badge showing the count of reminders due today and overdue. Clicking opens a popover list with snooze, log-as-interaction, and dismiss actions to keep the contact workflow tight.

## Tasks

- [x] Implement /reminders/due GET endpoint (filter reminders due today + overdue, scoped to owner_id)
- [x] Header bell component with count badge and aria-live region
- [x] Popover list showing due reminders with contact name + title + description
- [x] Snooze button (15min, 1h, 4h, tomorrow, 1 week) -- writes to Reminder.snoozed_until
- [ ] Log-as-interaction button (opens FAB for quick interaction record on the linked contact)
- [x] Dismiss button (marks as snoozed_until = now, soft-clear from the badge)
- [x] Auto-refetch count every 60s (or SSE streaming for near-real-time updates)

## Session Log

### 2026-05-15
- Squash-merged `dirac/reminders-bell-badge` into main as commit `6fe926b`; tagged and released **v0.1.6**.
- Resolved 4 conflict sections in `backend/app/api/routes/reminders.py`: kept HEAD's richer `list_due_reminders` (uses `RemindersDuePublic` with full contact object via `selectinload`-style join, vs branch's flat `RemindersWithContactPublic` with first/last_name strings); kept HEAD's flexible `snooze_reminder` signature (body + minutes + reason); kept HEAD's sentinel-based `dismiss_reminder` (sets `snoozed_until = 9999-12-31T23:59:59Z`, vs branch's `snoozed_until = now()` which the `/due` filter would re-include immediately).
- Re-added `count: int` to `RemindersPublic` after the branch's squash dropped it — the dashboard at `_layout/index.tsx:127` reads `reminders?.count`.
- Branch's `ReminderWithContactPublic` and `RemindersWithContactPublic` models auto-merged into `models.py` and remain there as dead code; the chosen `/due` implementation uses `RemindersDuePublic` instead. Acceptable for now.

### 2026-04-21
- Project created.

### 2026-05-06
- Backend: added `GET /api/v1/reminders/due` returning active, currently-due reminders for the current user, with the linked contact (when present) joined in so the popover renders contact name without N+1 fetches. Filter mirrors the spec: `is_active = true AND remind_at <= now() AND (snoozed_until IS NULL OR snoozed_until <= now())`. Order by `remind_at ASC`.
- Backend: added `POST /api/v1/reminders/{id}/dismiss` which bumps `snoozed_until` to a far-future sentinel (`9999-12-31T23:59:59Z`) so the reminder disappears from `/due` without being deleted. The literal "= now()" wording from the spec didn't survive the filter (`snoozed_until <= now()` re-includes the row immediately); the sentinel preserves the soft-clear semantics.
- Backend: extended `POST /api/v1/reminders/{id}/snooze` to accept a JSON body with either an absolute `snoozed_until` datetime or a relative `minutes` duration. The legacy `?minutes=` query parameter is still honored for backwards compatibility.
- Backend: 10 new pytest cases under `backend/tests/api/routes/test_reminders.py` cover the `/due` filter (overdue, inactive-skipped, snoozed-future-skipped, contact summary embedded, standalone reminder, oldest-first ordering), both snooze body shapes, dismiss happy path, and the dismiss 404. All 185 route tests pass.
- Frontend: refactored `ReminderBell` to poll `/reminders/due` every 60s via TanStack Query (key `["reminders", "due"]`) instead of fetching the full reminder list and filtering client-side. Server-side filtering scales when an instance has thousands of reminders.
- Frontend: each popover row now renders the linked contact's display name (nickname > "first last"), the title, the description, and an overdue-relative timestamp. Snooze is a Radix dropdown with the canonical 5 options (15m / 1h / 4h / tomorrow / 1 week); dismiss hits the new endpoint. Bell button + per-row buttons are 44px tall on mobile, 36px on desktop. `aria-live="polite"` on a sr-only count span; `aria-label="Reminders, N due"` on the trigger.
- Frontend: SDK regenerated via `bash scripts/generate-client.sh`. New types: `ReminderDuePublic`, `RemindersDuePublic`, `ReminderContactSummary`, `ReminderSnoozeRequest`. New SDK methods: `RemindersService.listDueReminders`, `dismissReminder`.
- Verified end-to-end against the live dev stack at `https://kindred.dev.example.com`: created 3 overdue test reminders linked to a contact, confirmed badge shows "3" with `aria-label="Reminders, 3 due"`, opened popover (3 rows visible with contact name + title + description + overdue time), snoozed one for 1 hour (badge → 2), dismissed another (badge → 1). Test reminders cleaned up after.
- Vite gotcha: the SDK regenerator overwrites `frontend/src/client/*.gen.ts` while Vite has them cached in `node_modules/.vite/deps`. The Vite dev server keeps serving the stale SDK until restarted; saw this when the bell rendered "0 due" despite the API returning 3. `docker compose -f compose.dev.yml restart frontend` cleared it.
- Deferred: "Log as interaction" — needs the FAB to accept a pre-populated contact_id and the bell needs context access. Left as a TODO in `ReminderBell.tsx` so the next pass can pick it up cleanly.

## Notes

### 2026-05-15
- **Decisions:** When two branches both add a "reminders due" response shape, prefer the richer one (full contact object) over the flatter one (concatenated name string). The flatter type is left in the registry as dead but harmless.
- **Decisions:** Dismiss must use a far-future sentinel (`9999-12-31T23:59:59Z`), not `now()`, because the `/due` filter is `snoozed_until IS NULL OR snoozed_until <= now()` — `= now()` re-includes immediately.
- **Accomplished:** v0.1.6 shipped, 262 backend tests green, GH release published.

- **Live count refresh strategy**: Start with polling every 60s (simple, no server-side state). Consider SSE later if users find stale badges frustrating.
- **Snooze writes**: Snooze button updates `Reminder.snoozed_until` to a future datetime; the endpoint filters `WHERE remind_at <= now() AND (snoozed_until IS NULL OR snoozed_until <= now())`.
- **Log-as-interaction**: Clicking "Log Interaction" from the bell popover opens the floating action button (FAB) in the app shell, pre-populated with the contact_id from the reminder. The user writes notes, selects a channel, and submits -- which then auto-refreshes the badge count.
- **Mobile hit targets**: Bell icon + popover trigger should be >= 44px tall/wide; popover list items also 44px+ for touch friendliness.
- **Accessibility**: Badge count lives in `<span aria-live="polite">` so screen readers announce count changes when reminders are dismissed or snoozed. Badge also labels the bell with `aria-label="Reminders, {count} due"`.
- **Model reference**: See [Reminder](../../../backend/app/models.py) for the schema -- `id`, `title`, `description`, `remind_at`, `frequency`, `is_active`, `contact_id` (nullable), `owner_id`, `last_sent_at`, `snoozed_until`, `created_at`.
- **Cascade on delete**: Reminders tied to a contact cascade when the contact is deleted; standalone reminders (contact_id = null) remain until explicitly deleted.
