---
title: Reminder Snooze History
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Alembic migration for reminder_snooze table
---

# Reminder Snooze History

## Goal
Transform reminder snoozing from a single overwrite (`snoozed_until` on Reminder) into an append-only log. This reveals usage patterns like "I've snoozed calling Mom four times in two weeks" and enables UI features like snooze-count badges and chronic-snooze alerts on the dashboard.

## Tasks
- [ ] Create Alembic migration: add `reminder_snooze` table with (reminder_id, snoozed_at, snoozed_until, reason)
- [ ] Implement snooze API endpoint: POST /reminders/{id}/snooze writes a log row and updates denormalized Reminder.snoozed_until
- [ ] Add compute function: derive effective snoozed_until from latest reminder_snooze row
- [ ] UI: Add snooze count badge to reminder cards (query max count per reminder in last 30 days)
- [ ] Dashboard: Surface chronic-snooze signal (contacts with >3 snoozed reminders in 7 days)
- [ ] Data retention: Document and enforce policy (e.g. keep 90 days of snooze history, archive older rows)

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Denormalization strategy**: Keep `Reminder.snoozed_until` as a cached view of the latest `reminder_snooze.snoozed_until`. On snooze, write to `reminder_snooze` first, then update the cache. Query either the log (for patterns) or the cache (for "is this reminder active?"). This avoids a JOIN on every active-reminder check.

- **Chronic snooze signal**: "I snoozed Mom's reminder 4 times in 7 days" indicates avoidance or low priority. Surface this on the contact card as a subtle warning (e.g. "Frequently snoozed"). Dashboard widget: contacts with >3 snoozes on any single reminder in the past 7 days.

- **Idempotency**: If a snooze request arrives twice (network retry, client bug), insert two log rows. Idempotency is at the API level (client shouldn't retry the same snooze), not the DB level. Each write is a fact about user behavior, even if accidental.

- **Retention**: Keep the full snooze history, but consider batching into summary rows after 90 days (e.g. one "snoozed 10 times" row per month per reminder). For now, no hard deletion; the log is the source of truth.

- **Reference**: [Reminder model](../../../backend/app/models.py) currently has:
  - `id: uuid.UUID` (primary key)
  - `contact_id: uuid.UUID | None` (optional FK to Contact)
  - `snoozed_until: datetime | None` (single value, about to become a denormalized cache)
  - `last_sent_at: datetime | None` (when ARQ worker last fired it)
  - `remind_at: datetime` (next scheduled fire)
  - `frequency: ReminderFrequency` (once, daily, weekly, monthly, yearly)

- **New table schema** (reminder_snooze):
  ```sql
  CREATE TABLE reminder_snooze (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_id UUID NOT NULL REFERENCES reminder(id) ON DELETE CASCADE,
    snoozed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    snoozed_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );
  ```
  - `snoozed_at`: when the user clicked snooze (or server received the request)
  - `snoozed_until`: new snooze deadline (e.g. "tomorrow 9am")
  - `reason`: optional user-entered text ("call them back later", "need more context")
  - `created_at`: row creation time (equals `snoozed_at` in most cases, but allows for backdated imports)
