---
title: Contact Timezone and Pronouns
status: completed
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Broad city timezone search (e.g. New Orleans -> America/Chicago) shipped v0.2.88.
---

# Contact Timezone and Pronouns

## Goal
Add two small fields to the Contact model: timezone and pronouns. Timezone enables converting cadence-based reminders from the owner's time to the contact's local time. Pronouns appear in summaries, generated messages, and contact context throughout the UI.

## Tasks
- [ ] Write Alembic migration to add timezone (VARCHAR, nullable) and pronouns (TEXT, nullable) columns to contact table
- [ ] Update Contact, ContactBase, ContactCreate, ContactUpdate, and ContactPublic Pydantic models in models.py
- [ ] Add timezone selector (IANA string) and pronouns field to contact form in frontend
- [ ] Implement reminder time conversion logic: pair contact_frequency_days with contact's timezone to compute next reminder in their local time
- [ ] Surface pronouns in contact summary card, interaction context, and auto-generated message templates
- [ ] Add tests for timezone conversion (UTC owner, various contact timezones) and pronoun field storage/retrieval

## Session Log

### 2026-06-05
- Housekeeping: Broad city timezone search (e.g. New Orleans -> America/Chicago) shipped v0.2.88.

### 2026-04-21
- Project created.

## Notes
- **IANA timezone strings:** Store as `America/New_York`, `Europe/London`, etc. Use Python's `zoneinfo.ZoneInfo` or `pytz` for runtime conversion. Keep as nullable; absence means owner's timezone applies.
- **Reminder computation:** When firing contact-frequency reminders, compute `now.astimezone(contact.timezone)` to determine if it's 9am in their local time. If contact_frequency_days is set and we're at or past 9am their time and N days have elapsed since last_contacted_at, fire.
- **Pronoun field shape:** Start with free text (str, max 100 chars, nullable). Simplifies UI and accommodates custom pronouns. No enum — avoids needing migration if pronouns need extending.
- **Default behavior:** If contact.timezone is null, assume owner's timezone or UTC. If contact.pronouns is null, omit from templates or use neutral phrasing ("You should follow up with X...").
- **vCard round-trip:** Pronouns may exist in vCard X-PRONOUNS; preserve in vcard_raw on CardDAV sync.
- **References:** [models.py](../../../backend/app/models.py) lines 353-435 (ContactBase), 465-520 (Contact table definition), 522-535 (ContactPublic response).
