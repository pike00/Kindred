---
title: Contact Provenance
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Write Alembic migration adding source enum and source_external_id to Contact table
---

# Contact Provenance

## Goal
Track where each contact came from by adding a source enum (manual, vcard_import, carddav, google, webhook) and source_external_id to Contact. Makes re-syncs idempotent and lets UI show "imported from Google on 2025-12-03".

## Tasks
- [ ] Write Alembic migration to add source (VARCHAR enum) and source_external_id (VARCHAR, nullable) columns to contact table
- [ ] Update Contact, ContactBase, ContactCreate, ContactUpdate, and ContactPublic models in models.py; define ContactSource enum
- [ ] Create unique constraint on (owner_id, source, source_external_id) to prevent duplicate imports
- [ ] Backfill existing contacts as source=manual, source_external_id=null
- [ ] Implement upsert logic in contact service: on create, check (source, source_external_id) match; if exists, update instead of insert
- [ ] Add UI badge on contact detail page showing source and import date (created_at or metadata from sync)
- [ ] Write tests for upsert paths (CardDAV re-sync, Google import retry), unique constraint violation, and manual contact creation

## Session Log

### 2026-04-21
- Project created.

## Notes
- **ContactSource enum:** manual, vcard_import, carddav, google, webhook. Stored as string in DB for flexibility; Python enum in model for type safety.
- **Unique constraint:** (owner_id, source, source_external_id) allows same external ID from different sources (e.g. person imported from both Google and CardDAV). Prevents duplicate entries from the same source on re-sync.
- **Backfill:** Existing rows get source=manual, source_external_id=null. Backfill is one-time and reversible (just migration down).
- **Idempotent re-sync:** CardDAV sync fetches contacts, computes (source=carddav, source_external_id=vcard_uid or carddav_path), calls upsert. If row exists, update metadata; if not, insert. Same pattern for Google Contacts, vCard imports, webhook ingest.
- **source_external_id shape:** Store the upstream ID (Google contact ID, CardDAV UID, vCard FILENAME). Pair with source to handle UUID collision risk across systems.
- **Conflict with contact merge:** Merging two contacts with different sources raises a question: which source_external_id wins? Consider storing merge history separately or preventing merges across source boundaries. Defer to future project.
- **Source account removal:** If user disconnects their Google account, what happens? Option A: mark source=google contacts as archived. Option B: convert to manual. Option C: delete. Recommend Option A (archive) to preserve history; UI can show "orphaned from Google".
- **References:** [models.py](../../../backend/app/models.py) lines 353-435 (ContactBase), 465-520 (Contact table definition), 522-535 (ContactPublic response).
