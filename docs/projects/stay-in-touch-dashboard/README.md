---
title: Stay in Touch Dashboard Widget
status: active
repos: [personal-crm]
started: 2026-04-23
last_updated: 2026-04-23
next_step: Implement /api/v1/contacts/overdue endpoint that returns contacts sorted by days_overdue descending, with contact_frequency_days and last_contacted_at populated
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

### 2026-04-23
- Project created.

## Notes

- **Days-overdue calculation:** Backend computes `days_overdue = (now - last_contacted_at).days` if `last_contacted_at` is set, otherwise contact is "never contacted" (special case). Compare against `contact_frequency_days` to flag overdue status. See [models.py](../../../backend/app/models.py) lines 424-429 and 496-499 for field definitions.
- **Skip-this-week mechanism:** "Skip This Week" is a lightweight action that pushes the due date forward without logging a user-facing interaction. Implement as a new Interaction with type SKIP (extend InteractionChannel enum or create a new SkipReason field), or add a `next_due_date_offset_days` field to Contact. The skip modifies when the contact appears overdue next, not the actual last_contacted_at timestamp. This preserves cadence honesty (you didn't actually talk to them) while deferring reminders.
- **do_not_contact integration:** Communication Preferences feature (see [communication-preferences/README.md](../communication-preferences/README.md)) defines a do_not_contact flag with optional reason text. The dashboard widget must read this field and suppress action buttons when active. If communication_preference table does not exist yet, add a defensive null check and treat missing preference as "contact is available."
- **Timezone handling:** Contacts may have a timezone field (IANA format like "America/Denver") defined in the Communication Preferences feature. Use it to determine local "now" when calculating overdue status, so contacts in UTC-7 don't get flagged as overdue at 23:00 local time if their frequency_days clock resets at midnight local. See communication-preferences notes on best_time_local and timezone pairing.
- **Quick-log FAB pairing:** The dashboard's floating action button for quick interaction logging should integrate with this widget. On click, the FAB should highlight/select the first overdue contact and open the Log Interaction modal. If no overdue contacts exist, the FAB is disabled or shows a "no contacts to update" state.
- **Interaction timestamp accuracy:** All logged interactions must include a created_at timestamp (auto-set to UTC now). The backend's create_interaction() endpoint (models.py line 964) automatically bumps the contact's last_contacted_at; ensure the widget respects this and refetches the overdue list after logging.
- **Styling and responsiveness:** Overdue contacts table should be mobile-friendly (collapse action buttons to icon menu on small screens). Use existing personal-CRM design system (if defined in frontend/src/components/shared/ or frontend/src/styles/).
