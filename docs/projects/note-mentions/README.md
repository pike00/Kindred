---
title: Note Mentions
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-26
next_step: Create Alembic migration for note_mention (note_id, contact_id composite PK, no offset/length)
---

# Note Mentions

## Goal
Enable `@contact` mentions within note text so mentions surface on the contact's timeline without duplicating the note content. Modelled after Notion's bidirectional backlinks: a `note_mention` junction table links notes to mentioned contacts; the contact's timeline union-queries against it. The UI already captures `@[Name](contact_id)` tokens via MentionTextarea (shipped in commit 52edbc4) — this project builds the backend that makes them meaningful.

## Tasks
- [ ] Create Alembic migration for `note_mention` table (note_id FK, contact_id FK, composite PK, both cascade)
- [ ] Add NoteMention model to [models.py](../../../backend/app/models.py) (fields: note_id, contact_id only — no offset/length)
- [ ] Parse @-mentions from note body and upsert NoteMention rows on note create/update in crud.py
- [ ] Add `GET /contacts/{id}/mentions` endpoint returning notes that mention this contact with source contact info
- [ ] Extend `GET /notes/contact/{id}` to also return notes where this contact is mentioned (UNION approach)
- [ ] Fix MentionText renderer to resolve contact name at render time from contact_id (rename propagation)

## Session Log

### 2026-04-26
- Design locked in after research + ideation session. Notion-style bidirectional backlinks.
- Dropped offset/length from schema — not needed for backlink timeline; adds reindexing complexity for zero benefit at this stage.
- Frontend @-token format `@[Name](contact_id)` already shipped; parse regex: `@\[([^\]]+)\]\(([a-f0-9-]{36})\)`.
- Self-mention: note.contact_id = A is always implicit in A's timeline; no @A needed. UNION query deduplicates with `AND n.contact_id != :id`.
- Deleted contact: FK cascade on note_mention handles it automatically.
- Merged contact: update note_mention.contact_id to surviving ID (same pattern as interaction_attendee).
- Wrote 9 failing tests (`tests/api/routes/test_note_mentions.py`) covering: mention row creation on note create/update/delete, multi-mention notes, edit replacing old rows, backlink UNION in notes list, self-mention dedup, response shape, 404 for unknown contact, plain notes producing no rows.
- Work in progress — all tasks still unchecked; migration/model/crud/endpoint/frontend renderer to implement.

### 2026-04-21
- Project created.

## Notes

### Design decisions (2026-04-26)

**Schema:** `note_mention(note_id UUID FK→note.id CASCADE, contact_id UUID FK→contact.id CASCADE, PRIMARY KEY(note_id, contact_id))`. No offset/length — add later if rich hover-cards or inline highlighting are needed.

**Write path:** on every note create/update, delete existing `note_mention` rows for the note, then insert one row per extracted UUID. Extraction: `re.findall(r'@\[[^\]]+\]\(([a-f0-9-]{36})\)', body)`.

**Read path (timeline):**
```sql
-- notes where this contact is the author's subject
SELECT * FROM note WHERE contact_id = :id
UNION ALL
-- notes where this contact is @-mentioned (backlinks)
SELECT n.* FROM note n
JOIN note_mention nm ON nm.note_id = n.id
WHERE nm.contact_id = :id AND n.contact_id != :id
```

**Mentions endpoint** (`GET /contacts/{id}/mentions`): returns `[{note_id, note_body, note_created_at, source_contact: {id, first_name, last_name, avatar_url}}]`. Scoped to owner — only mentions in notes owned by `current_user`.

**MentionText fix:** change renderer to look up contact name from the UUID at render time (React Query contact fetch or pass contacts map as prop) instead of trusting the baked-in name. Prevents stale display names after contact rename.

**What other CRMs do:**
- Monica: no @-mention system; notes hard-linked to one contact only.
- Notion: bidirectional page backlinks (our model); stores ID, renders live title.
- Twenty/Attio: notes attach to multiple objects at creation, no body-level mention extraction.
- Obsidian: `[[page]]` hard links with backlinks panel.

We are implementing the Notion pattern: token stores UUID, backend extracts on save, backlinks surface on the mentioned contact's profile.
