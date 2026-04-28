---
title: Google / iCloud OAuth Contact Import
status: in-progress
progress: 2/10
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-28
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

### 2026-04-28
- Loaded project state, verified live codebase had no provenance work yet.
- Implemented task 1/10: `ContactSource` enum + `source_provider` / `source_external_id` columns on Contact, with composite partial-unique index for cross-provider re-import dedup.
- Wrote and verified Alembic migration `d4e5f6a7b8c9` (full chain + downgrade roundtrip green on ephemeral postgres).
- Updated `ContactPublic` to surface the new fields with safe defaults.
- Started task 2/10: scaffolded the Google OAuth slice end-to-end — `GOOGLE_OAUTH_*` settings + `google_import_enabled` computed field, `core/crypto.py` (Fernet derived from SECRET_KEY via HKDF-SHA256), `OAuthCredential` model + `OAuthProvider` enum, migration `e5f6a7b8c9d0_add_oauth_credential.py`, route `backend/app/api/routes/contact_imports.py` with POST `/google/authorize` (returns Google consent URL + JWT state) and POST `/google/exchange` (exchanges code via httpx, stores encrypted refresh + access tokens), router mounted in `api/main.py`, 10 pytest cases covering 503-when-unconfigured / state binding / state rejection / token persistence / overwrite-on-reconnect / Google failure paths.
- Migration enum-double-create gotcha: alembic upgrade initially failed with `psycopg.errors.DuplicateObject: type "oauthprovider" already exists` because the first draft both called `OAUTH_PROVIDER.create()` AND let SQLAlchemy auto-create the type during `op.create_table()`. Fix: declare the enum inline in the column (`sa.Enum("GOOGLE", name="oauthprovider")`), drop the standalone create/drop calls, mirror the `media_recommendation` pattern. Final downgrade uses `sa.Enum(name="oauthprovider").drop(op.get_bind(), checkfirst=False)`.
- Verified end-to-end: alembic chain `e2412...` → `e5f6a7b8c9d0` upgrades clean, all 10 OAuth pytest cases pass (503-when-unconfigured, authorize URL contents, state JWT binds user+provider, 3 state-rejection paths, exchange persists with encrypted tokens, exchange overwrites in place, 2 Google-failure paths). Architectural choices for the OAuth surface (frontend-callback + backend exchange POST; full slice in this task) were confirmed with the user via question prompts before implementation.

### 2026-04-23
- Project created. README written.

### 2026-04-21
- Project created.

## Notes

### 2026-04-28 (task 2 verified)
- **Decisions:** none new — confirmed prior architectural choices held up under test.
- **Gotchas:**
  - The `cd` in a Bash compound command does not persist across separate Bash tool calls — each invocation starts in the original cwd. After the worktree session ended (between `/project-save` and resume), cwd reverted to the main repo and the test command initially failed with `file or directory not found` because `tests/api/routes/test_contact_imports.py` only exists in the worktree. Fix: prepend `cd <worktree>` to the same command line.
- **Issues (open):** none for the OAuth slice itself. Implementation files (model + migration + crypto + route + tests) are still uncommitted on `worktree-google-icloud-oauth-import` — the README commits don't carry the code.
- **Accomplished this turn:**
  - Pushed `worktree-google-icloud-oauth-import` to origin.
  - Verified migration enum-double-create fix end-to-end on ephemeral postgres: full alembic chain `e2412...` → `e5f6a7b8c9d0` runs clean.
  - Ran `pytest tests/api/routes/test_contact_imports.py -v` against the ephemeral DB: **10 passed in 0.35s** (503-when-unconfigured, authorize URL params, state binds user+provider, 4 state-rejection paths, exchange persists with encrypted tokens, exchange overwrites in place, two Google-failure paths).
  - Ephemeral DB / network / image torn down after verification.

### 2026-04-28 (task 2 WIP)
- **Decisions:**
  - Google OAuth callback flow: Google redirects to `{FRONTEND_HOST}/import/google/callback` (a future React page); page POSTs `{code, state}` to `POST /api/v1/contacts/import/google/exchange`. No backend-callback redirect dance — keeps each worktree subdomain working without extra Google Console redirect URIs.
  - State is a 10-min HS256-signed JWT (audience `contact-import-oauth`) carrying `{sub: user_id, provider, nonce, exp}`. Same SECRET_KEY as login JWT — no new key surface.
  - Token storage: separate `oauth_credential` table with `(user_id, provider)` unique constraint, NOT columns on User. Easier to extend (Calendar/Drive scopes, future iCloud-via-OAuth if Apple ever offers it) and clean to delete on disconnect.
  - Token encryption: Fernet with key derived from SECRET_KEY via HKDF-SHA256 (`info=b"personal-crm/at-rest-secrets/v1"`, static salt). Rotating SECRET_KEY invalidates all ciphertexts — accept that, no separate key management.
  - One Google account per user per provider — re-consent overwrites the row in place and clears `sync_token` so the next sync is a full pull.
  - iCloud has no `OAuthProvider` member: it uses an app-specific password, not OAuth, so it gets a different storage substrate (TBD).
- **Gotchas:**
  - `sa.Enum(...).create()` AND `op.create_table` with the same `sa.Enum` column will both try to `CREATE TYPE` — the second one fails with `DuplicateObject`. Project convention is to declare the enum inline in the column (no separate `.create()`). The `media_recommendation` migration is the reference pattern; the inverse `sa.Enum(name="...").drop(op.get_bind(), checkfirst=False)` in downgrade is the matching teardown.
  - Worktree-dev-stack work in main is still uncommitted, so `just up` is unavailable from this worktree — verification requires the manual ephemeral-postgres script (build backend image + run alembic + pytest with `POSTGRES_SERVER=oauth-import-test-db`).
- **Issues (open):**
  - `e5f6a7b8c9d0_add_oauth_credential.py` `downgrade()` still references the removed `OAUTH_PROVIDER` name — must be patched to `sa.Enum(name="oauthprovider").drop(op.get_bind(), checkfirst=False)`.
  - Once that lands, re-run: `docker run ... oauth-import-test-backend pytest tests/api/routes/test_contact_imports.py -v` against a fresh ephemeral DB to confirm all 10 OAuth tests pass and migration roundtrip is clean.
  - Frontend page at `/import/google/callback` does not exist yet — task 5 (preview UI) is the natural place for it.
- **Accomplished this turn:**
  - Files added: `backend/app/core/crypto.py`, `backend/app/api/routes/contact_imports.py`, `backend/app/alembic/versions/e5f6a7b8c9d0_add_oauth_credential.py`, `backend/tests/api/routes/test_contact_imports.py`.
  - Files modified: `backend/app/core/config.py` (3 settings + `google_import_enabled`), `backend/app/models.py` (`OAuthProvider` enum, `OAuthCredential` table, `OAuthCredentialPublic`), `backend/app/api/main.py` (mount router).
  - Worktree branch `worktree-google-icloud-oauth-import` holds 4 modified + 5 new files, all uncommitted. Ephemeral test container/network/image cleaned up.

### 2026-04-28
- **State sync:** No code work since 2026-04-23. Status corrected from `active` to `paused`; `progress: 0/10` added; all task checkboxes still unchecked.
- **Discrepancies:** None — README claims (no schema, no endpoints, no UI) all match the live codebase. The 25 commits in personal-crm since 2026-04-23 belong to other projects (audit-log, soft-delete, reminders bell, e2e tests, automated-release-notes, worktree-dev-stack).
- **Verified clean:** Contact model still at backend/app/models.py:465-528 with `vcard_raw` already present but no `source_provider` / `source_external_id`; ContactField near 575-595 confirmed; only existing import path is `/import-export/import/vcard` (generic vCard, not Google/iCloud).
- **Provenance schema landed (task 1/10):**
  - `ContactSource` enum (`MANUAL` / `GOOGLE` / `ICLOUD`) added to [backend/app/models.py](../../../backend/app/models.py).
  - Contact gained `source_provider ContactSource NOT NULL DEFAULT MANUAL` and `source_external_id VARCHAR(255) NULL`, both indexed.
  - Migration [d4e5f6a7b8c9_contact_provenance.py](../../../backend/app/alembic/versions/d4e5f6a7b8c9_contact_provenance.py) chains off `c3d4e5f6a7b8` (contact_soft_delete head). Verified end-to-end on an ephemeral postgres: full chain `e2412...` → `d4e5f6a7b8c9` applied clean, downgrade then re-upgrade roundtrip clean.
  - Partial unique index `ux_contact_owner_provider_external` on `(owner_id, source_provider, source_external_id) WHERE source_external_id IS NOT NULL`. Verified: two MANUAL contacts with NULL external_id coexist; (owner, GOOGLE, `people/c123`) duplicate is rejected; (owner, ICLOUD, `people/c123`) coexists with (owner, GOOGLE, `people/c123`) — provider participates in the key.
  - `ContactPublic` extended to expose both fields (defaults preserve API compat).
- **Worktree note:** worktree-dev-stack work (`compose.worktree.yml`, modified `justfile`) is uncommitted in main, so this fresh worktree falls back to manual stack management. Migration applied via one-shot ephemeral postgres (`oauth-import-test-*`), torn down after verification. Once worktree-dev-stack lands on main, `just up` from this worktree will auto-apply via prestart.sh.

- **Contact provenance hard dependency:** Requires Contact.source_provider (enum) and Contact.source_external_id (string, unique per provider per user) columns. See [models.py Contact definition](../../../backend/app/models.py) lines 465-520. Without this, re-run deduping is manual and error-prone.
- **iCloud requires app-specific password:** iCloud.com does not support standard OAuth for CardDAV. User must generate an app-specific password in iCloud account settings. Store securely; rotate periodically. No long-lived refresh token like Google.
- **Google People API syncToken:** Each sync response includes a syncToken. Store it per user (e.g., in a sync_metadata table or encrypted in User). Next sync request passes syncToken to get only deltas since last run. Full sync (no token) on first import takes longer but ensures completeness.
- **Conflict resolution:** Merge strategy on re-run: (1) if source_external_id matches, merge fields (update timestamps, keep manual edits, overwrite provider-sourced fields). (2) If name + primary email match existing contact but source_external_id absent, warn user (possible duplicate from other import or manual entry). (3) Offer create-or-skip for unmatched.
- **Token storage security:** Use database encryption (or external secret store) for refresh tokens. Never log or expose in API responses. Implement token rotation: refresh before expiry, handle 401 gracefully (re-authorize), catch revocation and alert user.
- **Field mapping:** Google People API: givenName -> first_name, familyName -> last_name, middleName -> middle_name, phoneticGivenName/phoneticFamilyName -> ignored (no storage). Email/phone -> ContactField records. iCloud vCard N field: n-part -> name components; EMAIL and TEL -> ContactField records. Both providers may include notes (BDAY, ORG, TITLE) -> map to Contact columns if present.
- **Frontend preview:** Import flow: (1) authorize/connect. (2) Fetch and display batch (e.g., first 50). (3) Show side-by-side: incoming contact name/email/phone vs. matched existing contact. (4) User checkboxes: [Merge] [Skip] [Create new]. (5) Confirm and execute. (6) Show results: N created, M merged, K skipped.
- **CardDAV vCard preservation:** iCloud vCards may contain X-extensions (custom fields, special formatting). Store vcard_raw in Contact for round-trip fidelity. On export/sync-back to iCloud, reconstruct from vcard_raw if available, else build from Contact fields.
- **References:** [Contact model](../../../backend/app/models.py) lines 465-520, [ContactField model](../../../backend/app/models.py) lines 575-595, [Google People API docs](https://developers.google.com/people), [CardDAV RFC 6352](https://tools.ietf.org/html/rfc6352), [iCloud app-specific passwords](https://support.apple.com/en-us/102654).
