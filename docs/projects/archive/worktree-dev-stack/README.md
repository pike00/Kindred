---
title: Per-Worktree Dev Stack
status: archived
repos: [personal-crm, Homelab]
started: 2026-04-26
last_updated: 2026-05-01
next_step: Apply the NextDNS terraform module (infra/gateway/nextdns/) once the API key is created and stored in Bitwarden, then verify browser access on tailnet.
---

# Per-Worktree Dev Stack

## Goal
Each personal-crm worktree boots an isolated served app via `just worktree <slug>` from anywhere in the repo. Every worktree gets its own `COMPOSE_PROJECT_NAME`, namespaced volumes (fresh DB / Redis / Meili per worktree), and a Traefik-routed URL at `https://<slug>.kindred.example.com` so multiple feature branches can run side-by-side without port juggling. Localhost ports remain published for direct CLI access (psql, redis-cli, etc.).

## Tasks
- [ ] Apply NextDNS terraform module (`Homelab/infra/gateway/nextdns/`) once the API key is in Bitwarden and the SOPS files are populated
- [ ] Verify end-to-end browser access at `https://<slug>.kindred.example.com` from a tailnet client
- [ ] Confirm tailnet's DNS resolver actually points at NextDNS (Tailscale admin → DNS), not AdGuard or a public resolver
- [ ] Commit personal-crm changes: `justfile`, `compose.worktree.yml`
- [ ] Commit homelab changes: Traefik SAN addition, NextDNS terraform module
- [ ] Document the worktree workflow in personal-crm's CLAUDE.md or top-level README
- [ ] Decide whether dual-mode (Traefik + localhost ports) is the long-term shape, or simplify to Traefik-only after this stabilizes
- [ ] Optional: evaluate Dokploy / Easypanel as a future PaaS replacement for the bespoke stack

## Session Log

### 2026-05-01
- Project archived with 8 open tasks. Personal-crm side is shipped (commit 92cb3c5: compose.worktree.yml + justfile recipes). NextDNS terraform module scaffolded at Homelab/infra/gateway/nextdns/ but unapplied — gated on user-supplied API key in Bitwarden. Browser access on tailnet remains unverified. Resume by populating the NextDNS key and running the apply.

### 2026-04-26
- Built `compose.worktree.yml` + 10 justfile recipes (`env`, `up`, `down`, `down-clean`, `logs`, `ps`, `pytest`, `shell`, `worktree`, `worktree-rm`); each worktree gets a slug-derived `COMPOSE_PROJECT_NAME` and SHA1-mod-1000 port offset so localhost ports never collide
- `just worktree <slug>` creates-or-resumes a worktree at `.worktrees/<slug>`, symlinks `.env` from main, and prints a banner with branch / HEAD / dirty count / port offset / URLs before bringing the stack up
- Added Traefik labels routing `<slug>.kindred.${DOMAIN}` on the existing `kindred-private` network — backend behind `PathPrefix(/api|/docs|/redoc|/openapi.json|/dav|/.well-known)`, frontend on the apex
- Homelab side: added `*.kindred.example.com` SAN to Traefik static config; restart triggered via `just restart traefik`
- Found Traefik 3.x's entrypoint-level `tls.domains` doesn't proactively obtain new SANs (only renews existing acme.json entries) — added router-level `tls.certresolver=letsencrypt` + `tls.domains[0].main=*.kindred.${DOMAIN}` to force the issue. Cert minted via Cloudflare DNS-01 in ~30s
- Diagnosed `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` in browser: Cloudflare's free Universal SSL covers only one wildcard level, so two-level `*.kindred.*` fails at the CF edge. Browser-bypass options: pay for Advanced Cert Manager, switch to single-level scheme, or use tailnet-only DNS
- Picked tailnet-only via NextDNS split-horizon: scaffolded `Homelab/infra/gateway/nextdns/` Terraform module using `amalucelli/nextdns` provider, mirroring the cloudflare module shape (SOPS-encrypted env + tfvars, identical justfile)
- Wrote `~/.claude/skills/nextdns/` reference skill — Terraform-first guidance, raw API fallback, secure Bitwarden key handling

## Notes

### 2026-04-26
- **Decisions:** Two-level scheme `<slug>.kindred.${DOMAIN}` over single-level `<slug>-kindred.${DOMAIN}` — uglier in CF but matches the existing prod hostname pattern. Single compose file with always-on Traefik labels + always-published host ports (no flag — both modes work simultaneously, user picks the URL). Volumes namespaced by `COMPOSE_PROJECT_NAME`, no `external: true`, so each worktree gets a true fresh database. Service layer kept in `app/audit.py` (single-file convention), not a separate `services/` dir. Tailnet DNS via NextDNS rather than AdGuard rewrite because AdGuard returns the docker bridge IP (`172.20.2.254`) which is unreachable from outside the homelab host.
- **Gotchas:** Traefik 3.x's entrypoint `tls.domains` doesn't trigger ACME for newly-added SANs — required router-level `tls.domains` block. CF Universal SSL is one-wildcard-level only. Backend container bind-mounts main repo's `backend/`, not the worktree path — running pytest against worktree code requires copying files into main first OR remapping the volume. The first hop of every worktree boot will be slow (~30-90s) while ACME runs DNS-01; subsequent worktrees reuse the same wildcard cert instantly.
- **Issues:** NextDNS terraform module scaffolded but not yet applied — needs user-supplied API key (from `https://my.nextdns.io/account`) plus profile ID, both stored in Bitwarden as `NextDNS API`. Worktree URL won't render in the browser until: (a) the rewrite is applied, AND (b) the tailnet's DNS is actually configured to use NextDNS. Personal-crm tooling changes (`justfile`, `compose.worktree.yml`) and homelab changes (Traefik SAN, NextDNS module) all still uncommitted.
- **Accomplished:** Pipeline verified end-to-end via curl with `--resolve 192.0.2.1`: real `*.kindred.example.com` cert presented, backend `/api/v1/utils/health-check/` returns 200, frontend returns 200. Browser blocked only on the tailnet-DNS-to-tailnet-IP step.
