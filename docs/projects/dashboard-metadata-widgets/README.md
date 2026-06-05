---
title: Dashboard Metadata Widgets
status: completed
repos: [personal-crm]
started: 2026-05-31
last_updated: 2026-06-05
next_step: Upcoming-birthdays + due-reminders dashboard widgets shipped.
---

# Dashboard Metadata Widgets

## Goal
The dashboard (`/`, `frontend/src/routes/_layout/index.tsx`) currently shows a greeting hero with stat counts (contacts / losing-touch / reminders / journal), a "Stay in touch" featured card, and two lists (Losing touch, Recent interactions). The marketing copy promises "birthday alerts" on the dashboard, but there is **no birthdays section** and reminders appear only as a count, not a list. Surface the high-value, time-sensitive metadata a relationship CRM should lead with: upcoming birthdays, due reminders, and (optionally) upcoming life events/anniversaries.

Flagged in the 0.2.x feature-verification pass: Dashboard — "missing birthdays, other metadata".

## Tasks
- [ ] Add an **Upcoming Birthdays** card — compute client-side from the contacts already fetched on the dashboard (no extra API call). Filter contacts with a `birthday`, sort by days-until-next-birthday, show the next ~5-10 (next 30-60 days). Render avatar + name + age (if year known) + "in X days"; link each to the contact. Empty state: "No birthdays coming up."
- [ ] Add a **Due Reminders** card — fetch `RemindersService.listDueReminders({ limit: 5 })` (dedicated endpoint, returns `.data[]` + `.count`). Show title + due date with quick actions (view / snooze / dismiss). Empty state: "All caught up."
- [ ] (Optional) **Upcoming life events / anniversaries** card — `CalendarService.getCalendarMonth()` for this + next month, filter `type !== "birthday"`.
- [ ] Lay the new cards into the dashboard grid (consider a 3-up row: birthdays | due reminders | recent interactions, or a second card row).
- [ ] Extract reusable components: `frontend/src/components/Dashboard/UpcomingBirthdaysCard.tsx`, `DueRemindersCard.tsx`.
- [ ] E2E/component coverage: birthdays sort order + links; due reminders sort by due date.

## Session Log

### 2026-06-05
- Housekeeping: Upcoming-birthdays + due-reminders dashboard widgets shipped.

### 2026-05-31
- Project created from the 0.2.x feature-verification pass (user flag: dashboard "missing birthdays + other metadata").
- Verified data sources (read-only): `ContactPublic.birthday` exists and the dashboard already fetches `ContactsService.listContacts({ limit: 100 })`, so **upcoming birthdays need no backend work** — compute client-side. `RemindersService.listDueReminders` and `CalendarService.getCalendarMonth` already exist for the other cards. The dashboard file already imports `daysUntilBirthday()` / `daysBetween()` helpers and the reusable `SectionHeading` / `EmptyState` / `ContactAvatar` / `Badge` / `Link` components.
- Conclusion: **no backend changes required** — this is a frontend-only enrichment, ~half a day.

## Notes
- Reuse, don't reinvent: `SectionHeading`, `EmptyState`, `FeaturedCard`, `ContactAvatar`, `Badge` already live under `frontend/src/components/Common/` and are imported by the dashboard today.
- `daysUntilBirthday(birthday)` and `daysBetween(iso)` already exist in `index.tsx` — lift them into a shared util if the new cards are extracted into separate files.
- Related but distinct projects: `birthday-anniversary-calendar` (the full-page month grid at `/calendar`) and `stay-in-touch-dashboard` (overdue-contact widget, currently blocked on Communication Preferences). This project is the *summary cards on the home dashboard*, not either of those.
- Data-fetch budget: birthdays = 0 extra calls (reuse contacts), due reminders = 1 call, life events = 1-2 calls. Keep the dashboard snappy.
