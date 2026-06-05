---
title: ICS Calendar Export
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Design per-user token model and authentication strategy for /calendar.ics endpoint
---

# ICS Calendar Export

## Goal

Expose a per-user, token-authenticated `/calendar.ics` endpoint that combines Contact birthdays, LifeEvent anniversaries marked for annual reminders, and all active Reminders into a single subscribable calendar feed. Supports calendar clients (Apple Calendar, Google Calendar, etc.) via standard iCalendar format with RRULE recurrence rules and alarm settings.

## Tasks

- [ ] Design per-user token model (CalendarToken with creation, revocation, expiration)
- [ ] Implement /calendar.ics GET endpoint with bearer-token auth and query filtering (Contact.birthday, LifeEvent.create_annual_reminder, Reminder.is_active)
- [ ] Generate VEVENT entries with RRULE=FREQ=YEARLY for birthdays and anniversaries; VALARM for reminders
- [ ] Add ETag and Last-Modified headers for client-side caching
- [ ] Handle timezone awareness (contact timezone vs owner timezone vs UTC)
- [ ] Implement optional timezone parameter for output (?tz=America/Chicago)
- [ ] Write integration tests (fixture data, feed parsing, alarm verification)
- [ ] Update API docs with endpoint schema and example curl

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

### 2026-04-23
- README created with template; project scope finalized.
- Identified key design decisions: token revocation strategy, timezone handling, caching headers.

## Notes

- **Token per-user and revocable:** CalendarToken must be scoped to one owner and support immediate revocation (not just expiration) for security. Consider a token status field (active/revoked).

- **RRULE=FREQ=YEARLY for recurring events:** Birthdays and anniversaries with create_annual_reminder=true map to VEVENT with RRULE. Recurring Reminders (frequency != ONCE) also get RRULE. Use DTSTART;VALUE=DATE for all-day events (birthdays).

- **Timezone complexity:** Contact.birthday is a date (no time/tz), but some clients may show it at midnight in the owner's timezone. Decide: always render birthdays as floating (no tz) or lock to owner's tz? Anniversary events should inherit the contact's timezone if present, else owner's.

- **ETag/Last-Modified headers:** Cache the feed MD5 hash or use max(contact.updated_at, reminder.last_sent_at, life_event.created_at) for the entire dataset. Return 304 Not Modified on match.

- **Pairing with birthday calendar UI:** Frontend birthday/anniversary UI should link to the feed URL or allow subscribing to it in external calendar apps. Consider exposing the token/URL in user settings.

- **Alternative for shared calendars:** If needed, support read-only sharing (grantee_id parameter) by checking TagShare relationships in future phases.

- **Test coverage:** Verify VALARM trigger times (e.g., TRIGGER:-P1D for one-day reminder), that inactive reminders are skipped, and that multi-timezone scenarios render correctly.
