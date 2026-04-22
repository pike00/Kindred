---
summary: "Multi-user OIDC Phase 0 complete (11/11) -- ready for Phase 1 CF Access setup"
---

# Handoff: Multi-User OIDC Phase 0

**Date:** 2026-04-19
**Goal:** Convert personal-crm from single-superuser to household multi-user (2-5 users) via Cloudflare Access (Zero Trust) + tag-based sharing, per spec `docs/superpowers/specs/2026-04-18-multi-users-oidc-design.md` and plan `docs/superpowers/plans/2026-04-18-multi-users-oidc.md`.

## Current Status

**Phase 0 (schema + dual-mode backend, no behavior change) — COMPLETE (11/11 tasks).**

Prod remains on `AUTH_MODE=local`; nothing visible to users changed. All plumbing is in place so Phase 1 is a config flip plus frontend work.

- Task 1 `2b16fff` — `AUTH_MODE` + `OIDC_*` settings
- Task 2 `e631015` — `User.oidc_iss`, `User.oidc_sub`, `TagShare` model
- Task 3 `1599c71` — Alembic migration `b1c2d3e4f5a6`
- Task 4 `bc1ef56` — Generic JWT/JWKS verifier in `backend/app/core/oidc.py`
- Task 5 `9e54207` + `797b8a8` — `visible_contact_ids` + `get_or_create_user_from_claims`
- Task 6 `3422d21` — Dual-mode `get_current_user` (local | oidc | both)
- Task 7 `76d861d` — `/api/v1/tag-shares` POST/GET/DELETE
- Task 8 `b10cfea` — Contact list/detail now use `visible_contact_ids`; detail returns 404 (not 403) when hidden
- Task 9 (7 commits, `4c26622` -> `834b326`) — Visibility applied to interactions, gifts, debts, life_events, addresses, contact_fields, custom field *values*, reminders. Definitions stay owner-only. Added `crud.contact_visible()` helper.
- Task 10 `cd36694` — Tests confirm groups/journal/tags remain owner-only.
- Task 11 `d17393b` — `AUTH_MODE=local` + all `OIDC_*` keys added to `.env` and re-encrypted into `.env.sops`. `VITE_AUTH_MODE` / `VITE_CF_LOGOUT_URL` wired as build args in `compose.yml` (`ARG`/`ENV` added to `frontend/Dockerfile`) and runtime env in `compose.dev.yml`.

**Test state (last full run, Python 3.12, dedicated test Postgres):** 89 passed, 2 failed. Both failures are **pre-existing and unrelated** to the OIDC work:
- `test_login.py::test_recovery_password` — SMTP not configured in dev
- `test_private.py::test_create_user` — `ENVIRONMENT=production` disables `/api/v1/private`

## Next Steps

Phase 1 (Cloudflare Access app setup + minimal frontend):

1. **Task 12 (human-only checklist)** — In Cloudflare Zero Trust dashboard, create an Access Application for `kindred.${DOMAIN}`:
   - Type: Self-hosted; session 24h
   - Policy: Include -> Emails -> superuser + wife
   - Record the Application AUD -> `OIDC_AUDIENCE`
   - Team domain -> `OIDC_ISSUER_URL` (`https://<team>.cloudflareaccess.com`)
   - `OIDC_JWKS_URL = ${OIDC_ISSUER_URL}/cdn-cgi/access/certs`
   - Populate these in `.env` and re-encrypt `.env.sops` (same sops invocation used in Task 11, see "Key Context" below).
2. **Task 13** — Frontend: add `frontend/src/auth.ts` with `getIdentity()` (calls `/api/v1/users/me`) and `logout()` (redirect to `VITE_CF_LOGOUT_URL`). No `oidc-client-ts`.
3. **Task 14** — Frontend: adapt login page to skip the local form when `VITE_AUTH_MODE=oidc`; ensure API client sends cookies (`credentials: 'include'`) rather than relying on `Authorization: Bearer` for the CF path.
4. **Task 15** — Dev-side OIDC smoke: run through `cloudflared` with a dev policy allowing localhost, log in via CF, confirm JIT provisioning inserts a `User` row, superuser's existing row merges on email (Task 5's merge path).

Then Phase 2 (prod dual-mode rollout), Phase 3 (flip to `AUTH_MODE=oidc`), Phase 4 (delete local auth + `hashed_password` column).

## Key Context

### Security hook false-positive (important operational note)

The `security-guidance` plugin hook blocks the **first** Edit/Write to any new file whose content contains the substring (child_process dot) exec with an open paren — it's scanning for JS `child_process.exec`. Python's `session.exec(...)` trips it. Workaround: on first block, repeat the identical Edit — the hook state-file whitelists `{file_path}-child_process_exec` after the initial warning, so the retry passes. Consider updating `~/.claude/plugins/cache/claude-plugins-official/security-guidance/unknown/hooks/security_reminder_hook.py` to exclude `.py` files from that rule.

### SOPS workflow used in Task 11

The project uses `unencrypted_suffix = _unencrypted` (not the default). To re-encrypt after editing `.env`:

```bash
RECIPIENT=$(grep '^sops_age__list_0__map_recipient=' .env.sops | cut -d= -f2-)
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
  sops --encrypt --input-type dotenv --output-type dotenv \
       --unencrypted-suffix _unencrypted --age "$RECIPIENT" .env > .env.sops
```

Round-trip verified with `sops --decrypt` against the committed `.env.sops`.

### Test environment

- Tests require Postgres 18 with the migration at head. The running `crm-db` container is a **different (older) deployment** you shouldn't touch; during this session I used a dedicated `crm-test-db` on port 55433 with `POSTGRES_PASSWORD=test`.
- Spin up + migrate:
  ```bash
  docker run -d --name crm-test-db -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=test -e POSTGRES_DB=crm -p 55433:5432 postgres:18
  cd backend && set -a && source ../.env && set +a
  POSTGRES_SERVER=127.0.0.1 POSTGRES_PORT=55433 POSTGRES_PASSWORD=test \
    SECRET_KEY=test-secret FIRST_SUPERUSER_PASSWORD=ChangeThis123! \
    uv run alembic upgrade head
  ```
- Run tests: same env, `uv run pytest -q`.

### Design decisions worth re-reading

- Sharing unit is **tags** only — groups stay private, journal never shares.
- Share grants **read + write**. No mode column (YAGNI).
- Identity keyed on `(oidc_iss, oidc_sub)`, not email (email is mutable).
- Phase 1 identity merge: if a local `User` with matching `email` has `oidc_sub IS NULL`, populate `oidc_iss/oidc_sub` instead of INSERT. This path drops out in Phase 4.
- Contact update/delete endpoints still check `owner_id` only — Task 8 only changed list/detail. Write-access-via-share is an explicit follow-up (not blocking Phase 1).

### Settings schema gotcha

`OIDC_TOKEN_SOURCE` is in the design spec but was **not added** to `Settings` in Task 1. The dual-mode dispatcher (Task 6) reads the CF header then falls back to the cookie unconditionally, so the env var is unused. Left out of `.env` on purpose; add it back if/when `Settings` grows the field.

## Files Touched (this session)

Backend code:
- `backend/app/api/routes/tag_shares.py` (new)
- `backend/app/api/main.py` (register tag-shares router)
- `backend/app/api/routes/contacts.py`
- `backend/app/api/routes/interactions.py`
- `backend/app/api/routes/gifts.py`
- `backend/app/api/routes/debts.py`
- `backend/app/api/routes/life_events.py`
- `backend/app/api/routes/addresses.py`
- `backend/app/api/routes/contact_fields.py`
- `backend/app/api/routes/custom_fields.py`
- `backend/app/api/routes/reminders.py`
- `backend/app/crud.py` (added `contact_visible()` helper)

Backend tests:
- `backend/tests/api/routes/test_tag_shares.py` (new)
- `backend/tests/api/routes/test_contacts.py` (isolation + shared-tag tests)
- `backend/tests/api/routes/test_interactions.py` (isolation + shared-tag tests)
- `backend/tests/api/routes/test_owner_only.py` (new — groups/journal/tags)

Config:
- `.env` (new OIDC keys — not tracked in git)
- `.env.sops` (re-encrypted)
- `compose.yml`, `compose.dev.yml`
- `frontend/Dockerfile` (ARG/ENV for VITE_AUTH_MODE + VITE_CF_LOGOUT_URL)

## Blockers

None. Phase 1 Task 12 needs browser access to the Cloudflare Zero Trust dashboard — pure human step.
