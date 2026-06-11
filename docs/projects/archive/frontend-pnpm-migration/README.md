---
title: Frontend Toolchain Migration (bun → pnpm 11)
status: archived
repos: [personal-crm]
started: 2026-06-05
last_updated: 2026-06-10
next_step: pnpm 11 migration shipped in v0.2.88 — Dockerfiles/compose/justfile/.project-kit/scripts/dependabot migrated, bun.lock removed, full vitest (1869) + prod image build green.
---

# Frontend Toolchain Migration (bun → pnpm 11)

## Goal
Migrate the Kindred frontend/build toolchain from bun to pnpm 11, and harden the
install path against the 2025–26 npm supply-chain attacks (Shai-Hulud worm,
qix/chalk-debug, axios). pnpm 11 ships the relevant defenses on by default
(24h release-age cooldown, build-script allowlist); the goal is to land the
migration cleanly and make the hardening explicit rather than implicit.

## Tasks
- [x] Migrate root toolchain bun → pnpm 11.3.0 (`packageManager` field, `pnpm-lock.yaml`, `pnpm-workspace.yaml`)
- [x] Update Dockerfile.prod, frontend/Dockerfile, compose.dev.yml, compose.worktree.yml, CI scripts, dependabot to pnpm
- [x] Remove root `bun.lock` (1692 lines, dropped in 0764b80)
- [x] Publish decision brief: npm vs pnpm vs bun vs deno + supply-chain analysis (gist + Mattermost #reading-list)
- [ ] Remove stale `frontend/bun.lock` (dated 2026-05-31, predates migration, not removed by 0764b80)
- [ ] Add explicit `.npmrc` hardening — `minimumReleaseAge` (pin/raise above the 1440 default), `onlyBuiltDependencies` allowlist for sharp/esbuild/etc.
- [ ] Verify CI + preview + e2e all green on pnpm

## Session Log

### 2026-06-10
- Project archived.

### 2026-06-05
- Housekeeping: pnpm 11 migration shipped in v0.2.88 — Dockerfiles/compose/justfile/.project-kit/scripts/dependabot migrated, bun.lock removed, full vitest (1869) + prod image build green.
- Toolchain migration to pnpm 11.3.0 landed at repo root (commit `0764b80`): added `pnpm-lock.yaml` (+8608) and `pnpm-workspace.yaml`, removed root `bun.lock`, updated both Dockerfiles, compose files, generate-client.sh, run-e2e-prepush.sh, justfile, and dependabot config.
- Wrote and published a decision brief comparing npm/pnpm/bun/deno and analyzing whether the migration actually defends against the recent npm supply-chain attacks. Conclusion: pnpm 11's defaults would have blocked the headline attacks via the release-age cooldown, but that's now a copyable setting in npm/Yarn too — the hardening (cooldown + build-script allowlist + lockfile + minimal deps) matters more than the tool choice.
- Brief published: https://gist.khanpikehome.com/dFoRLgtFg82A2dJwpk/render
- Open: `frontend/bun.lock` was not removed by the migration commit (stale); no explicit hardening config exists yet (relying on pnpm 11 defaults).

## Notes

### 2026-06-05
- **Decisions:** Stay on Node runtime, switch package manager to pnpm 11 (monorepo/disk wins + supply-chain defaults for free); did not adopt bun-as-runtime. Hardening to be made explicit via `.npmrc`, not left to defaults.
- **Gotchas:** Migration is at the **repo root** (`package.json packageManager: pnpm@11.3.0`), not under `frontend/`. A leftover `frontend/bun.lock` survived the migration and should be deleted to avoid confusion. pnpm 11 enables `minimumReleaseAge=1440` by default — protection is real but is a race against attack detection, not a structural guarantee.
- **Issues:** No explicit supply-chain hardening config committed yet; pnpm script-blocking will break sharp/esbuild/node-gyp/Cypress/Playwright unless an `onlyBuiltDependencies` allowlist is added.
- **Accomplished:** bun→pnpm root migration committed (`0764b80`); decision brief published to gist + Mattermost.
