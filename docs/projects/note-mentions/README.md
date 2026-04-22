---
title: Note Mentions
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create NoteMention migration and schema model
---

# Note Mentions

## Goal
Enable `@contact` mentions within note text so mentions surface on the contact's timeline without duplicating the note content. A `note_mention` table maps character offsets to contact IDs, supporting cross-linking while preserving note integrity.

## Tasks
- [ ] Create Alembic migration and add NoteMention model to [models.py](../../../backend/app/models.py) (fields: note_id, contact_id, offset, length)
- [ ] Parse @-mentions from note body and upsert NoteMention rows on note create/update
- [ ] Add API endpoints to fetch notes mentioning a contact and retrieve mention metadata
- [ ] Extend contact timeline to include notes that mention them (via NoteMention join)
- [ ] Add UI affordance to edit notes with @-mention autocomplete and live mention highlights
- [ ] Implement offset-length reindexing on note body edits and validate invariants

## Session Log

### 2026-04-21
- Project created.

## Notes
- Offset and length fields must remain valid after note body edits. A practical approach: recompute all mentions on each update by re-parsing the body against the stored text. For large notes, lazy-reindex on first access may be needed.
- RelationshipBase uses a directional model (contact_id -> related_contact_id); Note is attached to a single contact, but NoteMention can link to any contact. This decouples notes from relationships.
- Stale contact_ids: If a mentioned contact is deleted, the mention row cascades away via foreign key. At render time, resolve mention offsets by joining Note -> NoteMention -> Contact.
- Item 30 (@contact autocomplete) in backlog — UI autocomplete should list all contacts matching the typed name/prefix and emit their UUID to bind to offset/length on submit.
- Rendering: Timeline queries can LEFT JOIN NoteMention to lift mentions onto the target contact's timeline; the note body itself remains attached to its origin contact.
