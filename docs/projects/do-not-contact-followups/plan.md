# Do-not-contact follow-up suppression

## Goal

When a contact is marked as not needing contact reminders, Kindred must stop
presenting that contact in stay-in-touch/cadence surfaces and clear its linked
follow-up reminders. The same behavior applies when the communication
preference's do-not-contact control is enabled.

## User-visible behavior

- Contacts marked `do_not_contact` do not appear in `/contacts/overdue` or
  `/contacts/losing-touch`.
- Due and regular reminder lists do not expose reminders linked to a contact
  marked `do_not_contact`.
- Enabling either do-not-contact control soft-deletes linked reminders so they
  are cleared from the reminder list and cannot fire later.
- The Stay in Touch widget never renders a "Do not contact" badge or a
  suppressed contact, including while stale API data is being displayed.
- Standalone reminders remain unaffected.

## Boundaries and risks

- Preserve contact records, interaction history, and reminder rows for audit;
  clear reminders through the existing soft-delete field.
- Re-enabling contact reminders does not restore reminders that were cleared.
- Shared contacts use the same suppression rule because the list/reminder
  queries already scope visibility separately.

## Acceptance criteria

1. Backend tests prove suppression in overdue, losing-touch, due, and regular
   reminder listings.
2. Backend tests prove enabling either control soft-deletes linked reminders
   while preserving standalone reminders.
3. Frontend tests prove the widget omits suppressed API rows and never renders
   the old badge text.
4. Relevant frontend and backend tests, lint, typecheck, and coverage pass.

## Test plan

- Backend: `just pytest -- tests/api/routes/test_contacts.py tests/api/routes/test_reminders.py tests/api/routes/test_communication_preferences.py`
- Frontend: `cd frontend && pnpm test -- src/__tests__/components/Dashboard/StayInTouchWidget.test.tsx`
- Full checks: `just lint`, `just typecheck`, `just test-backend`,
  `just test-frontend`
- Development server: `just dev`
