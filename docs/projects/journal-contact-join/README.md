---
title: Journal to Contact Join
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Design junction table migration
---

# Journal to Contact Join

## Goal
Allow journal entries to reference specific contacts privately without duplicating note content. A journal entry can now be tagged with one or more contacts to capture your personal reflections about them—distinct from timestamped notes attached to contacts themselves.

## Tasks
- [ ] Create `journal_entry_contact` junction table Alembic migration
- [ ] Add `JournalEntryContact` model, CRUD schemas, and FastAPI endpoints
- [ ] Implement journal entry editor person picker UI component
- [ ] Add "reflections" section to contact detail page displaying linked journal entries
- [ ] Set privacy default: journal entries with contact tags remain private to owner even if contact tags are shared
- [ ] Test cascade behavior on contact/journal entry deletion

## Session Log

### 2026-04-21
- Project created.

## Notes
- **Distinction from note mentions**: Contact notes (the `Note` model) are timestamped, contact-specific records. Journal entries are personal reflections decoupled from any contact timeline. The junction table lets you privately index a journal entry against one or more people without mentioning them in the entry text itself. Useful for processing feelings before deciding to act on them.
- **Privacy model**: A `JournalEntry` is always private to its owner. The presence of contact tags does not change this—shared tags control access to contacts, not to the journal entries linked to them. A contact shared via a tag never sees reflections about them in a journal.
- **Schema reference**: See `backend/app/models.py` for existing `JournalEntry` (lines 1532-1568) and `Contact` models. `JournalEntry.owner_id` + `entry_date` and `body` are the core fields. Contact has `id`, `owner_id`, `first_name`, `last_name`, etc.
- **Unified timeline candidate**: Future work can merge contact notes, interactions, life events, and linked journal entries into a single chronological timeline view on the contact card, with separate filters/sections for each type.
- **Cascade semantics**: Deleting a contact removes its entry in the junction table, leaving the journal entry intact. Deleting a journal entry cascades to remove its junction rows. This preserves both sides' autonomy.
- **Shared tag privacy**: Do not grant access to a journal entry based on its linked contact's tag shares. The journal entry owner controls all visibility; contact-based access does not leak into the journal domain.
