---
title: Communication Preferences
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Alembic migration for communication_preference table with preferred_channel, best_time_local, do_not_contact fields
---

# Communication Preferences

## Goal
Replace free-text `how_we_met` narrative with structured communication metadata: `preferred_channel` (enum reusing InteractionChannel), `best_time_local` (HH:MM range for local contact window), `do_not_contact` flag with reason. Enable dashboard filtering by communication channel and reminder suppression when do-not-contact is active.

## Tasks
- [ ] Create Alembic migration: add communication_preference table with foreign key to contact, reuse InteractionChannel enum
- [ ] Add CommunicationPreferenceBase/Create/Update/Public models to [models.py](../../../backend/app/models.py); wire up Pydantic validation for best_time_local HH:MM format
- [ ] Implement CRUD endpoints: GET /api/v1/contacts/{id}/communication-preference, PATCH (upsert), DELETE
- [ ] Create React form section in contact edit dialog with channel selector, time range picker, do-not-contact toggle + reason textarea
- [ ] Add dashboard widget to filter contacts by preferred_channel and visualize do_not_contact status
- [ ] Update reminder suppression logic to skip reminders when contact.communication_preference.do_not_contact is true and reason is logged

## Session Log

### 2026-04-21
- Project created.

## Notes

- **InteractionChannel enum:** [Defined in models.py](../../../backend/app/models.py) lines 126-133; values are CALL, IN_PERSON, TEXT, EMAIL, VIDEO, SOCIAL, OTHER. Communication preferences will reuse this to keep sync between interaction tracking and preferred contact method.
- **best_time_local timezone pairing:** The best_time_local field (HH:MM range like "09:00-17:00") operates in the contact's local timezone. Contacts lack a timezone field currently; consider adding timezone (IANA string, e.g. "America/Denver") to Contact model or storing in communication_preference itself to enable proper scheduling recommendations (item 8 in original spec).
- **Dashboard consumption:** Item 32 (original spec) describes a dashboard widget that surfaces contacts grouped by preferred_channel. This widget will query contacts with a communication_preference join and render channel-segmented lists or filter controls. Implement alongside the contact list views in frontend/src/components/Contacts/.
- **do_not_contact audit trail:** The reason field on do_not_contact is audit-sensitive (e.g. "Do not contact: deceased", "Requested to be removed", "Legal hold"). Store as free text (max 500 chars) but consider adding a created_at/updated_at timestamp to track when the restriction was put in place; useful for compliance and recall.
- **Soft-delete alignment:** Contact already has is_archived and is_deceased flags. do_not_contact is distinct: it suppresses outbound contact but does not hide the record. Reminders (via ARQ worker in backend/app/worker.py) must check both do_not_contact and is_deceased before firing.
- **Schema migration collision pattern:** Personal-CRM uses Alembic for migrations. New migration revision IDs are auto-numbered and may collide if multiple agents commit simultaneously. Use the depends_on pattern documented in project memory: https://pike00.mempalace.example.com (item: Personal-CRM Alembic migration collision) to chain uncommitted migrations and avoid conflicts.
