---
title: Full-Text Search
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Alembic migration adding tsvector columns to Contact, Note, Interaction, JournalEntry
---

# Full-Text Search

## Goal
Implement postgres full-text search over Contact names/company/how_we_met, Note.body, Interaction.notes, and JournalEntry.body. Add one global `/search` endpoint and one keyboard-invoked search UI with result ranking and type badges (Contact, Note, Interaction, JournalEntry).

## Tasks
- [ ] Create Alembic migration: add tsvector columns + GIN indexes (generated or trigger-maintained)
- [ ] Implement `/search?q=...` FastAPI endpoint with multi-table union and owner_id scoping
- [ ] Add result ranking (BM25 or ts_rank) and type badges in response
- [ ] Wire search results UI with fuzzy/exact highlighting
- [ ] Add tag/share scoping (respect TagShare access on searches)
- [ ] Integration tests for search endpoint and edge cases
- [ ] Pair with item 29 (command palette) for keyboard invocation

## Session Log

### 2026-04-21
- Project created.

## Notes
- Contact has `first_name`, `last_name`, `company`, `how_we_met` fields; all optional except `first_name`.
- Note has `body` (1-50000 chars) and `contact_id` FK.
- Interaction has `notes` (optional, 1-10000 chars) and `contact_id` + `owner_id` FKs.
- JournalEntry has `body` (1-50000 chars) and `owner_id` FK (not contact-scoped).
- Postgres tsvector: choose generated column + GIN index (simpler) vs trigger (update-time cost but smaller storage). Generated column requires no trigger plumbing.
- Multi-table union results need ranking across types; ts_rank or custom scoring by table + match position helps surface best hits.
- Tag/share scoping: search results visible only if user owns Contact/Note/Interaction OR grantee has read access via TagShare (contact's tags).
- Item 29 (command palette) should hook this endpoint for keyboard search invocation (Cmd+K or Ctrl+K).
