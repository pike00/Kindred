---
title: Birthday and Anniversary Calendar
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-26
next_step: Manual test in browser; then wire up ICS export link and update API docs
---

# Birthday and Anniversary Calendar

## Goal

Month-view calendar UI displaying birthdays (from Contact.birthday) and annual life events (from LifeEvent with create_annual_reminder=true) as dots or badges on each day. Click a day to see people and jump to their contact. Age display for birthdays, year navigation between months.

## Tasks

- [x] Design GET /calendar/month/{yyyy-mm} endpoint: returns day -> list of (name, type, age|event_type, contact_id)
- [x] Build month-view React component: grid layout, highlight today, dot stacking for multi-event days
- [x] Implement day drill-down panel: click day to expand and see all people/events
- [x] Add click-through to contact detail page from drill-down
- [x] Compute age on birthday endpoint (birth_year derived from contact.birthday)
- [x] Month/year navigation: prev/next buttons, jump to date picker
- [ ] Integrate with ICS export: link calendar to feed subscription
- [x] Handle partial birthdays (year unknown): display as "--" age, still appears on month view
- [x] Write integration tests: fixture contacts with various birthdays, events, edge cases
- [ ] Update API docs with /calendar/month/{yyyy-mm} schema

## Session Log

### 2026-04-26 (session 2)
- Built `MonthCalendar` React component (`frontend/src/components/Calendar/MonthCalendar.tsx`): CSS Grid 7-column month view, today highlight with primary ring, dot stacking (up to 3 colored dots + "+N more"), day drill-down panel with contact links.
- Added `/_layout/calendar` route (`frontend/src/routes/_layout/calendar.tsx`) with `?month=YYYY-MM` search param; defaults to current month.
- Added Calendar sidebar nav item (`CalendarHeart` icon) to `AppSidebar.tsx`.
- Updated `routeTree.gen.ts` to register new route (vite plugin will overwrite on next dev/build run).
- Committed and pushed to `feature/birthday-anniversary-calendar`.

### 2026-04-26
- Implemented `GET /api/v1/calendar/month/{yyyy_mm}` endpoint: aggregates birthdays and annual life events, computes age, returns grouped by day (work-in-progress, not yet committed).
- Added `CalendarEntry` and `CalendarMonthResponse` models to `models.py`.
- Registered calendar router in `api/main.py`.
- Wrote 6 integration tests (all passing): auth, birthday, life event, partial birthday null age, empty month, invalid format.
- Debugged stale alembic revision in crm_test DB (b2c3d4e5f6a7 orphan from prior branch work); fixed by manual schema reset.

### 2026-04-21
- Project created.

### 2026-04-23
- README created with template and initial task breakdown.
- Reviewed models: Contact.birthday (date or null), LifeEvent.create_annual_reminder (bool).

## Notes

### 2026-04-26
- **Decisions:** Partial birthday sentinel = `birthday.year <= 1` (Python date min); no DB migration needed (existing `date` column holds it). `CalendarEntry`/`CalendarMonthResponse` are pure Pydantic models, no new DB table.
- **Gotchas:** The `crm_test` DB can accumulate orphaned alembic revisions from prior branches — the conftest DROP SCHEMA only helps if the test DB isn't externally modified between runs. Fix: `docker exec crm-db psql -U postgres -d crm_test -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`.
- **Accomplished:** `backend/app/api/routes/calendar.py`, `backend/tests/api/routes/test_calendar.py` (6/6 tests passing), models and router wired up.

- **Partial birthdays (year unknown):** Contact.birthday can be stored as YYYY-MM-DD with year=0000 or similar sentinel, or as month+day only (out of scope for now). Store as-is; endpoint detects year and returns null age. UI displays "--" or "age TBD".

- **Calendar library choice:** Use react-big-calendar or a lightweight grid (CSS Grid) rather than heavyweight calendars. react-big-calendar is mature but larger; custom grid scales better for a single month view.

- **Pairing with ICS export:** birthday-anniversary-calendar provides the UI, and ICS export feature provides the subscription feed. Calendar UI should expose "Subscribe to .ics" link using CalendarToken generated in user settings.

- **Multi-event day stacking:** A day can have multiple birthdays (e.g., John and Jane both born on Feb 14). Drill-down panel lists all. Dot/badge UI should scale (e.g., stack up to 3 dots, "+N more" for rest).

- **Today highlight:** On page load, pre-scroll or highlight today's date in the grid. Month navigation should default to current month but allow jumping backward for historical reference.

- **Age calculation edge cases:** If birthday has year, compute age as (now.year - birth_year). Handle leap day (Feb 29) births: on non-leap-year renders, show Feb 28 or Mar 1 (client preference).

- **Timezone awareness:** Birthdays are stored as dates (no time). Ensure that the month endpoint respects the owner's or contact's timezone to avoid off-by-one on date boundaries. For now, assume UTC or owner timezone.

- **Performance:** Endpoint should query Contact and LifeEvent tables filtered by month+year. Index on Contact.birthday and LifeEvent.occurred_at (month+year). Cache per user per month to avoid repeated queries.
