---
title: vCard Round-Trip Hash Verification
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Alembic migration to add vcard_sha256 column to Contact table
---

# vCard Round-Trip Hash Verification

## Goal

Prevent unintended data loss when CardDAV clients sync contact updates. By storing sha256(vcard_raw) on every write and comparing on CardDAV PUT, detect content drift (changes from the remote server that exceed a normalized-whitespace tolerance). Flag conflicts for user review instead of silently overwriting local edits or accepting remote mutations that differ only by client-specific formatting.

## Tasks

- [ ] Create Alembic migration: add vcard_sha256 column (VARCHAR(64)) to Contact table
- [ ] Write pre-save hook to compute SHA256 hash of normalized vcard_raw
- [ ] Implement conflict detection on CardDAV PUT (compare incoming hash vs stored hash)
- [ ] Build conflict data model and database table for review queue
- [ ] Add manual conflict resolution UI and API endpoints
- [ ] Normalize vCard before hashing (CRLF -> LF, sort properties, strip trailing whitespace)

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Prerequisite for CardDAV feature:** Full CardDAV sync requires round-trip integrity; hashing guards against silent data loss and client-side mutation drift (e.g., Apple Contacts strips custom X-* fields, Thunderbird reorders properties).
- **Normalization is critical:** Different clients emit the same contact with different line endings (CRLF vs LF), field ordering (N before FN), and whitespace. Hash must be stable across these variations or every sync triggers a conflict false positive.
- **Whitespace tolerance:** Incidental drift (blank lines, trailing spaces) should not block sync; only structural/semantic changes (name, email, phone removal) should flag for review.
- **Conflict data model:** Store (contact_id, incoming_vcard_raw, incoming_hash, local_hash, created_at, resolved_at, resolution_type) to let users compare diffs and choose which version to keep.
- **User review queue:** UI shows side-by-side diff of local vs incoming vCard; user can pick "keep local", "accept remote", or "manual merge" (load both into editor and resolve).
- **Reference:** See [models.py](../../../backend/app/models.py) for Contact.vcard_raw (raw vCard 3.0 text) and vcard_etag (CardDAV server ETag for incremental sync).
