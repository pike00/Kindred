# personal-crm (Kindred) — Project Instructions

## Terraform

Terraform is not in this repo. Infrastructure for this project is managed in `~/Documents/Homelab/`:

- **DNS / Cloudflare** — `infra/gateway/cloudflare/` handles `*.example.com` wildcard cert and DNS records. Run via `just tf-plan` / `just tf-apply` from that directory.
- **NextDNS (worktree split-horizon)** — `infra/gateway/nextdns/` was scaffolded for `<slug>.kindred.example.com` tailnet DNS rewrites. Unapplied; gated on NextDNS API key in Bitwarden (`NextDNS API`). Run via the same `just tf-*` pattern once the key is populated.

When infrastructure changes are needed (new DNS records, cert SANs, NextDNS rewrites), switch to the Homelab repo and use `just tf-*` recipes — never run `terraform` directly.

## Stack

- **Backend** — FastAPI + SQLAlchemy + Alembic, in `backend/`. Run via `just dev` or `just up`.
- **Frontend** — React (Vite + Bun), in `frontend/`. Dev server starts alongside the API stack.
- **DB** — Postgres (Docker). Migrations: `just migrate` / `just makemigrations`.
- **Worktrees** — `just worktree <slug>` boots an isolated stack per branch at `.worktrees/<slug>/`.

## Dev workflow

```bash
just up           # start full stack (DB + API + frontend)
just dev          # hot-reload API only
just pytest       # run backend tests
just migrate      # apply pending Alembic migrations
just makemigrations <msg>  # generate new migration
just regen-client # regenerate frontend SDK + restart frontend container
just seed         # seed fake data for FIRST_SUPERUSER (use seed-reset / seed-fixed for variants)
```

Secrets live in `.env.sops`; decrypt with `sops -d .env.sops > .env` or rely on the `just` recipes which handle this automatically.

## Regenerating the frontend SDK

After changing any backend route/schema, run **`just regen-client`** — never `bash scripts/generate-client.sh` alone. The script refreshes `frontend/openapi.json` and `frontend/src/client/*.gen.ts` on disk, but Vite caches the compiled SDK in `node_modules/.vite/deps` inside the frontend container, so the dev server keeps serving the stale client until the container restarts. `just regen-client` does both. Symptom of forgetting: API returns the new shape, the UI still uses the old types/functions.
