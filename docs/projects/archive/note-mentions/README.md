---
title: Note Mentions
status: in-progress
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-05-01
progress: 6/6
next_step: Manual smoke in worktree dev stack, then merge note-mentions to main
---

# Note Mentions

## Goal
Enable `@contact` mentions within note text so mentions surface on the contact's timeline without duplicating the note content. Modelled after Notion's bidirectional backlinks: a `note_mention` junction table links notes to mentioned contacts; the contact's timeline union-queries against it. The UI already captures `@[Name](contact_id)` tokens via MentionTextarea (shipped in commit 52edbc4) — this project builds the backend that makes them meaningful.

## Tasks
- [x] Create Alembic migration for `note_mention` table (note_id FK, contact_id FK, composite PK, both cascade)
- [x] Add NoteMention model to [models.py](../../../backend/app/models.py) (fields: note_id, contact_id only — no offset/length)
- [x] Parse @-mentions from note body and upsert NoteMention rows on note create/update in crud.py
- [x] Add `GET /contacts/{id}/mentions` endpoint returning notes that mention this contact with source contact info
- [x] Extend `GET /notes/contact/{id}` to also return notes where this contact is mentioned (UNION approach)
- [x] Fix MentionText renderer to resolve contact name at render time from contact_id (rename propagation)

## Session Log

### 2026-05-01
- Discovered a parallel uncommitted implementation in `.claude/worktrees/note-mentions` (older worktree convention) that the dev stack was bind-mounted to. Promoted that work onto the rebased `note-mentions` branch in `.worktrees/note-mentions` (the project-local convention) after diffing — single source of truth on this branch now.
- Tore down the stack against the legacy path; brought it up against `.worktrees/note-mentions` so future containers bind-mount the right tree.
- All 10 tests in `tests/api/routes/test_note_mentions.py` pass against the promoted code; full backend suite has 3 unrelated pre-existing failures (auth-mode + email config) that also fail on `main`.
- Backend changes: `NoteMention` model, `d4e5f6a7b8c9_add_note_mention.py` migration, `_sync_note_mentions` helper in `crud.py`, new `update_note` CRUD function, route renamed to `update_note_route` for consistency, `GET /contacts/{id}/mentions` endpoint, `GET /notes/contact/{id}` extended via OR-clause to return both direct and backlinked notes.
- Frontend changes: `MentionText` resolves names live from `["contacts"]` query (no more stale baked-in names); `NotesService.updateNote` call site updated to `updateNoteRoute` after operation_id change; SDK regenerated against new openapi.

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

### 2026-05-01
- **State sync:** bumped last_updated; flipped status active→in-progress; rebased onto main; promoted prior session's implementation (see Session Log entry); progress 6/6.
- **Discrepancies at load:** initial sync reported no implementation, but a parallel `.claude/worktrees/note-mentions` worktree held an uncommitted full implementation that the dev stack was bind-mounted to. README didn't reflect it because nothing was committed there.
- **Resolution:** prior session's code copied into this worktree, dev stack repointed, tests rerun (10/10 pass), branch ready for merge after manual smoke.

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
