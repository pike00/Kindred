---
title: Reminder Snooze History
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Released as v0.1.5. UI badges + dashboard chronic-snooze widget remain for a follow-up.
---

# Reminder Snooze History

## Goal
Transform reminder snoozing from a single overwrite (`snoozed_until` on Reminder) into an append-only log. This reveals usage patterns like "I've snoozed calling Mom four times in two weeks" and enables UI features like snooze-count badges and chronic-snooze alerts on the dashboard.

## Tasks
- [ ] **Verify (LLM-built, to_review):** exercise the snooze append-log + snooze-stats + chronic-snoozers endpoints; confirm the denormalized `Reminder.snoozed_until` cache stays consistent with the latest log row
- [x] Create Alembic migration: add `reminder_snooze` table with (reminder_id, snoozed_at, snoozed_until, reason)
- [x] Implement snooze API endpoint: POST /reminders/{id}/snooze writes a log row and updates denormalized Reminder.snoozed_until
- [x] Add compute function: derive effective snoozed_until from latest reminder_snooze row
- [ ] UI: Add snooze count badge to reminder cards (query max count per reminder in last 30 days)
- [ ] Dashboard: Surface chronic-snooze signal (contacts with >3 snoozed reminders in 7 days)
- [ ] Data retention: Document and enforce policy (e.g. keep 90 days of snooze history, archive older rows)

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-05-31
- Housekeeping: status → `to_review`. Completed by an LLM (Dirac agent, squash-merge `7cea062`, shipped v0.1.5); involved a SQLModel `back_populates` workaround and a non-default `__tablename__`. Added a verification task.

### 2026-05-15
- Squash-merged `dirac/reminder-snooze-history` into main as commit `7cea062`; tagged and released **v0.1.5**.
- Landed: `reminder_snooze` table (Alembic migration), `ReminderSnooze` SQLModel (with explicit `__tablename__ = "reminder_snooze"` because SQLModel maps `ReminderSnooze` → `remindersnooze` by default), append-only snooze log row inside the existing `POST /reminders/{id}/snooze` handler, new endpoints `GET /reminders/{id}/snooze-history`, `GET /reminders/snooze-stats`, `GET /reminders/chronic-snoozers`, and `get_effective_snoozed_until()` helper in `crud.py`.
- Discovered: `snoozes: list["ReminderSnooze"] = Relationship(back_populates="reminder")` on the `Reminder` table model crashes with SQLModel 0.0.31 — `ValueError: <class 'list'> has no matching SQLAlchemy type`. Fixed by removing the back-populates list entirely; lookups go via direct query on `ReminderSnooze.reminder_id`.

### 2026-04-21
- Project created.

## Notes

### 2026-05-15
- **Decisions:** SQLModel back_populates list relationship was dropped on the `Reminder` parent side because SQLModel 0.0.31's type system rejects `list[ForwardRef]` on `table=True` without a `link_model`. Use direct queries on `ReminderSnooze.reminder_id` instead.
- **Gotchas:** SQLModel infers `__tablename__` as lowercase-no-separator (`reminder_snooze` class → `remindersnooze` table), but the Alembic migration creates `reminder_snooze`. Explicit `__tablename__ = "reminder_snooze"` is required.
- **Accomplished:** v0.1.5 shipped, 262 backend tests green, GH release published.

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
