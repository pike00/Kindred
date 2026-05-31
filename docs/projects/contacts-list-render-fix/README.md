---
title: Contacts List Render Crash (prod)
status: active
repos: [personal-crm]
started: 2026-05-31
last_updated: 2026-05-31
next_step: Reproduce /contacts on the dev stack (current main) — if it does NOT crash, this is a stale-prod-build issue → cut a release + redeploy; if it DOES crash, capture the unguarded field from source-mapped stack
---

# Contacts List Render Crash (prod)

## Goal
`/contacts` hard-errors on **production** (`kindred.khanpikehome.com`, image `v0.2.84`) with `TypeError: D.map is not a function`, tripping the route's error boundary so the whole page renders "Error". `.map is not a function` means some value the UI maps over is an object/undefined instead of an array — a response-shape or data-shape mismatch. Determine whether this is a live bug on main or a stale-build artifact, then fix or redeploy.

Flagged in the 0.2.x feature-verification pass; reproduced by the user with DevTools open (minified prod bundle `index-Cwwo8U8Q.js`).

## Tasks
- [ ] Reproduce on the dev stack against **current main** (`just dev` → open `/contacts`). This is the deciding test.
- [ ] If it does **not** reproduce on main → root cause is **prod is 6 commits behind** (`v0.2.84` vs `v0.2.84-6-gcd73770`); fix = cut a release and redeploy (`just release` → `just bump`). Verify the new prod build no longer crashes.
- [ ] If it **does** reproduce → get a source-mapped stack (dev build is unminified) to identify which `.map` receives a non-array, add the missing array guard / fix the response shape, regen the client if a schema changed (`just regen-client`).
- [ ] Confirm the fix with a real check: load `/contacts` and assert no console error + rows render.

## Session Log

### 2026-05-31
- Project created from the 0.2.x feature-verification pass. User confirmed the crash on prod with a screenshot (two identical `D.map is not a function` errors in the console; page body shows "Error").
- Read-only investigation of **main**: `frontend/src/components/Contacts/ContactsList.tsx` guards the list with `const allContacts = useMemo(() => data?.data ?? [], [data?.data])` (line ~250) and every `.map` operates on a guarded array (`tags ?? []`, `paged`, static option arrays). The backend `list_contacts` returns the correct `ContactsPublic { data: [...], count }` envelope. The working tree is **clean** (no uncommitted changes to `contacts.py` / `models.py` / the generated client — the session-start git snapshot was stale).
- Therefore the **leading hypothesis is a stale prod build**: prod runs `v0.2.84`; main is `+6` commits, including `7847a54 fix: repair global search and remove duplicate contact header buttons` (the search repair is plausibly related to a list-render regression). Must reproduce on dev to confirm before claiming a code fix.
- Caveat: `data?.data ?? []` does **not** protect against `data.data` being a non-null *object*; if some endpoint returns an object where an array is expected, the guard wouldn't help. Keep this in mind if it reproduces on main.

## Notes
- This bug and the `/contacts/map` 422 (`map-view-contacts`) both surfaced on prod and may share the "prod is behind main" root cause — a redeploy could clear several verification flags at once. Verify, don't assume.
- Stray file observed: `frontend/src/components/Contacts/ContactsList.tsx.backup` — unrelated, but worth deleting during cleanup.
- Prod image tag is pinned in `~/Documents/Homelab/apps/kindred/.env` (`IMAGE_TAG=v0.2.84`); homelab compose uses `${IMAGE_TAG:?}` so every deploy is explicit.
