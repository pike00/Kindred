---
title: Reminders Bell and Badge
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Implement /reminders/due GET endpoint (filter reminders due today + overdue, scoped to owner_id)
---

# Reminders Bell and Badge

## Goal

Persistent header bell icon with a badge showing the count of reminders due today and overdue. Clicking opens a popover list with snooze, log-as-interaction, and dismiss actions to keep the contact workflow tight.

## Tasks

- [ ] Implement /reminders/due GET endpoint (filter reminders due today + overdue, scoped to owner_id)
- [ ] Header bell component with count badge and aria-live region
- [ ] Popover list showing due reminders with contact name + title + description
- [ ] Snooze button (15min, 1h, 4h, tomorrow, 1 week) -- writes to Reminder.snoozed_until
- [ ] Log-as-interaction button (opens FAB for quick interaction record on the linked contact)
- [ ] Dismiss button (marks as snoozed_until = now, soft-clear from the badge)
- [ ] Auto-refetch count every 60s (or SSE streaming for near-real-time updates)

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Live count refresh strategy**: Start with polling every 60s (simple, no server-side state). Consider SSE later if users find stale badges frustrating.
- **Snooze writes**: Snooze button updates `Reminder.snoozed_until` to a future datetime; the endpoint filters `WHERE remind_at <= now() AND (snoozed_until IS NULL OR snoozed_until <= now())`.
- **Log-as-interaction**: Clicking "Log Interaction" from the bell popover opens the floating action button (FAB) in the app shell, pre-populated with the contact_id from the reminder. The user writes notes, selects a channel, and submits -- which then auto-refreshes the badge count.
- **Mobile hit targets**: Bell icon + popover trigger should be >= 44px tall/wide; popover list items also 44px+ for touch friendliness.
- **Accessibility**: Badge count lives in `<span aria-live="polite">` so screen readers announce count changes when reminders are dismissed or snoozed. Badge also labels the bell with `aria-label="Reminders, {count} due"`.
- **Model reference**: See [Reminder](../../../backend/app/models.py) for the schema -- `id`, `title`, `description`, `remind_at`, `frequency`, `is_active`, `contact_id` (nullable), `owner_id`, `last_sent_at`, `snoozed_until`, `created_at`.
- **Cascade on delete**: Reminders tied to a contact cascade when the contact is deleted; standalone reminders (contact_id = null) remain until explicitly deleted.
