# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Added
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
- Docs: document three-tier deployment model (prod/dev/PR previews) (4dd6655)
- Docs: add extension ideas and feature roadmap for personal-crm (fc4e336)
- Docs(pr-sweep): session log entries for tasks 1-2 + UNKNOWN-mergeable gotcha (f3eb8b5)
- Docs(projects): add pr-sweep-orchestrator implementation plan (a8f2ce0)
- Docs(projects): scaffold pr-sweep-orchestrator project README (e945650)
- Docs(readme): add Screenshots section with seeded fixture captures (32a8977)
- Docs(reminders-bell-badge): tick 6/7 tasks, log 2026-05-06 session (3ebb147)
- Docs(db): regenerate after Groups removal; drop stale table comments (a31dcdc)
- Docs: add project CLAUDE.md with terraform and stack context (d01b40d)
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
- Fix(pr-sweep): syntax-fix writes corrected file directly instead of applying a second diff (c4c7313)
- Fix(pr-sweep): prek PATH + LLM syntax-error repair pass after conflict resolution (804cc95)
- Fix(pr-sweep): skip pre-push hooks in push_branch (sweep already ran gauntlet) (be1b817)
- Fix(pre-push): extend e2e timeout to 5min + regenerate db docs (4872da8)
- Fix(pr-sweep): switch to merge + refresh stale local branches from origin (c4c4b5a)
- Fix: add Relationship.inverse_id and fix bulk contact test isolation (fcd2b21)
- Fix: add bulk contact routes and fix create_relationship inverse_type (2e33ada)
- Fix: expose postgres env vars to test runner steps (be3697b)
- Fix(auth): return 401 for missing-user JWTs and drop redundant pre-load check (0e93419)
- Fix(auth): correct mypy annotations in visible_contact_ids and get_or_create_user_from_claims (17b9fec)

### Other
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
- Frontend: update root bun.lock with leaflet + react-leaflet; remove spurious frontend/bun.lock (4d56f2d)
- Ci: write GHCR auth directly to config.json, skip docker login (03b898b)
- Ci: isolate Docker config in RUNNER_TEMP to avoid D-Bus/keyring (cb1ea18)
- Ci: clear Docker credential store before login on self-hosted runner (68246fd)
- Ci: switch to self-hosted runner on host, local buildx cache (df782a7)
- Frontend: add leaflet + react-leaflet for map view (fd3365e)
- Ci: drop auto-deploy job from release.yml — bump is manual (680d5e8)
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
