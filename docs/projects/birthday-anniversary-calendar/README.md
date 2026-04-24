---
title: Birthday and Anniversary Calendar
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Design /calendar/month/{yyyy-mm} endpoint schema and pagination for multiple events per day
---

# Birthday and Anniversary Calendar

## Goal

Month-view calendar UI displaying birthdays (from Contact.birthday) and annual life events (from LifeEvent with create_annual_reminder=true) as dots or badges on each day. Click a day to see people and jump to their contact. Age display for birthdays, year navigation between months.

## Tasks

- [ ] Design GET /calendar/month/{yyyy-mm} endpoint: returns day -> list of (name, type, age|event_type, contact_id)
- [ ] Build month-view React component: grid layout, highlight today, dot stacking for multi-event days
- [ ] Implement day drill-down panel: click day to expand and see all people/events
- [ ] Add click-through to contact detail page from drill-down
- [ ] Compute age on birthday endpoint (birth_year derived from contact.birthday)
- [ ] Month/year navigation: prev/next buttons, jump to date picker
- [ ] Integrate with ICS export: link calendar to feed subscription
- [ ] Handle partial birthdays (year unknown): display as "--" age, still appears on month view
- [ ] Write integration tests: fixture contacts with various birthdays, events, edge cases
- [ ] Update API docs with /calendar/month/{yyyy-mm} schema

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- README created with template and initial task breakdown.
- Reviewed models: Contact.birthday (date or null), LifeEvent.create_annual_reminder (bool).

## Notes

- **Partial birthdays (year unknown):** Contact.birthday can be stored as YYYY-MM-DD with year=0000 or similar sentinel, or as month+day only (out of scope for now). Store as-is; endpoint detects year and returns null age. UI displays "--" or "age TBD".

- **Calendar library choice:** Use react-big-calendar or a lightweight grid (CSS Grid) rather than heavyweight calendars. react-big-calendar is mature but larger; custom grid scales better for a single month view.

- **Pairing with ICS export:** birthday-anniversary-calendar provides the UI, and ICS export feature provides the subscription feed. Calendar UI should expose "Subscribe to .ics" link using CalendarToken generated in user settings.

- **Multi-event day stacking:** A day can have multiple birthdays (e.g., John and Jane both born on Feb 14). Drill-down panel lists all. Dot/badge UI should scale (e.g., stack up to 3 dots, "+N more" for rest).

- **Today highlight:** On page load, pre-scroll or highlight today's date in the grid. Month navigation should default to current month but allow jumping backward for historical reference.

- **Age calculation edge cases:** If birthday has year, compute age as (now.year - birth_year). Handle leap day (Feb 29) births: on non-leap-year renders, show Feb 28 or Mar 1 (client preference).

- **Timezone awareness:** Birthdays are stored as dates (no time). Ensure that the month endpoint respects the owner's or contact's timezone to avoid off-by-one on date boundaries. For now, assume UTC or owner timezone.

- **Performance:** Endpoint should query Contact and LifeEvent tables filtered by month+year. Index on Contact.birthday and LifeEvent.occurred_at (month+year). Cache per user per month to avoid repeated queries.
