# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.89] - 2026-06-06

### Documentation
- Docs: quote frontmatter scalars for docket sync (db619e0)

### Fixed
- Fix(contacts): stop shared saved-filters cache from crashing the page (c9135db)

### Other
- Projects: housekeeping — bulk-save all 58 active projects post-v0.2.88 (f1272a6)
- Projects: create frontend-pnpm-migration (74e93cc)

## [0.2.88] - 2026-06-05

### Added
- Feat(contacts): Log Interaction button becomes an add dropdown (item21) (ed12dad)
- Feat(contacts): surface contact info + addresses in the header (item23) (f7e3e84)
- Feat(contacts): redesign Add Contact modal with sections + tags (item14) (a11d171)

### Other
- Build: release recipe builds kindred-whisper too (00ccdab)
- Build: migrate frontend toolchain from bun to pnpm 11 (0764b80)

## [0.2.87] - 2026-06-05

### Added
- Feat(activity): add Activity Logs view + nav (item19) (a204dba)
- Feat(timezone): broad city search (e.g. New Orleans -> America/Chicago) (51a36f1)

### Documentation
- Docs: handoff report + marker for tofix-remaining run (923c2cf)

### Fixed
- Fix(client): restore src/client/custom.ts dropped by SDK regen (643e722)
- Fix(crm): finish journal+mood removal, fix contacts crash deps, geocoding, DNC (f6f1832)
- Fix(whisper): add python-multipart (FastAPI UploadFile dep) (ee31380)

## [0.2.86] - 2026-06-01

### Added
- Feat: fold media recommendations into interactions (4fd8f3e)
- Feat(ui): unify date displays as YYYY-MM-DD with relative estimate (5665b2c)
- Feat(dashboard): add Upcoming Birthdays + Due Reminders cards (8bc3f78)
- Feat(interactions): remove Drafts feature (UI) (95b383c)

### Changed
- Refactor(transcribe): make WHISPER_URL configurable (2227e11)
- Refactor(contacts): merge Household + Relationships into one People card (afa4f95)

### Fixed
- Fix(whisper): add requests dep + bake base.en model into image (96edf07)
- Fix(sidebar): remove vestigial Groups nav link (238346a)

### Other
- Build: add root .dockerignore (exclude node_modules/.venv/etc.) (943273d)

## [0.2.85] - 2026-06-01

### Documentation
- Docs: add README files for Contacts List Render Crash, Dashboard Metadata Widgets, and Interaction Drafts; update Map View of Contacts README (d7a3504)
- Docs: add 0.2.x feature verification report (5603022)

### Fixed
- Fix(webhooks): use settings.REDIS_URL instead of hardcoded redis host (38b71de)
- Fix: align SQLModel json columns with applied jsonb migrations (cd73770)
- Fix: correct CSV import date parsing that dropped every row with a birthday (d9f262d)

### Other
- Test+fix: green the full frontend vitest suite (1941 passing) (d9e6401)
- Ci: point .env service hosts at localhost for Test Backend (ab46dff)
- Ci: add redis + meilisearch service containers to Test Backend (a904c07)
- Test: resolve alembic paths relative to conftest, not hard-coded /app/backend (507537c)
- Test+ci: make frontend typecheck green and fix Test Backend CI env (e4372cb)
- Test: resolve FIRST_SUPERUSER by email in bulk-contacts tests (e68cecf)
- ⬆ bump typescript from 5.9.3 to 6.0.3 (4958fff)
- ⬆ bump tinykeys from 3.1.0 to 4.0.0 (553c413)
- ⬆ bump @tanstack/router-plugin from 1.168.11 to 1.168.13 (3f9e764)
- ⬆ bump @tanstack/react-router from 1.170.8 to 1.170.10 (e335031)
- ⬆ bump @biomejs/biome from 2.4.15 to 2.4.16 (63bba7c)
- ⬆ bump getmeili/meilisearch from v1.44.0 to v1.45.1 (f9e4ed3)
- ⬆ bump pytest from 7.4.4 to 9.0.3 (08f4913)
- ⬆ update fastapi[standard] requirement (a69787a)
- ⬆ update sentry-sdk[fastapi] requirement (9b8cea2)
- ⬆ update psycopg[binary] requirement (eba9658)
- ⬆ bump ruff from 0.15.14 to 0.15.15 (ddb6999)
- Chore: migrate to project-kit (ae928ce)
- Projects: flag 8 LLM-completed projects as to_review (d0ec205)
- Build: upgrade base images to python 3.14-slim and skip Playwright browser download (89806de)
- Style: apply biome formatting to calendar and interaction dialog (fea8977)
- Test: stabilize frontend component tests (zod/indexedDB shims, longer timeouts) and supporting UI tweaks (f56af91)

## [0.2.84] - 2026-05-29

### Fixed
- Fix: repair global search and remove duplicate contact header buttons (7847a54)

## [0.2.83] - 2026-05-29

### Fixed
- Fix: contact detail page crash from heatmap TooltipTrigger asChild (a5df6d4)

### Other
- Ci: remove release.yml — it auto-incremented a phantom tag on every tag push (72ebdb3)

## [0.2.82] - 2026-05-29

### Fixed
- Fix: stack QuickLog FAB above the voice-record FAB (cb390db)

## [0.2.80] - 2026-05-29

### Fixed
- Fix: show release version in footer instead of v0.0.0 (ad0e6b8)

## [0.2.78] - 2026-05-29

### Fixed
- Fix: mount ShortcutRegistryProvider and stop shortcut registration loop (d329369)

## [0.2.72] - 2026-05-27

### Fixed
- Fix: correct d3-drag/d3-zoom imports and add missing packages for production build (f9b308e)
- Fix: add @radix-ui/react-alert-dialog as direct dep for Docker build (2360cc5)
- Fix: exclude vitest.config.ts and test types from production tsconfig.build.json (b6581c4)
- Fix: remove vitest/globals from tsconfig.build.json to fix Docker production build (1d5c911)
- Fix: resolve TypeScript typecheck errors and update DB docs (8308f71)
- Fix: resolve all 347 test failures and regenerate client SDK (b834062)

## [0.2.71] - 2026-05-25

### Added
- Feat: add timezone picker component for contact forms (6c62b39)

### Documentation
- Docs: regenerate db schema docs for merge-train features (86bdf64)

### Fixed
- Fix: search all contacts in command palette when query is active; add extensions doc (88499ba)
- Fix: resolve biome a11y violations and format frontend for prek 0.4.1 (9f76808)
- Fix: repair pre-existing JSX parse errors in ContactsList and vite.config (c43b545)

### Other
- Chore: remove kanban route from generated routeTree (7d0577e)
- Chore: update uv.lock from prek and dependency updates (096472c)
- Chore: merge dependabot/docker_compose/getmeili/meilisearch-v1.44 (11618ec)
- ⬆ Bump getmeili/meilisearch from v1.42.1 to v1.44.0 (79932ae)
- Chore: merge dependabot/bun/vite-8.0.14 (c40b789)
- ⬆ Bump vite from 8.0.7 to 8.0.14 (39c2771)
- Chore: merge dependabot/bun/tanstack/react-query-devtools-5.100.14 (f8b8a4c)
- ⬆ Bump @tanstack/react-query-devtools from 5.95.2 to 5.100.14 (1608d62)
- Chore: merge dependabot/bun/react-hook-form-7.76.0 (c6b36bd)
- ⬆ Bump react-hook-form from 7.72.0 to 7.76.0 (7d815d8)
- Chore: regenerate bun.lock with correct axios 1.16.1 resolution (b9510d2)
- Projects: mark 26 merged-feature projects as to_review (f97dc7c)
- Projects: mark 6 completed projects as to_review (de9410b)
- Chore: merge dependabot/bun/axios-1.16.1 (3dc8bb2)
- ⬆ Bump axios from 1.13.5 to 1.16.1 (1cf51c8)
- Projects: create merge-train-v0270-qa QA checklist; mark feature-backlog-merge-train completed (b5d5533)
- Chore: merge dependabot/bun/date-fns-4.3.0 (767434d)
- ⬆ Bump date-fns from 4.1.0 to 4.3.0 (edea214)
- Chore: merge dependabot/uv/prek-0.4.1 (3e7d558)
- ⬆ Bump prek from 0.2.30 to 0.4.1 (d8c95fe)
- Chore: merge dependabot/uv/pytest-9.0.3 (db0e226)
- ⬆ Bump pytest from 7.4.4 to 9.0.3 (f295081)
- Chore: merge dependabot/uv/weasyprint-68.0 (44390a2)
- ⬆ Bump weasyprint from 61.2 to 68.0 (b75416d)
- Chore: merge dependabot/uv/pyjwt-2.13.0 (0c56973)
- ⬆ Bump pyjwt from 2.12.1 to 2.13.0 (e3cde31)
- Chore: merge dependabot/uv/idna-3.15 (7dfa69c)
- ⬆ Bump idna from 3.11 to 3.15 (a66f1f6)

## [0.2.70] - 2026-05-25

### Added
- Feat: undo toast for destructive actions (9d29c6d)

## [0.2.69] - 2026-05-25

### Added
- Feat: iMessage sync integration (06ece7c)

## [0.2.68] - 2026-05-25

### Added
- Feat: voice to text interaction logging (d2bad2a)

## [0.2.67] - 2026-05-25

### Added
- Feat: vCard round-trip hash verification (318edf2)

## [0.2.66] - 2026-05-25

### Added
- Feat: Twilio SMS and call webhook ingestion (99b1db2)

## [0.2.65] - 2026-05-25

### Added
- Feat: stay-in-touch dashboard widget (797f49a)

## [0.2.64] - 2026-05-25

### Added
- Feat: soft delete for contacts and related entities (8e6786b)

## [0.2.63] - 2026-05-25

### Added
- Feat: saved filters and smart lists (9cf66a5)

## [0.2.62] - 2026-05-25

### Added
- Feat: reminder snooze history (a71ef93)

## [0.2.61] - 2026-05-25

### Added
- Feat: reminder bell badge with unread count (fdc247e)

## [0.2.60] - 2026-05-25

### Added
- Feat: automatic inverse relationship mapping (69c8d61)

## [0.2.59] - 2026-05-25

### Added
- Feat: contact relationship graph visualization (e26e01a)

## [0.2.58] - 2026-05-25

### Added
- Feat: PWA offline note drafting (fd13cf2)

## [0.2.57] - 2026-05-25

### Added
- Feat: printable contact one-pager PDF (9167057)

## [0.2.56] - 2026-05-25

### Added
- Feat: organizations as first-class entities (a31ac54)

## [0.2.55] - 2026-05-25

### Added
- Feat: map view for contacts (ea4d761)

## [0.2.54] - 2026-05-25

### Added
- Feat: journal entries linked to multiple contacts (2aa7390)

## [0.2.53] - 2026-05-25

### Added
- Feat: interaction location tracking with map visualization (b1fa66e)

## [0.2.52] - 2026-05-25

### Added
- Feat: interaction frequency heatmap (2c32861)

## [0.2.51] - 2026-05-25

### Added
- Feat: interaction draft saving (220618b)

## [0.2.50] - 2026-05-25

### Added
- Feat: ICS calendar export (85e3e95)

## [0.2.49] - 2026-05-25

### Added
- Feat: iCal importer backfill for calendar events (dacf264)

## [0.2.48] - 2026-05-25

### Added
- Feat: household aggregate view (863be47)

## [0.2.47] - 2026-05-25

### Added
- Feat: face-aware avatar crop with MediaPipe detection (b6d4f91)

## [0.2.46] - 2026-05-25

### Added
- Feat: empty state illustrations (9d1e24f)

## [0.2.45] - 2026-05-25

### Added
- Feat: email log ingestion for contacts (8ed6ace)

## [0.2.44] - 2026-05-25

### Added
- Feat: debt partial payment tracking (f2720c9)

## [0.2.43] - 2026-05-25

### Added
- Feat: CSV import and export for contacts (4d7dff7)

## [0.2.42] - 2026-05-25

### Added
- Feat: contact timezone and pronouns fields (9f996ae)

## [0.2.41] - 2026-05-25

### Added
- Feat: contacts kanban board (0a54a17)

## [0.2.40] - 2026-05-25

### Added
- Feat: contact provenance tracking (979abb5)

## [0.2.39] - 2026-05-25

### Added
- Feat: contact merge history tracking (7714fbb)

## [0.2.38] - 2026-05-25

### Added
- Feat: CardDAV server integration (a54815c)
- Feat: bulk contact operations (ddbda75)

## [0.2.37] - 2026-05-25

### Added
- Feat: communication preferences per contact (49166c7)

## [0.2.36] - 2026-05-25

### Added
- Feat: tag share scope warning (f851957)

## [0.2.35] - 2026-05-25

### Added
- Feat: quick-log floating action button (f06c641)

## [0.2.34] - 2026-05-25

### Added
- Feat: kindred Python SDK (0113d8a)

## [0.2.33] - 2026-05-25

### Added
- Feat: keyboard shortcut overlay (452a2c6)

## [0.2.32] - 2026-05-25

### Added
- Feat: gift kanban board view (2256155)
- Feat: e2e contact CRUD tests (Playwright) (c5325f9)

## [0.2.31] - 2026-05-25

### Added
- Feat: automated release notes generation script (ce99996)

### Fixed
- Fix(frontend): prod-build TS errors; restore Cmd-K fix via useMemo at call sites (3a8ef76)

## [0.2.30] - 2026-05-25

### Added
- Feat(pr-sweep): add sweep-overnight.sh + just sweep-overnight recipe (492b1b2)
- Feat: gifts kanban route + Playwright e2e migration (9e32370)

### Documentation
- Docs: regenerate db schema docs — add vcard_conflict table (165878a)
- Docs: regenerate db schema docs (tbls) — sync with live schema (cd0ee1e)

### Fixed
- Fix(release-kit): correct LiteLLM URL (no .lab. subdomain) (3c082fc)
- Fix(release-kit): use correct 'model' and 'base_url' keys (7e524cc)
- Fix: route shadowing, render loop, sidebar text, ? shortcut, vcard_conflict table; e2e 14->176 (fc8a8c0)
- Fix(sweep): skip directories when reading review file blocks (fe6d079)
- Fix(sweep-overnight): remove double-tee logging; count all non-ready PRs for STUCK detection (9659006)

### Other
- Chore: gitignore container-owned backend/uv.lock (7de9b30)

## [0.2.29] - 2026-05-24

### Fixed
- Fix: pass VITE_API_URL (empty=relative) to production docker build (d53f427)

## [0.2.28] - 2026-05-24

### Fixed
- Fix: handle auth errors at layout route boundary, redirect expired tokens to login (672555a)

## [0.2.27] - 2026-05-24

### Documentation
- Docs: regenerate db schema docs (tbls) — sync with live schema (ba510fa)
- Docs: add debug-login screenshot (4583064)

### Fixed
- Fix: redirect to login on 403 auth errors from expired JWT tokens (3c21a90)
- Fix: resolve all TypeScript build errors for v0.2.26 (06ce692)
- Fix: missing closing brace in IcalImport _formatDate function (b73b475)
- Fix: missing closing braces in IcalImport.tsx JSX props (a8ec9b7)
- Fix: regenerate bun.lock after removing duplicate typecheck key (d61c939)
- Fix: remove duplicate typecheck key in frontend/package.json (ef22dd0)

### Other
- Website: inject version+hash into static site at build/deploy time (2fe920b)
- Uv: add .python-version 3.14, add uv lock --check CI gate (baefa25)
- Just: standardize header to canonical Tier 1 block; move compose/_dc vars below (c215e11)
- Docs+scripts: 'just up' -> 'just dev'; wire prod resolver (b6bd69e)
- Uv: add .python-version 3.14, add --frozen to sdk-test justfile recipe (ab06c76)
- Website: update license to Elastic License 2.0, add GitHub star/fork buttons (997ced0)
- Website: extract website/justfile with dev, render, lint, deploy recipes (0f1ba53)
- Projects: save feature-backlog-merge-train (Wave 3 complete: v0.2.0–v0.2.26, 339 tests) (556da8a)

## [0.2.26] - 2026-05-24

### Added
- Feat: email log ingestion with OAuth token storage (v0.2.26) (96b6ca0)

## [0.2.25] - 2026-05-24

### Added
- Feat: e2e contact CRUD tests with Playwright (v0.2.25) (d0f9d01)

## [0.2.24] - 2026-05-24

### Added
- Feat: bulk contact operations (v0.2.24) (31135f6)

## [0.2.23] - 2026-05-24

### Added
- Feat: map view for contacts with geocoding support (v0.2.23) (5b15810)

## [0.2.22] - 2026-05-24

### Added
- Feat: contacts kanban board with stage grouping (v0.2.22) (7bd3e30)

## [0.2.21] - 2026-05-24

### Added
- Feat: PWA offline notes with client_id deduplication (v0.2.21) (3818d8c)

## [0.2.20] - 2026-05-24

### Added
- Feat: contact timezone, pronouns, and message templates (v0.2.20) (bd9250e)

## [0.2.19] - 2026-05-24

### Added
- Feat: voice-to-text interaction logging (Whisper service, transcribe route, VoiceRecorder UI) (1c41d56)

## [0.2.18] - 2026-05-24

### Added
- Feat: iCal importer with deduplication (IcalImportLog table, /ical routes, IcalImport UI) (ccf75b2)

## [0.2.17] - 2026-05-24

### Added
- Feat: vCard hash verification (vcard_sha256 column, VCardConflict model, conflict UI) (e28fed8)

## [0.2.16] - 2026-05-24

### Added
- Feat: saved filters / smart lists (SavedFilter model, filter_compiler, SmartLists UI) (d0687ee)

## [0.2.15] - 2026-05-24

### Added
- Feat: carddav server - enhanced vCard storage with address/field support (d8cedcc)

## [0.2.14] - 2026-05-24

### Added
- Feat: debt partial payments (DebtPayment table, payment endpoints, backfill migration) (63e111e)

## [0.2.13] - 2026-05-24

### Added
- Feat: contact-provenance -- source/source_external_id upsert, ContactSource enum, provenance badge (eb63a55)

## [0.2.12] - 2026-05-24

### Added
- Feat: empty-state-illustrations -- EmptyState components with seed demo buttons, /private/seed endpoint (aa524c3)

## [0.2.11] - 2026-05-24

### Added
- Feat: soft-delete for interactions, notes, gifts, debts, reminders, life events (ef2ad56)

## [0.2.10] - 2026-05-24

### Added
- Feat: face-aware-avatar-crop -- avatar upload/delete endpoint, AvatarUploadDialog with MediaPipe face detection (981d61f)

## [0.2.9] - 2026-05-24

### Added
- Feat: organizations-first-class -- Organization model, routes, organization_id on Contact (03facdb)

## [0.2.8] - 2026-05-24

### Added
- Feat: interaction-location -- location_label/lat/lng fields, InteractionMap component (8f87388)

## [0.2.7] - 2026-05-24

### Added
- Feat: interaction-drafts -- is_draft/draft_source fields, confirm endpoint, draft filtering (b4edc8b)

## [0.2.6] - 2026-05-24

### Added
- Feat: relationship-inverse-mapping -- db-backed inverse relationship map with automatic bidirectional linking (1d526c6)

## [0.2.5] - 2026-05-24

### Added
- Feat: contact-merge-history -- contact merge/unmerge with audit log and restore capability (c41bf6d)

## [0.2.4] - 2026-05-24

### Added
- Feat: full-text-search -- Meilisearch full-text search across contacts, interactions, and journal (8053e63)

## [0.2.3] - 2026-05-24

### Added
- Feat: contact-stage-history -- contact stage event tracking with full history audit trail (7cbab06)

## [0.2.2] - 2026-05-24

### Added
- Feat: gift-kanban -- kanban board view for tracking gifts by status (33d2bbc)

## [0.2.1] - 2026-05-24

### Added
- Feat: keyboard-shortcut-overlay -- global keyboard shortcut system with overlay help panel (49a5893)

## [0.2.0] - 2026-05-24

### Added
- Feat: tagshare-scope-warning -- scope warning when sharing tag-filtered views (235a6c3)
- Feat: add withkindred.app Cloudflare Pages deploy (7ff0cd3)
- Feat: birthday-anniversary-calendar -- refactored month calendar with birthday/anniversary event display (b497e17)
- Feat: relationship-graph -- interactive contact relationship graph with BFS traversal (a4e07d9)
- Feat: ics-calendar-export -- per-user subscribable calendar feed (e37bee7)
- Feat: kindred-web-presence marketing landing page (0bfb57a)
- Feat: interaction-heatmap -- 52-week GitHub-style interaction heatmap (58f7a61)
- Feat: journal-contact-join -- journal_entry_contact junction table and reflections endpoint (3985e65)
- Feat: type response models across all routes, add snooze/household/webhook endpoints (e216866)

### Fixed
- Fix: use pikenet-private network in compose.dev.yml so Traefik can route (2eb5a2a)
- Fix: contact-detail page bugs + retina screenshots (4d97433)
- Fix: /contacts/{id}/reflections 500 on contact_ids assignment (5f0cd45)

### Other
- Projects: save feature-backlog-merge-train (Wave 2 complete: +4 branches merged) (fb155f6)
- Projects: save feature-backlog-merge-train (Wave 2 complete: +4 branches merged) (ec484a1)
- Website: add screenshot lightbox; license: drop upstream attribution section (b9d9269)
- Chore(frontend): regen client + routeTree after relationship-graph + ics-calendar-export (1f2422c)
- License: switch from MIT to Elastic License 2.0 (ELv2) (1421ea1)
- Projects: save kindred-web-presence (865ac68)
- Projects: create kindred-web-presence (7671fc5)
- Chore: add .codegraph/ to .gitignore (5fd56ee)
- Projects: handoff marker + report for feature-backlog-merge-train (dbe6aca)
- Chore: merge-train progress (journal-contact-join); remove orphaned fix-alembic-heads.py (5ab6a3e)
- Sdk: regen _generated/ from updated spec; add snooze, delete, webhook CLI commands (76b01a6)

## [0.1.9] - 2026-05-17

### Added
- Feat(frontend): show app version + commit hash in footer (7875d7c)

### Changed
- Refactor: remove hardcoded compose config, fully delegate to preview-kit (504c164)

### Documentation
- Docs: refresh UI-completeness gaps; ignore frontend/coverage/ (0340627)

### Fixed
- Fix: use absolute symlink for release.just to work in worktrees (8b71323)

### Other
- Build: deref annotated tag to commit SHA in build recipe (81aebaa)
- Build: pass APP_VERSION + GIT_HASH through Dockerfile.prod into Vite (acc154d)
- Chore(frontend): pin react-day-picker back to ^9.14.0 (0adaff9)
- Chore(frontend): regenerate bun.lock to drop stale resolutions (ee302c1)
- Sdk: fix CLI param names for losing-touch and overdue (e058e29)
- Just: standardize header to canonical Tier 1 block (a02001a)
- Docs+scripts: 'just up' -> 'just dev'; wire prod resolver (574eadf)
- Claude: drop project settings — 100% redundant with global (d6882fe)
- Justfile: add frontend-test, frontend-coverage, test-all recipes (0a20d1f)
- Sdk: regenerate from OpenAPI; add CLI, regen script, justfile recipes (6bfce37)
- Test(frontend): hit 90% branch coverage with non-Error rejection tests (4cfd680)
- Projects: save frontend-test-coverage (97b5d80)
- Projects: save frontend-test-coverage (81207d6)
- Chore(deps): consolidate 11 Dependabot updates (6425ce6)
- Test(frontend): Wave 2+3 coverage tests — branches 81.58%, functions 87.61% (1bcf337)
- Projects: create frontend-test-coverage (7e7df12)
- Test(frontend): fix failing AddUser and useAuth tests (9e37082)
- Test(frontend): fix 8 failing test suites (5b5c393)
- Projects: save merge-train progress (v0.1.5-v0.1.8) and scaffold umbrella (02d14fa)

## [0.1.8] - 2026-05-16

### Added
- Feat: household-aggregate-view -- BFS household member aggregation endpoint and HouseholdCard component (6b8b1b0)

## [0.1.7] - 2026-05-16

### Added
- Feat: automated-release-notes -- release notes generation script with LLM summarization (5cd6273)

## [0.1.6] - 2026-05-16

### Added
- Feat: reminders-bell-badge -- bell badge with due reminders popover, dismiss sentinel, ReminderWithContactPublic model (6fe926b)

## [0.1.5] - 2026-05-16

### Added
- Feat: reminder-snooze-history -- append-only snooze log, snooze-history and stats endpoints, dismiss endpoint (7cea062)

### Other
- Chore: re-point preview.just symlink to preview-kit repo (5de82f1)
- Test(sdk): add tests for display_name, search/stage params, losing_touch, retry, event hooks (bd37c80)

## [0.1.4] - 2026-05-16

### Added
- Feat: csv-import-export -- CSV import/export with auto-column detection, preview step, tag support; SDK retry/pagination improvements and CLI entry point (ad02c89)

### Other
- Chore: migrate worktree recipes to shared preview.just (cf8677a)

## [0.1.3] - 2026-05-16

### Added
- Feat: twilio-sms-call-webhook -- Twilio SMS/call inbound webhook with E.164 normalization, rate limiting, and interaction logging (502bd48)

## [0.1.2] - 2026-05-16

### Added
- Feat: quick-log-fab -- add floating QuickLog FAB to layout with pet/life-event tests (3fbffa4)

### Other
- Chore(frontend): biome-format ImportExport test (fe85cd2)

## [0.1.1] - 2026-05-16

### Added
- Feat: imessage-sync -- add iMessage contact fields (imessage_id, synced_at, profile_hash, profile) (ff704a9)

### Other
- Chore(frontend): biome-format remaining test + tsconfig.build array format (cc71105)
- Chore(frontend): exclude tests from biome/tsc; format+add vitest unit tests (cd8f429)

## [0.1.0] - 2026-05-16

### Added
- Feat: undo-toast-destructive -- add deleted_at soft-delete to Interaction/Reminder/Gift/Debt/LifeEvent/Note (3ad5eb6)
- Feat(sdk): add Python client SDK (4704795)
- Feat(pr-sweep): add review pass — deepseek-v4-pro-cloud review + kimi-k2.6-cloud fixes (59e5c4e)
- Feat(pr-sweep): auto-resolve generated file conflicts before LLM repair (9eb7a6e)
- Feat(pr-sweep): fix precommit auto-fix loop + typecheck env vars (fec4e71)
- Feat(pr-sweep): disposition + top-level driver (Tasks 8-9) (cea16a7)
- Feat(pr-sweep): repair loop with bounded iterations and audit trail (5c88de2)
- Feat(pr-sweep): LiteLLM client + repair prompt + patch-apply helpers (1c8b949)
- Feat(pr-sweep): sanity gauntlet runner (precommit/typecheck/pytest/e2e) (7fa3f93)
- Feat(pr-sweep): rebase handler with stub for LLM conflict repair (7be0fb8)
- Feat(pr-sweep): worktree checkout + stack up/down helpers (6657746)
- Feat(pr-sweep): scaffold script + PR discovery (f749525)
- Feat(pr-sweep): scaffold orchestrator project + LiteLLM auth (575f142)

### Changed
- Refactor(justfile): rename publish→build, bump→deploy, release-and-ship→ship (83901f2)

### Documentation
- Docs: release/deploy section + Gitea Actions test workflow (bb5ffbd)
- Docs: document three-tier deployment model (prod/dev/PR previews) (4dd6655)
- Docs: add extension ideas and feature roadmap for personal-crm (fc4e336)
- Docs(pr-sweep): session log entries for tasks 1-2 + UNKNOWN-mergeable gotcha (f3eb8b5)
- Docs(projects): add pr-sweep-orchestrator implementation plan (a8f2ce0)
- Docs(projects): scaffold pr-sweep-orchestrator project README (e945650)
- Docs(readme): add Screenshots section with seeded fixture captures (32a8977)
- Docs(reminders-bell-badge): tick 6/7 tasks, log 2026-05-06 session (3ebb147)
- Docs(db): regenerate after Groups removal; drop stale table comments (a31dcdc)
- Docs: add project CLAUDE.md with terraform and stack context (d01b40d)

### Fixed
- Fix(pr-sweep): syntax-fix writes corrected file directly instead of applying a second diff (c4c7313)
- Fix(pr-sweep): prek PATH + LLM syntax-error repair pass after conflict resolution (804cc95)
- Fix(pr-sweep): skip pre-push hooks in push_branch (sweep already ran gauntlet) (be1b817)
- Fix(pre-push): extend e2e timeout to 5min + regenerate db docs (4872da8)
- Fix(pr-sweep): switch to merge + refresh stale local branches from origin (c4c4b5a)

### Other
- Chore(frontend): add vitest unit tests for components, hooks, and lib utilities (fc32385)
- Chore(frontend): add vitest + testing-library infrastructure (7b1dd6e)
- Test(login): patch EMAILS_FROM_EMAIL in test_recovery_password so emails_enabled is true locally (f13637c)
- ⬆ Bump emails from 0.6 to 1.1.1 (#77) (a10c26a)
- ⬆ Bump @tailwindcss/vite from 4.2.2 to 4.3.0 (#78) (fcbb86b)
- ⬆ Bump pydantic-settings from 2.12.0 to 2.14.1 (#79) (eed52c6)
- ⬆ Bump alembic from 1.18.1 to 1.18.4 (#80) (69a1f2b)
- ⬆ Bump react-dom from 19.2.4 to 19.2.6 (#81) (e814873)
- ⬆ Bump lucide-react from 0.563.0 to 1.14.0 (#82) (e7c089c)
- ⬆ Bump typescript from 5.9.3 to 6.0.3 (#84) (987097a)
- ⬆ Bump meilisearch from 0.40.0 to 0.41.0 (#85) (35211c9)
- ⬆ Bump @types/node from 25.5.0 to 25.6.2 (#86) (23578f2)
- ⬆ Bump urllib3 from 2.6.3 to 2.7.0 (#87) (50fd1da)
- ⬆ Bump getmeili/meilisearch from v1.12 to v1.43 (#76) (f6b41dc)
- ⬆ Bump coverage from 7.13.1 to 7.13.5 (#83) (311f574)
- Chore: update deploy section comment (publish/bump → build/deploy) (0f3f208)
- Release-kit: add release-kit.toml + symlink cliff/release.just to shared template (de76096)
- Release: adopt git-cliff CHANGELOG + shared release.just; drop GHA (80cd290)
- Claude.md: rewrite around worktree-first dev, deploy tiers, pre-push gates (67d7121)
- E2e: refresh contact-edit dialog screenshots (47111e3)
- Deploy: add just release/publish/bump recipes and expand release docs (910a53b)
- Projects: housekeeping pr-sweep-orchestrator (bump last_updated; note 3 post-save commits) (5e0758c)
- Projects: save pr-sweep-orchestrator (PR #37 manually fixed; 7 PRs ready; batch 5 results) (e2cb259)
- Pr-sweep: include actual file content in repair prompt to fix context mismatch (f9cb145)
- Pr-sweep: fix corrupt LLM patches by recounting hunk line counts (f7ca04e)
- Projects: save pr-sweep-orchestrator (Task 10 complete; PR #36 smoke-test passed) (c29619c)
- Frontend: add typecheck script (tsc --noEmit) for pr-sweep gauntlet (d39e583)
- Projects: save pr-sweep-orchestrator (DNS fix; stack operational for Task 10) (06c9977)
- Compose.dev: fix DNS for dev stack containers (172.20.2.253 → 1.1.1.1) (f1cc775)
- Projects: save pr-sweep-orchestrator (9/12 tasks; Tasks 8-9 complete) (8511901)
- Projects: save pr-sweep-orchestrator (7/12 tasks landed; paused at Task 8) (f93638a)
- E2e: refresh screenshot baselines after seed-fixed data (c1b4e01)
- Backend(seed): seed journal entries alongside contacts (754ca1d)
- Frontend(client): regen SDK to drop stale PrivateUserCreate (3753d6a)
- Dev: make loopback stack self-sufficient for e2e/screenshots (9a940ca)
- Chore: prep for public release — license, security contact, drop personal email (a437596)
- Dev: add 'just regen-client' recipe and document Vite SDK cache gotcha (a6fd8ea)
- Frontend(reminders): poll /reminders/due, add snooze menu and dismiss (ed5c12e)
- Backend+frontend: add /reminders/due, /reminders/{id}/dismiss, snooze body (7c3a09d)
- Backend: add SKIP to interactionchannel enum to match models.py (27d3118)
- Frontend: move EnvironmentChip from fixed overlay into Footer (9700950)
- E2e: harden suite against Radix dialogs and refresh screenshot baseline (654c0fd)
- Backend+frontend: surface non-prod ENVIRONMENT as a screen-bottom chip (a778a7a)
- Backend: serve real static files before SPA index fallback (f6e634e)
- Backend+frontend: drop Groups, merge into Tags (43e8c28)
- Dev: e2e pre-push gate + dev-stack loopback ports (055c313)
- Dev: route compose.dev.yml at kindred.dev.example.com (7797b2b)

## [0.0.1-rc.7] - 2026-05-06

### Other
- Frontend: update root bun.lock with leaflet + react-leaflet; remove spurious frontend/bun.lock (4d56f2d)

## [0.0.1-rc.6] - 2026-05-06

### Other
- Ci: write GHCR auth directly to config.json, skip docker login (03b898b)

## [0.0.1-rc.5] - 2026-05-06

### Other
- Ci: isolate Docker config in RUNNER_TEMP to avoid D-Bus/keyring (cb1ea18)

## [0.0.1-rc.4] - 2026-05-06

### Other
- Ci: clear Docker credential store before login on self-hosted runner (68246fd)

## [0.0.1-rc.3] - 2026-05-06

### Other
- Ci: switch to self-hosted runner on host, local buildx cache (df782a7)
- Frontend: add leaflet + react-leaflet for map view (fd3365e)

## [0.0.1-rc.2] - 2026-05-06

### Other
- Ci: drop auto-deploy job from release.yml — bump is manual (680d5e8)

## [0.0.1-rc.1] - 2026-05-03

### Added
- Feat: prod Dockerfile + SPA fallback for canonical kindred deploy (e5641cc)
- Feat: token-gated first-boot admin onboarding (deda354)
- Feat: add CardDAV auth and rights modules for Radicale integration (e036324)
- Feat: add PURCHASED/WRAPPED gift status and merge migration (809f6c6)
- Feat: add reminder_snooze table and merge migration (7c1c371)
- Feat: add API key M2M authentication with impersonation (01cbed9)
- Feat: add API key management UI to settings (3ba1783)
- Feat: add /calendar route with shadcn Calendar + dot-stacked birthdays/anniversaries (7962a20)
- Feat: add GET /calendar/month/{yyyy-mm} endpoint with birthday and life event aggregation (ada604a)
- Feat: add multiple project documentation files for new features and improvements (49e7614)
- Feat(auth): CF-aware login page, cookie-credentialed API, CF logout (0ce667e)
- Feat(auth): minimal Cloudflare Access frontend helper (3ac48dc)
- Feat(auth): apply visibility filter to reminders (b996b4b)
- Feat(auth): apply visibility filter to custom field values (5406b85)
- Feat(auth): apply visibility filter to contact_fields (708e029)
- Feat(auth): apply visibility filter to addresses (970833d)
- Feat(auth): apply visibility filter to life_events (fc77cdf)
- Feat(auth): apply visibility filter to debts (1fa4e9d)
- Feat(auth): apply visibility filter to gifts + add contact_visible helper (a761247)
- Feat(auth): apply visibility filter to interactions (aa49dd9)
- Feat(auth): apply visible_contact_ids filter to Contact endpoints (0bf1880)
- Feat(auth): tag-share CRUD router (71b89d2)
- Feat(auth): dual-mode get_current_user with CF Access header/cookie support (bba77e5)
- Feat(auth): add visible_contact_ids and JIT user provisioning (26d4ca5)
- Feat(auth): JWT+JWKS verifier (Cloudflare Access compatible) (521c071)
- Feat(auth): alembic migration for oidc columns and tag_share table (6d4fba9)
- Feat(auth): add oidc columns to User and TagShare model (b014989)
- Feat(auth): add AUTH_MODE and OIDC_* settings (default local) (bf9963d)

### Documentation
- Docs(db): regenerate after adding setup_state table (01336be)
- Docs: rename project to Kindred (1a519fc)
- Docs: regenerate db schema docs (do_not_contact fields) (7c6c948)
- Docs: regenerate db schema docs (api_key, contact_provenance) (a023811)
- Docs: regenerate db schema docs (communication_preference + source renames) (c03f78a)
- Docs: add Janet integration spec (3c5141c)
- Docs(db): regenerate after relationship.inverse_id migration (681a6b3)
- Docs(db): regenerate after note_mention migration (11e9c5d)
- Docs(db): regenerate from live schema (provenance + oauth_credential) (ff098eb)
- Docs(db): regenerate from live schema (activity_log + tag_share) (d0c9f47)
- Docs(db): regenerate from live schema (activity_log + tag_share) (f6de432)
- Docs: update next steps and add notes for @-mention timeline follow-ups (62b60c4)
- Docs(multi-users): trim trailing whitespace, add final newline (3072253)
- Docs: archive 2026-04-13 contact-card CRUD wiring handoff (3519219)
- Docs: add TODO/improvements backlog for personal-crm (c056db0)
- Docs: archive multi-user OIDC Phase 0 handoff (9130039)
- Docs: add frontend editorial refresh design spec (0f29e51)
- Docs: archive Kindred UX fix list handoff (d0ad6dd)
- Docs: add Kindred UX fix list handoff (a8c582c)
- Docs: add Phase 0 OIDC handoff (c769f6e)
- Docs: add multi-users sharing notes (643c7be)
- Docs: rewrite backend/frontend READMEs, drop template filler (542c547)
- Docs(auth): pivot design from Zitadel Cloud to Cloudflare Access (68bcd4a)
- Docs: spec for the Kindred frontend style pass (26db8f7)
- Docs: refresh handoff for contact detail CRUD work (4ffb0ee)
- Docs: rewrite README for the personal CRM (96e5499)

### Fixed
- Fix: add Relationship.inverse_id and fix bulk contact test isolation (fcd2b21)
- Fix: add bulk contact routes and fix create_relationship inverse_type (2e33ada)
- Fix: expose postgres env vars to test runner steps (be3697b)
- Fix(auth): return 401 for missing-user JWTs and drop redundant pre-load check (0e93419)
- Fix(auth): correct mypy annotations in visible_contact_ids and get_or_create_user_from_claims (17b9fec)

### Other
- Ci: add release.yml — tag-driven build + deploy to host (265db31)
- Chore(dev): hard-code kindred.localhost; project-local volumes (f54796d)
- Chore: update generated frontend SDK after contacts mentions endpoint (c3d07e9)
- Ci: switch test-backend to GHA services postgres (487ef80)
- Projects: create imessage-sync — iMessage social graph integration with kindred (bd9ac5e)
- Chore: bump meilisearch to v1.42.1 (cfc9119)
- Tests: add bulk contact API test suite (633d507)
- Chore: gitignore .playwright-mcp/ tool artifacts (1cd99d8)
- Tests: fix API key test suite (15/15 passing) (a33dde7)
- Projects: save contact-provenance (e8ab192)
- Projects: add janet-integration implementation plan (5800947)
- Runner: post status updates to Mattermost via incoming webhook (6c34889)
- Runner: forbid docker stack mutations in per-project prompt (9b4899f)
- Runner: --no-verify on commit + push for autonomous draft PRs (4349ff8)
- Chore: add Dirac runner harness for autonomous project implementation (64ef38c)
- Relationships: auto-create paired inverse so both contacts stay symmetric (7ea0c96)
- Projects: save and archive birthday-anniversary-calendar (a3c5288)
- Projects: archive worktree-dev-stack (f55b563)
- Projects: archive multi-party-interactions (b891b3c)
- Projects: archive note-mentions (522fc94)
- Notes: implement @-mention backlinks with note_mention junction (e3a7448)
- Projects: archive audit-log-shared-data (bafea8f)
- Projects: save audit-log-shared-data (472a99b)
- Devstack: add per-worktree compose stack and just recipes (036c343)
- Interactions: pass full contact object as seedContact instead of bare id (8f19bba)
- Gitignore: ignore .claude/ (Claude Code internal state) (ef643c1)
- Projects: save google-icloud-oauth-import (89510b4)
- Projects: create automated-release-notes (13cf4d5)
- Projects: create worktree-dev-stack (fcf481d)
- Audit: extract query helper into app/audit.py (8138242)
- Frontend: regenerate SDK for soft-delete Contact fields (a15d44c)
- Projects: save audit-log-shared-data (e421ae8)
- Contacts: soft-delete via deleted_at, with restore + trash views (bf0fd75)
- E2e: cover contact-scoped card dialogs (Address, Pet, Life Event, Field, Edit) (2f900b3)
- Ui: add reminders bell + badge to the app header (bd7751e)
- Tests: add CRUD coverage for addresses, pets, relationships, life events (052f735)
- Projects: save audit-log-shared-data (4f230bf)
- Audit: scope GET /activity-logs via TagShare for grantee visibility (494fdce)
- Chore: allow docker compose config and network inspect commands (54029a8)
- Audit: add activity_log table, before_flush listener, and GET /activity-logs endpoint (f4ad933)
- Projects: save birthday-anniversary-calendar (82edf45)
- Projects: save audit-log-shared-data (d4d0b41)
- Projects: save audit-log-shared-data (ae02e62)
- Projects: save note-mentions — design locked, 9 failing tests written (b5e1cae)
- Chore: ignore .worktrees/ directory (feb9490)
- Update db docs (3f91583)
- Projects: save multi-party-interactions (b743947)
- Projects: archive command-palette, contact-autocomplete-mentions, unified-contact-timeline (7b8874c)
- Interactions: replace contact_id with interaction_attendee junction (ac79ab8)
- Frontend: add unified contact timeline with type-colored events and filters (883ec0d)
- Frontend: add @contact autocomplete for notes and journal entries (1df7250)
- Frontend: add Cmd+K global command palette for navigation and contact search (cb2cdf6)
- Projects: scaffold remaining 39 improvement idea projects from improvements.md (70e9a6f)
- Projects: create kindred-sdk (6ad5fa0)
- Chore(claude): allow docker image commands in project settings (cdc0740)
- Admin: split admin page into Users / Webhooks / Import-Export tabs (f22d196)
- Format: run ruff across backend, fix pre-existing lint errors (2a7fc30)
- Db-docs: generate schema docs from live Postgres via tbls/dbml/pandoc (f4f53e8)
- Dev: fake-data seed script and just recipes for local dev (505516a)
- Ui: reformat avatar gradient palette variables (no value changes) (5cbbd7a)
- Contacts: inline relationship picker with popover+command combobox (03ee379)
- Contacts: replace Select dropdowns with inline pill-button toggles in forms (8dc92ab)
- Contacts: surface notes as top card, clickable tag filters, URL-synced search (d258249)
- Api: hydrate interactions with contact info and add batch ids to contacts list (8c96fff)
- Frontend: gitignore TS build cache and generated vite config artifacts (2445c2b)
- Chore(auth): wire Cloudflare Access OIDC values (sops) (06689bc)
- Ui: bump page headings to display face across remaining list and settings pages (6126475)
- Contacts: add avatar and display-face heading to detail page header (541f367)
- Contacts: migrate list page from DataTable to avatar-forward rows with search (cc07ee7)
- Dashboard: rebuild as editorial hero -- greeting, mini-stats, Stay in touch featured card (bb7ba7d)
- Ui: add ContactAvatar (hashed gradient palette) and FeaturedCard (tinted wash) components (3103b0f)
- Ui: pill buttons, rounded-xl h-10 inputs, rounded-2xl cards with display-face titles (8a4e60b)
- Ui: add display font and avatar gradient tokens for the editorial refresh (4a5ed94)
- Chore: ignore .superpowers/ brainstorming mockups (ad5f67e)
- Tests: route pytest at a separate database so dev data is never wiped (9e610aa)
- Infra: rename crm.${DOMAIN} to kindred.${DOMAIN} across compose, docs, and SOPS (64faf89)
- Ui: Kindred UX polish from punch list -- right-column interactions, snappier nav, enum button rows (dc70cba)
- Contacts: simplify data model -- drop notes, narrow field types to email/phone, drop relationship_group (b10912d)
- Ui: rebuild Logo as transparent SVG mask plus text wordmark, drop PNG backdrops (0397549)
- Add media recommendations feature for contacts (#16) (0099cda)
- Ci: create .env in pre-commit workflow so Generate Frontend SDK hook can load Settings (#18) (1150be9)
- Ci: unblock PRs by fixing env bootstrap, biome path bug, broken mypy (#17) (85f88f2)
- Chore(auth): wire AUTH_MODE and OIDC env across compose files (075b720)
- Style: ruff import ordering in gifts.py (256deda)
- Test(auth): confirm groups/journal/tags remain owner-only (915a763)
- Chore: remove dead Playwright suite and CI (052ecd3)
- Chore: consolidate compose files and refresh README (e992ca9)
- Chore: delete FastAPI-template cruft (852cd45)
- Gitignore: exclude .env variants except .env.sops and .env.example (fd40ca4)
- Secrets: switch sops to encrypt-by-default using _unencrypted suffix (48e92c7)
- Deploy: add remote compose stack and vite HMR config for crm.${DOMAIN} (f9e6691)
- Frontend: add Kindred brand mark, favicons, and PWA manifest (e47e0c0)
- Merge: Kindred frontend style pass (0915373)
- Frontend: clean up leftover hardcoded colors and direct lucide imports (1ceca4f)
- Frontend: migrate InteractionTimeline to tinted channel chips and shared components (82c315a)
- Frontend: migrate sidebar nav and standalone action menus (0fbf122)
- Frontend: migrate contact detail page and cards (fa1d0ed)
- Frontend: migrate dashboard to StatTile, SectionHeading, EmptyState (4739efb)
- Frontend: add StatTile, SectionHeading, RowActionsMenu, EmptyState (56c2d2b)
- Frontend: biome organize imports + format (auto-applied by lint) (fbee220)
- Frontend: rebrand from FastAPI template to Kindred (65127e5)
- Frontend: add design tokens and icon registry for style pass (ea1f0b6)
- Chore: remove Copier template scaffolding, drop item table (e7e5c18)
- Frontend: drop redundant tsconfig baseUrl (6f5a457)
- Frontend: add contact detail CRUD cards and custom field defs (2a58488)
- Sops: rotate FIRST_SUPERUSER_PASSWORD (c3c7b1e)
- Compose: rename homelab deployment to compose.prod.yml (4c3accb)
- Backend: remove items router leftover from Copier template (c655ce1)
- E2e: drive Radix with real pointer events and native setters (fb955c5)
- Frontend: fix contact detail page loading (50bcb60)
- Chore: archive handoff document (8a5d0c9)
- E2e: add Puppeteer test suite (3c1a5ae)
- Deps: add puppeteer for e2e testing (7881e3c)
- Frontend: use replace navigation on logout (2a75a59)
- Frontend: use refetchQueries instead of invalidateQueries for reminders (d13c12a)
- Docker-compose: add explicit DNS server for backend and frontend (010f2d4)
- Chore: flatten app/ subdirectory to project root (97b7694)


