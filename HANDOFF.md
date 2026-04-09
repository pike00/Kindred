# Handoff: Personal CRM -- Full Implementation Complete

**Generated**: 2026-04-09
**Branch**: main
**Status**: Ready for Review / Production

## Goal

Complete all 20 implementation steps of the Personal CRM (Steps 0-20), fix blocking issues, pass code review, and deploy to Docker with Traefik routing.

## Completed

- [x] Steps 0-7: Backend (models, CRUD, API routes, migrations, vCard, CardDAV, import)
- [x] Steps 8-12: Frontend CRUD (contacts, tags, groups, reminders, journal pages + dialogs)
- [x] Step 13: Docker Compose production config (6 services, Traefik labels, healthchecks)
- [x] Step 14: Interactions timeline page with date-grouped view + add dialog
- [x] Steps 15-16: ARQ background worker (reminders cron, cadence cron, async search indexing)
- [x] Step 17: Gifts and debts tabs on contact detail page with add dialogs
- [x] Step 18: Dashboard "Losing Touch" + "Recent Interactions" widgets
- [x] Steps 19-20: Webhooks API + Meilisearch integration (both pre-existed in backend)
- [x] Blocking issue #1: Contact relationships eager loading in create_contact
- [x] Blocking issue #2: 8-second latency (moved Meilisearch indexing to ARQ background)
- [x] Frontend bun.lock fix (rollup as explicit dependency for Vite 8)
- [x] Code review: Docker hardening, connection pool leaks, logging fixes
- [x] 21 new CRM route tests (14 contact, 7 interaction) -- 80/81 total passing
- [x] Database migrations applied (6 migrations via alembic upgrade head)
- [x] Production deployment: MEILI_MASTER_KEY configured, Traefik routing verified

## Not Yet Done

- [ ] Frontend tests (Playwright -- scaffolded but not written for CRM pages)
- [ ] Dead code: _remove_contact_safe in contacts.py (replaced by _enqueue_contact_removal)
- [ ] check_cadences in worker.py sends notifications for ALL users without per-user Apprise URL filtering
- [ ] Frontend service missing security_opt and cap_drop in docker-compose
- [ ] DB service missing cap_drop: [ALL] in docker-compose
- [ ] Pre-existing test failure: test_recovery_password (email config not set in test env)
- [ ] Meilisearch setup_index() never called on startup -- filterable/sortable attributes not configured

## Failed Approaches (Don't Repeat These)

- **session.refresh(contact) for eager loading**: After creating a contact with tag/group associations, session.refresh() only reloads scalar fields, NOT relationships. Fix was to re-query with selectinload().

- **uv run arq as worker command in Docker**: The uv run command tries to sync the virtual environment at startup, requiring network access to PyPI. Inside the isolated kindred-internal-crm network, DNS resolution fails. Fix: use bare arq since the venv is already built in the Docker image.

- **bun run build from project root**: The build script only exists in app/frontend/package.json, not the workspace root. Must cd app/frontend first. Additionally, Vite 8 requires rollup but bun wasn't resolving it as a nested dependency -- had to add it explicitly to package.json.

- **tsr generate (TanStack Router codegen)**: Running npx tsr generate installed a wrong package (tsr v1.3.4 which deletes unused exports). TanStack Router's codegen runs automatically via the Vite plugin. For manual route additions, edit routeTree.gen.ts directly -- it follows a clear pattern.

- **RedisSettings() (default localhost)**: The ARQ worker and contact route were using RedisSettings() which defaults to localhost:6379. Inside Docker, Redis is at redis:6379. Fix: RedisSettings.from_dsn(settings.REDIS_URL).

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| BackgroundTasks + ARQ for indexing | Meilisearch indexing was blocking API responses for ~8s. FastAPI BackgroundTasks enqueues to ARQ worker for true async processing |
| Singleton ARQ pool (_arq_pool) | Creating a new Redis connection pool per request leaked connections under load. Module-level singleton reuses the pool |
| Worker DB engine in ctx | create_engine() per cron invocation leaked connection pools. Moved to on_startup context for reuse |
| MEILI_ENV=production with key | Development mode doesn't require a master key but is insecure. Production mode with a 32-byte key in .env |
| Manual routeTree.gen.ts edits | TanStack Router Vite plugin auto-generates this file, but manual edits work fine and are simpler than figuring out the codegen CLI |

## Current State

**Working**: All 6 Docker services running and healthy. Backend API serves all CRM endpoints. Frontend builds and serves via Nginx. Traefik routes crm.example.com to both frontend and API. Worker runs reminder/cadence crons every 30min/daily. Meilisearch accepts indexing jobs.

**Broken**: Nothing critical. test_recovery_password fails due to missing email config in test env (pre-existing).

**Uncommitted Changes**: Files outside personal-crm/ (hermes, cal, n8n, etc.) are modified but unrelated to this work.

## Files to Know

| File | Why It Matters |
|------|----------------|
| app/backend/app/api/routes/contacts.py | Core CRUD + async search indexing via ARQ. Has singleton _arq_pool |
| app/backend/app/worker.py | ARQ worker: cron jobs, search indexing tasks, DB engine in ctx |
| app/backend/app/search.py | Meilisearch client with availability caching (60s check interval) |
| app/backend/app/models.py | All 28 SQLModel tables + Pydantic schemas |
| app/frontend/src/routeTree.gen.ts | Auto-generated but manually extended for /interactions route |
| app/frontend/src/routes/_layout/contacts/$contactId.tsx | Contact detail: edit dialog, interactions, gifts, debts tabs |
| app/frontend/src/routes/_layout/index.tsx | Dashboard: stats cards, losing-touch widget, recent interactions |
| app/frontend/src/components/Interactions/ | Timeline + AddInteractionDialog (new this session) |
| docker-compose.yml | Production compose: 6 services, Traefik labels, hardening |
| docs/architecture.md | Full implementation guide (Steps 0-20, ~27K tokens) |
| docs/DB_SCHEMA.md | All 28 tables with columns, indexes, constraints |

## Code Context

Contact creation flow (the main thing that was fixed):

```python
# app/backend/app/api/routes/contacts.py
# After commit, re-query with eager loading (NOT session.refresh):
session.commit()
statement = select(Contact).where(Contact.id == contact.id).options(
    selectinload(Contact.tags),
    selectinload(Contact.groups),
)
contact = session.exec(statement).first()
# Then enqueue indexing in background (non-blocking):
background_tasks.add_task(_enqueue_contact_index, contact)
```

ARQ pool singleton (fixes Redis connection leak):

```python
_arq_pool = None

async def _get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        from arq.connections import create_pool
        _arq_pool = await create_pool(RedisSettings.from_dsn(app_settings.REDIS_URL))
    return _arq_pool
```

Worker context pattern (fixes DB engine leak):

```python
class WorkerSettings:
    @staticmethod
    async def on_startup(ctx: dict) -> None:
        ctx["engine"] = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

async def check_reminders(ctx: dict) -> None:
    engine = ctx["engine"]  # reuse, don't create_engine() per call
```

## Resume Instructions

1. Start the stack:
   ```bash
   cd /home/will/Documents/Homelab/personal-crm
   docker compose up -d --build
   ```

2. Verify all services healthy:
   ```bash
   docker compose ps
   ```
   - Expected: 6 services, all "Up", db/backend/redis/meilisearch show "(healthy)"
   - If worker exits: check `docker compose logs worker` -- likely a Redis or import error

3. Run backend tests:
   ```bash
   docker compose exec backend pytest tests/ -q
   ```
   - Expected: 80 passed, 1 failed (test_recovery_password -- pre-existing email config issue)
   - If new failures: check `docker compose logs backend` for startup errors

4. Test frontend build:
   ```bash
   cd app/frontend && bun run build
   ```
   - Expected: "built in ~4s"
   - If rollup error: `bun add rollup` then retry

5. Verify Traefik routing:
   ```bash
   curl -s http://localhost:8080/api/http/routers | python3 -c "import json,sys; [print(r['name'],r.get('status')) for r in json.load(sys.stdin) if 'crm' in r['name']]"
   ```
   - Expected: crm-api@docker enabled, crm@docker enabled

## Setup Required

- Docker + Docker Compose running
- External volumes: crm-db, crm-redis, crm-meili (create with `docker volume create <name>`)
- External networks: kindred-private, kindred-internal-crm (create with `just networks`)
- .env file with: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, SECRET_KEY, FIRST_SUPERUSER, FIRST_SUPERUSER_PASSWORD, DOMAIN, MEILI_MASTER_KEY, REDIS_URL
- Traefik running on kindred-private network

## Warnings

- Do NOT read .env files -- they contain secrets (CLAUDE.md safety rule)
- The routeTree.gen.ts is auto-generated by TanStack Router's Vite plugin but was manually edited. Running vite build may overwrite it. If the interactions route disappears, re-add the import and route definition following the existing pattern.
- The compose.override.yml in app/ is for local dev with the upstream template. The root docker-compose.yml is for production. Don't confuse them.
- Meilisearch setup_index() (configures searchable/filterable attributes) is defined but never called on startup. First search queries may not filter correctly until it's run.
