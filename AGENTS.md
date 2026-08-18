# personal-crm (Kindred) — Project Instructions

<!-- BEGIN PROJECT-KIT — generated, do not edit by hand -->
## Project-kit recipes

This repo is managed by project-kit (skill version: 0.1.0, last refreshed: 2026-05-31).
All dev/test/release/deploy operations go through `just`.

### Quick reference

| Task | Command |
|---|---|
| Bring up dev environment | `just dev` |
| Tear down dev | `just down` |
| Tail logs | `just logs <service>` |
| Create preview PR | `just pr` |
| Run all tests | `just test-all` |
| Backend tests | `just test-backend` |
| Frontend tests | `just test-frontend` |
| E2E tests | `just test-e2e` |
| Lint | `just lint` |
| Typecheck | `just typecheck` |
| Cut a release | `just release patch` |
| Update CHANGELOG | `just changelog` |
| Build container image(s) | `just build-image [tag]` |
| Deploy to prod | `just deploy` |
| Ship (release+build+deploy) | `just ship patch` |
| Install dependencies | `just setup` |
| Health check | `uv run .project-kit/scripts/doctor.py` |

### Subsystem status

- preview: enabled
- release: enabled
- test: enabled
- deploy: enabled (target=homelab)
- build: enabled
- db: disabled
- setup: enabled
- docs: disabled
- clean: enabled

### Where things live

- `.project-kit/*.just` — recipe definitions (10 files)
- `.project-kit/scripts/` — uv-scripts for non-trivial recipes
- `.project-kit/cliff.toml` — git-cliff config (centralized; passed via `--config`, no root copy)
- `justfile` (root) — imports the 10 `.just` files plus repo-specific recipes

### How to refresh

Re-run the project-kit wizard in chat: ask Claude to "refresh project-kit"
or "audit project-kit in this repo".
<!-- END PROJECT-KIT -->

## Fast tailnet development

Use `just dev-tailnet` for the repeat development loop after the stack has
been bootstrapped. It reuses cached containers, avoids rebuilding images and
reinstalling frontend dependencies, and serves Vite directly over Tailscale
with the API proxied to the local backend. If port 8000 is occupied:

```bash
BACKEND_PORT=18001 just dev-tailnet
```

The command stays attached to the Vite process; Ctrl-C stops that tailnet
listener, while `just down` stops the containers.

The worktree compose host ports are loopback-only; tailnet access goes through
the Vite listener above rather than exposing the backend directly on the LAN.


Origin: `pike00/Kindred` (public repo). Scaffolded from `fastapi/full-stack-fastapi-template`.

## Stack

- Backend: FastAPI + SQLModel + Alembic, Python 3.13, `uv`. Source under `backend/app/`.
- Frontend: React 19 + Vite + Bun + TanStack Router/Query + Tailwind + shadcn/ui. Source under `frontend/src/`.
- Postgres 18, Redis 7 + arq worker, Meilisearch v1, Radicale CardDAV bridge mounted into FastAPI.
- E2E: Puppeteer specs under `e2e/`, driven by Bun.
- Prod image: single combined `Dockerfile.prod` — FastAPI serves built SPA from `/app/static/` when `STATIC_DIR` is set.

## Dev workflow (worktree-first)

The default `justfile` targets `compose.dev.yml` and the entrypoints (`just dev`, `just down`, `just logs`, `just pytest`, `just shell`) assume the worktree stack pattern (`compose.worktree.yml`). `just dev` from the main repo dir gives you the `personal-crm` project on the default port offset; `just worktree <slug>` creates `.worktrees/<slug>/` on a new branch and brings up an isolated stack with its own DB/Redis/Meili volumes and offset host ports.

```bash
just dev                         # bring up worktree stack (DB + API + worker + frontend + redis + meili)
just down                        # stop containers, keep volumes
just down-clean                  # stop + drop volumes (fresh DB next `just dev`)
just logs [service]              # tail; scope to one service if given
just ps                          # status
just env                         # print resolved project name, hostname, ports
just pytest [-- args]            # pytest inside backend container
just typecheck                   # tsc --noEmit inside frontend container
just shell                       # bash into backend container
just worktree <slug>             # create-or-resume worktree at .worktrees/<slug>/ + up
just worktree-rm <slug>          # tear down + remove worktree
just regen-client                # regenerate frontend SDK + restart frontend (see below)
just seed [count] [email]        # seed fake data; seed-reset wipes first; seed-fixed is deterministic
```

Secrets live in `.env.sops`; `just dev` symlinks `.env` from the main repo into worktrees if missing. Decrypt with `sops -d .env.sops > .env` when starting fresh.

### Regenerating the frontend SDK

Always `just regen-client` after changing any backend route/schema — never `bash scripts/generate-client.sh` alone. The script refreshes `frontend/openapi.json` and `frontend/src/client/*.gen.ts` on disk, but Vite caches the compiled SDK in `node_modules/.vite/deps`. Without restarting the frontend container the dev server keeps serving the stale client. Symptom: API returns the new shape, UI still uses old types.

### Regenerating the Python SDK

After any backend schema change, also run `just sdk-regen` to update `sdk/src/kindred/_generated/` from the freshly-exported `frontend/openapi.json`. Commit the result — the generated tree is checked in so the package installs from a git URL without needing a live server. If new endpoints were added, wire CLI commands in `sdk/src/kindred/cli.py` and add tests in `sdk/tests/`.

## Three deployment tiers

| Tier | Where | Domain | Compose | DB |
|---|---|---|---|---|
| Prod | `~/Documents/Homelab/apps/kindred/` on ares | `kindred.<DOMAIN>` | plain `docker compose` against pinned `ghcr.io/pike00/kindred:vX.Y.Z` | `kindred_db_data` volume, db `kindred` |
| Dev (against homelab Traefik) | this repo | `kindred.dev.<DOMAIN>` | `compose.dev.yml` | project-local `crm-db` volume, db `crm` |
| Per-worktree | `.worktrees/<slug>/` | `<slug>.dev.kindred.<DOMAIN>` | `compose.worktree.yml` | project-local per-worktree volume |

Tier isolation is hard: distinct credentials, volumes, networks, db names, and hard-coded Traefik labels (no `${DOMAIN}` interpolation on the prod hostname rule). Don't introduce shared `external: true` volumes across tiers.

### E2E loopback override

`compose.dev.yml` publishes `127.0.0.1:8001 -> backend:8000` and `127.0.0.1:5173 -> frontend:5173` so Puppeteer can hit the stack without going through Traefik. `compose.dev.override.yml` adds the matching CORS + Vite env so the SPA talks to the loopback API:

```bash
docker compose -f compose.dev.yml -f compose.dev.override.yml up -d --force-recreate backend frontend
```

`BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` and `VITE_API_URL=http://localhost:8001` only apply under the override. Without the override, `VITE_API_URL` points at the public dev hostname and CORS rejects loopback.

## Development & Deployment Workflow Policy

All changes must strictly follow the standard delivery pipeline:
1. **Branch**: Create a feature/bugfix branch (or use `just worktree <slug>`).
2. **Commit**: Make atomic commits via `gcommit`.
3. **Push**: Push branch to origin.
4. **PR**: Open a pull request (e.g. via `just pr` or `gh pr create`).
5. **Merge**: Merge the PR into main after checks pass.
6. **Deploy**: Deploy to production (e.g. `just release` or `just deploy`).

Do not push code directly to `main` without following this branch, commit, push, PR, merge, deploy pipeline.

## Release / publish / deploy

Three recipes, defined in `justfile` (see also `release.just`):

```bash
just release v0.2.0     # tag + push + build Dockerfile.prod + push :v0.2.0 + :sha-<short> to GHCR
just publish v0.2.0     # build + push only (tag must already exist)
just bump v0.2.0        # delegates to ~/Documents/Homelab/apps/kindred/justfile (pg-dump, pull, healthcheck)
```

`release` enforces tag format `vX.Y.Z[-prerelease]`, blocks pre-existing tags, requires a clean working tree, and requires HEAD pushed to origin. No `:latest` tag is published — homelab compose uses `${IMAGE_TAG:?}` so every deploy is explicit.

CI mirror: `.github/workflows/release.yml` runs on tag push via the **self-hosted GHA runner on ares** and produces the same image. `just publish` is the host-side equivalent for when the runner is unavailable.

## Pre-push gates

`prek install` (alias for pre-commit) wires both hook stages. Pre-commit runs biome + ruff + ruff-format + SDK regen. Pre-push runs two extra gates:

- `db-docs-check` — `tbls diff` against the live dev DB. Fails the push if `docs/db/` is stale. Fix: `just db-docs && git add docs/db && git commit --amend`. Requires the `db` service to be running.
- `e2e-tests` — `scripts/run-e2e-prepush.sh` brings the dev stack up (with the loopback override) if it isn't reachable on `127.0.0.1:8001`/`5173`, then runs the puppeteer specs in `e2e/`. Bypass: `SKIP=e2e-tests git push` or `PERSONAL_CRM_SKIP_E2E=1 git push`. Skips with a warning (not silently green) if Docker is unavailable.

## SPA fallback static file serving

`backend/app/main.py` mounts `/assets` from `STATIC_DIR` and adds a catch-all `spa_fallback` route. The fallback serves real files at the static root (e.g. `site.webmanifest`, `robots.txt`, `favicon.ico`) **before** falling back to `index.html`. Path-traversal is blocked via the `_static_dir + os.sep` prefix check. If you add a new top-level static asset, no code change is needed — drop it under `frontend/public/` and the build pipeline picks it up.

## Terraform (out of repo)

Terraform for this project lives in `~/Documents/Homelab/`:

- DNS / Cloudflare / cert SANs: `infra/gateway/cloudflare/`
- Tailnet DNS rewrites for worktree split-horizon (`<slug>.dev.kindred.<DOMAIN>`): `infra/gateway/nextdns/` (unapplied; gated on NextDNS API key)

Run via `just tf-plan` / `just tf-apply` from those directories. Never run `terraform` directly.

## Gotchas

- `just dev` brings up the *worktree* stack via `compose.worktree.yml`. To run the plain dev stack against homelab Traefik, use `docker compose -f compose.dev.yml up -d` directly.
- Backend ID is `kindred-internal-crm` for the internal network and `kindred-private` for ingress — both `external: true`. Created by the homelab `apps/kindred/` stack; don't redefine them here.
- mypy is intentionally disabled in pre-commit (~90 pre-existing strict-mode errors). Run locally with `uv run --project backend mypy app`.
- The Copier template's `items` module is removed from the router but the model and Alembic table remain; drop with a dedicated migration if/when desired.
- Routes with incomplete or missing UI: `activity-logs` (no view), `import-export` (import UI done, export not wired), `calendar` (month view exists, no create/edit events). The previous list here (`addresses`, `pets`, `relationships`, etc.) is stale — all of those now have contact-card UIs.
- Several entity cards are create-only in the UI; edit/delete SDK methods exist but are uncalled for `interactions`, `journal`, `debts`, `gifts`, `media_recommendations`, `reminders`, and `tags`. See `docs/improvements.md` for tracking.
