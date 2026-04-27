---
title: Audit Log for Shared Data
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-26
next_step: Add PII redaction for sensitive fields in changes_json before returning to grantees (task 6)
progress: 5/7 tasks
---

# Audit Log for Shared Data

## Goal
Track edits to shared rows in personal-crm with owner and actor identity. Any user who has access to a tag via TagShare can query the activity log for that tag's contacts and related entities, seeing what was changed, by whom, and when.

## Tasks
- [x] Design activity_log table schema (owner_id, actor_id, entity_type, entity_id, action, changes_json, occurred_at)
- [x] Create Alembic migration for activity_log table
- [x] Implement activity log service layer (insert, query by tag scope)
- [x] Wire SQLAlchemy event listeners or explicit service calls to log mutations
- [x] Build read API endpoint scoped via TagShare (GET /activity-logs?tag_id=...)
- [ ] Add PII redaction for sensitive fields in changes_json
- [ ] Document retention policy and archival strategy

## Session Log

### 2026-04-26 (session 5)
- Extracted activity log service layer: added `query_activity_logs()` helper + `TagAccessDenied` exception to `app/audit.py`; route slimmed to a thin handler that delegates and translates the exception to HTTP 403
- All 13 integration tests still green via `docker compose exec backend pytest`
- Task 3 (service layer) flipped to complete; progress 5/7
- Changes remain uncommitted on the `worktree-audit-log-shared-data` branch

### 2026-04-26 (session 4)
- Extended GET /activity-logs with TagShare scoping: grantees can now query contact-entity logs for contacts shared via a tag; `tag_id` filter narrows to contacts bearing that tag with 403 for unauthorized callers
- 4 new integration tests added (13 total, all green); frontend SDK regenerated with `tagId` param
- Commits: `49edc2d` (TagShare scoping + tests), prior session: `35decba` (listener + initial endpoint), `c15af97` (settings)

### 2026-04-26 (session 3)
- Test run attempted outside Docker — hit `POSTGRES_SERVER` env issue; tests must run via `docker compose exec backend pytest`
- All 9 implementation files confirmed present on disk; code unchanged from session 2, still uncommitted

### 2026-04-26
- work-in-progress — no commits yet
- Expanded scope from interaction-only to all entities; recommendation changed from explicit calls to SQLAlchemy `before_flush` session event
- Implemented: `ActivityLog` model + migration (b2c3d4e5f6a7), `app/audit.py` before_flush listener, `GET /api/v1/activity-logs` endpoint, 9 integration tests
- actor_id stamped on session via `get_current_user` in deps.py; no ContextVar needed, scoped to session object
- Removed explicit `session.flush()` from `create_interaction` (crud.py) so Interaction + attendees flush together in one before_flush call
- Fixed Alembic revision ID collision: initial ID `a1b2c3d4e5f6` collided with existing `drop_item_table` migration; renamed to `b2c3d4e5f6a7`, chained off `a7b8c9d0e1f2`
- 5/9 tests passing after first run; attendee fold fix applied (str() comparison), final test run pending confirmation

### 2026-04-21
- Project created.

### 2026-04-23
- README drafted with accurate schema references and design notes.

## Notes

### 2026-04-26 (session 5)
- **Decisions:** Service layer landed in `app/audit.py` next to the listener (single-file convention matches `crud.py`/`search.py`/`vcard.py`); rejected splitting into a new `app/services/` directory for consistency with the codebase. `TagAccessDenied` exception keeps the service HTTP-agnostic — the route catches it and translates to 403.
- **Gotchas:** The backend container bind-mounts `/home/will/projects/personal-crm/backend`, not the worktree path — running `pytest` against worktree code requires copying the changed files into main first. Cleaned up afterward by reverting main and keeping the audit-log changes only on the worktree branch so the diff stays atomic.
- **Accomplished:** Task 3 closed; `query_activity_logs()` + `TagAccessDenied` extracted; route slimmed to a delegating handler; 13/13 tests pass.
- **Issues:** Audit-log changes still uncommitted on `worktree-audit-log-shared-data`.

### 2026-04-26 (session 4)
- **Decisions:** TagShare scoping covers contact-entity logs only for MVP; non-contact entities (notes, interactions) only visible to owner — extend when needed
- **Gotchas:** `visible_contact_ids()` union subquery works in `.in_()` as expected; ruff auto-merged `and_, func, or_` into one import line on pre-commit
- **Accomplished:** Task 5 complete; 13/13 tests green; `tag_id` param added to frontend SDK; tree clean and pushed
- **Issues:** Task 3 (service layer) has no dedicated module — functionality covered by before_flush + route but task text implies a separate layer; tasks 6 (PII redaction) and 7 (retention) still open

### 2026-04-26 (session 3)
- **Gotchas:** Tests require `POSTGRES_SERVER` env var — must run via `docker compose exec backend pytest tests/api/routes/test_activity_logs.py`, not directly via `.venv/bin/python -m pytest`
- **Issues:** All implementation files uncommitted; 9 tests written but green status unconfirmed

### 2026-04-26 (session 2)
- **Decisions:** `before_flush` over explicit calls — scope is ~50 mutation points across 18 route files, not 3; `session.info["actor_id"]` stamped in `get_current_user`; single `activity_log` table confirmed; `create_interaction` explicit flush removed so Interaction + attendees go through one before_flush call
- **Gotchas:** `AttributeState` has no `.property` — use `sa.inspect(type(instance)).relationships` key set to filter out relationship attrs. Alembic collision: `a1b2c3d4e5f6` was already taken by `drop_item_table`; new revision must also chain off `a7b8c9d0e1f2` (attendee junction), not just `f5a6b7c8d9e0`
- **Issues:** attendee fold `str()` comparison fix applied but test result not yet confirmed green; `GET /activity-logs` scoped by `owner_id` only — TagShare scoping (task 5) still open
- **Accomplished:** `ActivityLog` model + Alembic migration, `app/audit.py` before_flush listener registered at startup, `GET /api/v1/activity-logs` endpoint, 9 integration tests, actor_id wiring via deps.py

### 2026-04-26 (session 1)
- **State sync:** README date bumped; no tasks completed yet, all 7 still open.
- **Verified clean:** both referenced files exist (models.py:238 TagShare ✓, routes/tag_shares.py ✓); no activity_log implementation found in any .py file (expected).
- **Notable drift since 2026-04-23:** `Interaction` model replaced `contact_id` FK with `InteractionAttendee` junction table (commit ecc2b5f). Audit log task "Wire event listeners/service calls" must account for `InteractionAttendee` mutations (attach/detach attendees) as a separate auditable event type — the Notes section's entity list predates this change.



- **TagShare model** ([models.py](../../../backend/app/models.py#L238)): Links a tag and a grantee user; includes created_at. Rows are the authorization boundary for audit log visibility.

- **Scope via TagShare**: To read activity for a Contact, the querying user must either own the contact or have a TagShare row where grantee_id = current_user and the contact is tagged with that tag. Activity log queries join through tag membership.

- **Event logging approach — recommendation: SQLAlchemy `before_flush` session event.** Scope expanded to all entities (Contact, Note, Interaction, Reminder, Gift, Debt, LifeEvent, Address, ContactField, Relationship, Pets, MediaRecommendation, etc.) across ~18 route files and ~50 mutation call sites. At this scale, explicit service calls become a gap guarantee — any new route that skips the log call is silently unaudited. Three options:
  1. **`before_flush` session event** (chosen): One listener on `Session` iterates `session.new`, `session.dirty`, `session.deleted` at flush time. SQLAlchemy's `inspect(instance).attrs.<attr>.history` provides `(added, unchanged, deleted)` tuples for each attribute, giving free `{"old": X, "new": Y}` diffs without extra queries. `actor_id` is stamped onto `session.info["actor_id"]` once by a FastAPI dependency — no ContextVar needed, session-scoped. Double-flush safe: SQLAlchemy clears dirty/new/deleted after each flush, so `create_interaction`'s explicit `session.flush()` + later `session.commit()` doesn't double-log. Background jobs and seed data: `session.info.get("actor_id")` returns None → skip or use a system actor sentinel.
  2. **Explicit service layer calls**: correct at 3 mutation points (original interaction-only scope), untenable at 50+. Also misses indirect mutations like `recompute_last_contacted_at` (crud.py:233) writing Contact from interaction and reminder routes — the listener catches these automatically.
  3. **Postgres triggers**: no `actor_id` without session-level SET; untestable in app tests; PII redaction harder.

- **InteractionAttendee in the listener**: collect all `InteractionAttendee` rows in `session.new` / `session.deleted` during `before_flush`, group by `interaction_id`, emit a single `action = "update_attendees"` log entry with `{"added": [...], "removed": [...]}` per interaction. On create, the attendee rows land in `session.new` alongside the `Interaction` row — fold attendees into the `"create"` log entry rather than emitting a separate junction event.

- **changes_json shape**: Store as JSON diff, not full snapshot. For PATCH /contacts/{id}, record {"first_name": {"old": "Alice", "new": "Alicia"}}. Snapshot approach is simpler but larger storage footprint.

- **PII redaction**: Contacts may hold sensitive data. Activity logs shown to grantees reveal who edited what. Consider redacting or masking certain fields (e.g., birthday, how_we_met, addresses) in changes_json before returning to grantees, or store redacted by default.

- **Retention policy**: No retention logic yet. Options: TTL on activity_log rows, archival to cold storage after N months, or indefinite retention with optional filtering.

- **Entities to audit**: Contact (create, update, delete), Interaction (create, update, delete), Note (create, update, delete), potentially ContactField, Address, Relationship, Gift, Debt, LifeEvent, MediaRecommendation. Start with Contact/Interaction/Note.

- **Actor vs. Owner distinction**: owner_id identifies the Contact owner (tenant); actor_id identifies the user who performed the edit (may be the owner or a grantee). If a grantee logs an interaction for a shared contact, actor_id != owner_id.

- **Existing endpoints**: Check [routes/tag_shares.py](../../../backend/app/api/routes/tag_shares.py) for TagShare CRUD and any existing permission checks that activity log queries must respect.
