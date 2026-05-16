---
title: Feature Backlog Merge Train
status: active
repos: [personal-crm]
started: 2026-05-15
last_updated: 2026-05-15
next_step: Resolve printable-contact-one-pager pyproject.toml conflict (weasyprint + phonenumbers union), continue Wave 2 (6 branches remaining)
---

# Feature Backlog Merge Train

## Goal

Land 46 unmerged feature branches into main, sequentially, with one squash commit per branch and a tagged release after each. The Dirac brainstorm/feature-incubator process produced ~42 `dirac/*` branches plus 3 worktree branches and `feature/birthday-anniversary-calendar`, all developed in parallel and drifted from main without rebasing. Tests must stay green after every merge. `dirac/kindred-sdk` is deferred pending architectural review against the already-merged `sdk/` package.

## Tasks

### Wave 1 — pure additions, low collision (1-5 files each)

- [x] `dirac/undo-toast-destructive` → v0.1.0
- [x] `dirac/imessage-sync` → v0.1.1
- [x] `dirac/quick-log-fab` → v0.1.2
- [x] `dirac/twilio-sms-call-webhook` → v0.1.3

### Wave 2 — small, single migration (5-10 files)

- [x] `dirac/csv-import-export` → v0.1.4
- [x] `dirac/reminder-snooze-history` → v0.1.5
- [x] `dirac/reminders-bell-badge` → v0.1.6
- [x] `dirac/automated-release-notes` → v0.1.7
- [x] `dirac/household-aggregate-view` → v0.1.8
- [ ] `dirac/printable-contact-one-pager` (in-progress, conflict on pyproject.toml)
- [ ] `dirac/journal-contact-join`
- [ ] `dirac/interaction-heatmap`
- [ ] `dirac/ics-calendar-export`
- [ ] `dirac/relationship-graph`
- [ ] `feature/birthday-anniversary-calendar`

### Wave 3 — medium (10-15 files)

- [ ] `dirac/tagshare-scope-warning`
- [ ] `dirac/keyboard-shortcut-overlay`
- [ ] `dirac/gift-kanban`
- [ ] `dirac/contact-stage-history`
- [ ] `dirac/full-text-search`
- [ ] `dirac/contact-merge-history`
- [ ] `dirac/relationship-inverse-mapping`
- [ ] `dirac/interaction-drafts`
- [ ] `dirac/interaction-location`
- [ ] `dirac/organizations-first-class`
- [ ] `dirac/face-aware-avatar-crop`
- [ ] `dirac/soft-delete-entities`
- [ ] `dirac/empty-state-illustrations`
- [ ] `dirac/contact-provenance`
- [ ] `dirac/debt-partial-payments`
- [ ] `dirac/carddav-server`
- [ ] `dirac/saved-filters-smart-lists`
- [ ] `dirac/vcard-hash-verification`
- [ ] `dirac/ical-importer-backfill`
- [ ] `dirac/voice-to-text-interaction`
- [ ] `dirac/contact-timezone-pronouns`
- [ ] `dirac/pwa-offline-notes`
- [ ] `dirac/contacts-kanban`
- [ ] `dirac/map-view-contacts`
- [ ] `dirac/bulk-contact-operations`
- [ ] `dirac/e2e-contact-crud-tests`
- [ ] `dirac/email-log-ingestion`

### Wave 4 — large (32-101 files)

- [ ] `worktree-stay-in-touch-dashboard`
- [ ] `worktree-google-icloud-oauth-import`
- [ ] `worktree-communication-preferences`
- [ ] `dirac/empty-state-illustrations` (largest in Wave 3, may move here)

### Deferred

- [ ] `dirac/kindred-sdk` — architecturally competes with the already-merged `sdk/` (893 LOC) vs the dirac branch's `kindred-sdk/` (33481 LOC, includes openapi-python-client generated `personal_crm_client/`). Defer until a separate scoping call.

### End-of-train

- [ ] Full pytest pass (no `-k` filter, 262+ tests)
- [ ] tsc typecheck pass
- [ ] e2e via `scripts/run-e2e-prepush.sh`
- [ ] Fresh DB end-to-end migration test (`just down-clean && just up`, then `alembic upgrade head`)
- [ ] Smoke test UI (login, create contact, search, log interaction)

## Session Log

### 2026-05-15
- Landed 4 features in this session: reminder-snooze-history (v0.1.5), reminders-bell-badge (v0.1.6), automated-release-notes (v0.1.7), household-aggregate-view (v0.1.8). Each is a squash commit + tag + GH release.
- reminders-bell-badge merge resolved 4 conflict sections in `backend/app/api/routes/reminders.py`: kept HEAD's richer `RemindersDuePublic` join (vs branch's flat `RemindersWithContactPublic`), HEAD's flexible snooze signature (body + minutes + reason), HEAD's far-future sentinel dismiss endpoint (vs branch's `snoozed_until=now()` which would re-include immediately). Branch's `ReminderWithContactPublic` and `RemindersWithContactPublic` models auto-merged into `models.py` and remain there but are not used by the chosen `/due` implementation. Added `count: int` back to `RemindersPublic` to match the existing frontend usage.
- household-aggregate-view merge kept HEAD's full `contacts.py` (all bulk ops, overdue contacts, skip, iMessage sync) and grafted the branch's `get_contact_household` endpoint onto the end. The conflict had put HEAD's `list_contact_mentions` body inside the new household function — discarded that since the canonical version lives at lines 686-728.
- printable-contact-one-pager merge IN PROGRESS: pyproject.toml conflict resolved (union of `phonenumbers` + `weasyprint`), uv.lock re-resolved, but `contact_pdf.py` is staged and the working tree still has unresolved markers. Did NOT commit. Need to finish on next session.
- Conflict-resolution rules that proved correct: always take HEAD for `frontend/src/client/*.gen.ts` and re-run `just regen-client`. Always re-run `uv lock` for `uv.lock`. Garbage files (`front`, `NOTES.md`, `openapi.json` at repo root, `types_backup.ts`) get `git rm -f`.

## Notes

### 2026-05-15
- **Decisions:** Squash-merge per branch with one tagged release each (v0.1.0 through v0.1.8 so far). Conflict resolution rule for backend route conflicts: keep HEAD's accumulated logic, graft branch's net-new endpoints on top. Frontend client files always regenerated, never merged.
- **Gotchas:** SQLModel 0.0.31 does not handle `list[ForwardRef]` on `table=True` models without `link_model` (got `ValueError: <class 'list'> has no matching SQLAlchemy type`). Solution: drop the `snoozes` back_populates list on `Reminder`. `ReminderSnooze` class also needs explicit `__tablename__ = "reminder_snooze"` because SQLModel maps it to `remindersnooze` while the Alembic migration uses `reminder_snooze`.
- **Gotchas:** `just typecheck` fails with "service frontend is not running" because the dev compose project creates `kindred-frontend-1` (worktree naming) not what the recipe expects. Workaround: `docker compose -f compose.dev.yml exec -T frontend bun run typecheck` directly.
- **Gotchas:** Vite caches the generated SDK in `node_modules/.vite/deps`. After every `just regen-client`, the frontend container is restarted automatically by the recipe — without that restart, the dev server keeps serving the stale client even though the .gen.ts files are correct on disk.
- **Issues:** printable-contact-one-pager merge has unresolved conflict markers in working tree (`backend/pyproject.toml` is `UU` and `frontend/src/routes/_layout/contacts/$contactId.tsx.bak` exists). Need to finish resolving and complete merge before starting next branch.
- **Issues:** The plan file at `/home/will/.claude/plans/twinkling-discovering-tiger.md` notes that `dirac/kindred-sdk` (266 files, includes 33k LOC of generated openapi-python-client) competes architecturally with the already-merged `sdk/` package. Deferred indefinitely pending architectural review.
- **Issues:** Frontend test files (Admin/* tests, Common/Footer, theme-provider) have been auto-modified by squash merges to add `waitFor` wrappers and regex-based assertions. These are legitimate test improvements from branches that included broader test hardening, but they create noise in every merge's diff. Staged and included as part of each merge commit.
- **Accomplished:** v0.1.5 → v0.1.8 released, 4 GH releases tagged, all 262 backend tests passing after each merge, typecheck clean after each merge.
