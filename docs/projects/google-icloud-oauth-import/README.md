---
title: Google / iCloud OAuth Contact Import
status: in-progress
progress: 2/10
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Implement task 3 — Google People API delta sync (use stored credential + syncToken to fetch contacts, map People API names/emails/phones into Contact + ContactField rows)
---

# Google / iCloud OAuth Contact Import

## Goal
Enable one-click seeding of contacts from Google Contacts and iCloud. Implement provenance tracking so re-running the import doesn't create duplicates. Support incremental syncing for Google (via syncToken) and iCloud (via app-specific passwords and CardDAV).

## Tasks
- [x] Design contact provenance tracking: add source_provider (enum: google, icloud, manual) and source_external_id (string, indexed) to Contact model; migration + schema updates
- [x] Implement Google People API OAuth flow: authorize, exchange code for token, store refresh token in user secrets
- [ ] Implement Google incremental sync: use syncToken from previous run to fetch deltas; map People API names/emails/phones to Contact fields
- [ ] Add iCloud CardDAV login (email + app-specific password, no OAuth): enumerate addressbooks, fetch vCard collection, parse into Contact fields
- [ ] Build import preview UI: show incoming contacts side-by-side with existing matches (via name/email dedup heuristic), allow user to select merge or create behavior
- [ ] Handle conflicts on re-run: if source_external_id exists, offer update or skip; if partial match by name/email, show warning and let user choose
- [ ] Implement token storage security: encrypt refresh tokens in database, rotate on expiration, handle revocation gracefully
- [ ] Map field differences: Google uses structured names (givenName, familyName); iCloud uses N field in vCard; normalize to Contact.first_name, Contact.last_name, etc.
- [ ] Add incremental re-sync endpoints: GET /contacts/import/google/sync (full or delta based on syncToken), POST /contacts/import/google/authorize, POST /contacts/import/icloud/connect
- [ ] Test re-import idempotence: verify 2nd run doesn't duplicate, correctly updates changed fields, preserves manual edits

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-28
- Implemented tasks 1 and 2 on worktree branch `worktree-google-icloud-oauth-import` (not yet merged to main).
- Task 1 (`4e52505`): `ContactSource` enum, `source_provider`/`source_external_id` columns, partial unique index `ux_contact_owner_provider_external`, migration `d4e5f6a7b8c9`.
- Task 2 (`18dd683`): Google OAuth authorize/exchange routes, `core/crypto.py` (Fernet+HKDF-SHA256), `OAuthCredential` model, migration `e5f6a7b8c9d0`, 10 passing tests.
- db-docs regenerated (`fc56c06`). All pushed to origin.

### 2026-04-23
- Project created. README written.

### 2026-04-21
- Project created.

## Notes

### 2026-04-28
- **Accomplished:** Tasks 1 and 2 shipped on `worktree-google-icloud-oauth-import` branch (not yet merged to main). Provenance schema + Fernet crypto helpers + OAuth credential model + Google authorize/exchange routes + 10 tests, all committed and pushed.
- **Decisions:** Work lives in a git worktree; merge to main after task 3+ complete. Code is accessible via `git show worktree-google-icloud-oauth-import:<path>`.
- **Gotchas:** `sa.Enum(...).create()` + `op.create_table()` both emit `CREATE TYPE` — DuplicateObject. Fix: declare enum inline in column, no standalone create. Pattern from `media_recommendation` migration.

- **Contact provenance hard dependency:** Requires Contact.source_provider (enum) and Contact.source_external_id (string, unique per provider per user) columns. See [models.py Contact definition](../../../backend/app/models.py) lines 465-520. Without this, re-run deduping is manual and error-prone.
- **iCloud requires app-specific password:** iCloud.com does not support standard OAuth for CardDAV. User must generate an app-specific password in iCloud account settings. Store securely; rotate periodically. No long-lived refresh token like Google.
- **Google People API syncToken:** Each sync response includes a syncToken. Store it per user (e.g., in a sync_metadata table or encrypted in User). Next sync request passes syncToken to get only deltas since last run. Full sync (no token) on first import takes longer but ensures completeness.
- **Conflict resolution:** Merge strategy on re-run: (1) if source_external_id matches, merge fields (update timestamps, keep manual edits, overwrite provider-sourced fields). (2) If name + primary email match existing contact but source_external_id absent, warn user (possible duplicate from other import or manual entry). (3) Offer create-or-skip for unmatched.
- **Token storage security:** Use database encryption (or external secret store) for refresh tokens. Never log or expose in API responses. Implement token rotation: refresh before expiry, handle 401 gracefully (re-authorize), catch revocation and alert user.
- **Field mapping:** Google People API: givenName -> first_name, familyName -> last_name, middleName -> middle_name, phoneticGivenName/phoneticFamilyName -> ignored (no storage). Email/phone -> ContactField records. iCloud vCard N field: n-part -> name components; EMAIL and TEL -> ContactField records. Both providers may include notes (BDAY, ORG, TITLE) -> map to Contact columns if present.
- **Frontend preview:** Import flow: (1) authorize/connect. (2) Fetch and display batch (e.g., first 50). (3) Show side-by-side: incoming contact name/email/phone vs. matched existing contact. (4) User checkboxes: [Merge] [Skip] [Create new]. (5) Confirm and execute. (6) Show results: N created, M merged, K skipped.
- **CardDAV vCard preservation:** iCloud vCards may contain X-extensions (custom fields, special formatting). Store vcard_raw in Contact for round-trip fidelity. On export/sync-back to iCloud, reconstruct from vcard_raw if available, else build from Contact fields.
- **References:** [Contact model](../../../backend/app/models.py) lines 465-520, [ContactField model](../../../backend/app/models.py) lines 575-595, [Google People API docs](https://developers.google.com/people), [CardDAV RFC 6352](https://tools.ietf.org/html/rfc6352), [iCloud app-specific passwords](https://support.apple.com/en-us/102654).
