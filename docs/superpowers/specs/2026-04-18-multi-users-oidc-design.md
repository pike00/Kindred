# Multi-User Personal-CRM with Cloudflare Zero Trust

**Status:** Design — revised 2026-04-18 after Zitadel → Cloudflare Access pivot
**Date:** 2026-04-18
**Origin:** User scratch notes at `docs/superpowers/specs/multi-users` ("Husband/Wife — share all contacts / share by groups / share by tag")
**Supersedes:** Single-user password-login model in current codebase

## 1. Goal

Turn personal-crm from a single-superuser app into a small household CRM (2–5 users) where:

1. Users authenticate at the edge via **Cloudflare Access (Zero Trust)**; the app verifies CF's signed JWT on every request. The verifier is written as a generic JWT-over-JWKS module so swapping CF Access for another JWT-issuing IdP later is config-only.
2. Data is private to each user by default.
3. Users share data by marking **tags** as shared with specific household members (read + write).
4. Permissions are decided entirely at the app level — the IdP is treated as a black-box authenticator, not a source of authorization policy.

Non-goals: multi-tenancy (households as isolated silos), in-app invitations, SCIM provisioning, fine-grained per-row ACLs, sharing by group or by individual contact.

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| IdP stack | Cloudflare Access (already in front of the homelab); code remains provider-generic JWT+JWKS | Leverages existing CF Zero Trust footprint; no new IdP to run; zero-cost up to 50 users |
| Protocol | JWT (RS256) over JWKS, delivered via `Cf-Access-Jwt-Assertion` request header (also `CF_Authorization` cookie) | Cloudflare-specific delivery; verification semantics are pure JWT/JWKS |
| Authn surface | Single `get_current_user` FastAPI dependency | Minimizes token-parsing surface |
| Authz model | App-level only; `visible_filter(user)` on every query | Portable; does not depend on IdP role features |
| Sharing unit | **Tags** | User preference; unifies "groups" and "tags" concerns |
| Share permission | **Read + write** (no mode column) | Household use case; YAGNI on per-share mode toggle |
| User scale | 2–5, manually provisioned in the IdP | No in-app invite flow |
| Groups | Remain as private personal organization; never shared | Scope contained |
| Existing data | Stays owned by current superuser; wife starts empty; sharing happens post-migration via tagging | Safest one-time migration; no data-shuffle risk |
| Local auth | Dual-mode (`AUTH_MODE=local\|oidc\|both`) during migration; local removed once OIDC is verified in prod | Keeps E2E green; safe cutover |
| User provisioning | JIT on first successful OIDC login, keyed by `(iss, sub)` | Standard pattern; survives email changes |

## 3. Architecture

```
  Browser ─────────▶ Cloudflare Edge ───────▶ crm.${DOMAIN}  (Traefik → frontend)
                    (Access policy:            │
                     login with Google/        │  every subsequent request carries
                     email OTP/etc.)           ▼  Cf-Access-Jwt-Assertion: <JWT>
                                              ┌──────────────┐
                                              │  React SPA   │
                                              │  (frontend)  │   no login page;
                                              └──────┬───────┘   fetch("/api/…")
                                                     │
                                                     ▼
                                              ┌──────────────┐
                                              │ FastAPI API  │  verify CF JWT
                                              │   (backend)  │  → map (iss,sub) → User row
                                              │              │  → visible_filter(user)
                                              └──────┬───────┘
                                                     ▼
                                              ┌──────────────┐
                                              │  Postgres    │
                                              └──────────────┘
```

Three pieces:

1. **Cloudflare Access (edge IdP):** an Access Application scoped to `crm.${DOMAIN}` with an email-allowlist policy (you + wife). CF handles the full login dance (Google / email OTP / whatever IdP you federate) before any request reaches Traefik. Every request CF proxies onward carries `Cf-Access-Jwt-Assertion: <JWT>` and a `CF_Authorization` cookie. The JWT is signed by CF with a key fetched from `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`.
2. **Frontend (React + Vite):** does nothing OIDC-specific. No login page (CF edge handles it). No PKCE library. No access-token storage. Just makes fetch calls to `/api/*` — CF headers ride along automatically. A tiny `auth.ts` helper provides `getIdentity()` (calls `/api/v1/users/me`) and `logout()` (redirect to CF's logout URL).
3. **Backend (FastAPI):** reads `Cf-Access-Jwt-Assertion` (header) or `CF_Authorization` (cookie fallback), verifies signature + `iss` + `aud` + `exp` against CF's cached JWKS, JIT-creates `User` rows keyed by `(iss, sub)`, and applies `visible_contact_ids(user)` to every list/detail query.

The backend's verifier is written as a generic JWT-over-JWKS module. Swapping CF Access for any other JWT-issuing gateway (Authelia OIDC, Pomerium, Auth0, …) is a config-only change.

### 3.1 Env contract

```
OIDC_ISSUER_URL       # https://<team>.cloudflareaccess.com
OIDC_AUDIENCE         # CF Access Application AUD (hex string from Zero Trust dashboard)
OIDC_JIT_ACTIVE       # true: auto-admit new CF-authenticated users; false: require superuser approval
AUTH_MODE             # local | oidc | both
OIDC_TOKEN_SOURCE     # header=Cf-Access-Jwt-Assertion (default) | cookie=CF_Authorization
```

No `CLOUDFLARE_*` variables — the code path is provider-generic. `OIDC_CLIENT_ID_SPA` (added in Task 1) is unused for CF Access and can stay empty; kept in the schema because another IdP might need it later.

### 3.2 Token model

CF Access issues a single JWT per authenticated browser session and attaches it to every proxied request. The JWT contains:

- `iss` — `https://<team>.cloudflareaccess.com`
- `aud` — Application AUD (one per CF Access Application)
- `sub` — stable CF identity ID (different per user, opaque to us)
- `email` — user's email
- `identity_nonce` — rotates on token refresh
- `iat`, `exp` — standard

The backend verifies this JWT on every request. There is **no refresh-token flow in the app** — CF handles renewal transparently at the edge. The token lives in `CF_Authorization` (cookie) and is re-injected as `Cf-Access-Jwt-Assertion` (header) for proxied requests.

Local dev: without CF in front, no header is injected. The app supports this via `AUTH_MODE=local` (existing password login) until Phase 4 removes local auth. For CI (Phase 3), we mint a fake CF-shaped JWT with a test JWKS, set the `Cf-Access-Jwt-Assertion` header on each test request, and configure `OIDC_ISSUER_URL` to the mock server.

## 4. Data model

### 4.1 User additions

```python
class User(UserBase, table=True):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    is_active: bool = True
    is_superuser: bool = False
    hashed_password: str | None        # CHANGED: nullable; removed in Phase 4
    oidc_iss: str | None = Field(      # NEW
        default=None, index=True, max_length=512
    )
    oidc_sub: str | None = Field(      # NEW
        default=None, index=True, max_length=255
    )
    created_at: datetime

    __table_args__ = (
        UniqueConstraint("oidc_iss", "oidc_sub", name="uq_user_oidc_identity"),
    )
```

Rationale for `(iss, sub)` rather than `email`:
- `sub` is immutable at the IdP; `email` is mutable.
- Supports federating multiple issuers in the future without collisions.

### 4.2 TagShare (new)

```python
class TagShare(SQLModel, table=True):
    tag_id: uuid.UUID = Field(
        foreign_key="tag.id", primary_key=True, ondelete="CASCADE"
    )
    grantee_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    created_at: datetime = Field(default_factory=get_datetime_utc)
```

Presence of a `(tag_id, grantee_id)` row = grantee has **read + write** access to every resource bearing that tag. No mode column (YAGNI).

Unshare = DELETE row. Deleting the tag cascades and removes the share.

### 4.3 No change to other tables

All existing tables retain `owner_id: uuid.UUID FK user.id`. No migration of existing rows.

## 5. Permission model

### 5.1 Visibility predicate

For any resource `r` owned via `owner_id` and associated with a set of tags (directly or via parent contact):

```
visible_to(user, r) :=
    r.owner_id == user.id
    OR EXISTS (
        SELECT 1
        FROM tag t
        JOIN contact_tag ct ON ct.tag_id = t.id
        JOIN tagshare ts ON ts.tag_id = t.id
        WHERE ct.contact_id = <r's parent contact>
          AND ts.grantee_id = user.id
    )
```

Write access = same predicate (read+write shares).

### 5.2 Resource coverage

| Resource | Parent contact | Visibility rule |
|---|---|---|
| Contact | itself | `owner OR tag shared to user` |
| Interaction | FK contact | contact rule |
| Gift | FK contact | contact rule |
| Debt | FK contact | contact rule |
| LifeEvent | FK contact | contact rule |
| Address | FK contact | contact rule |
| ContactField | FK contact | contact rule |
| CustomField | FK contact | contact rule |
| Journal entry | none (schema has no FK) | owner-only, never shareable |
| Reminder | FK contact | contact rule |
| Group | n/a (user-private) | owner-only (groups never shared) |
| Tag | n/a | owner-only read; shares managed by owner only |

### 5.3 Implementation shape

```python
# backend/app/crud.py (new helper)
def visible_filter(user: User) -> ColumnElement[bool]:
    """SQLAlchemy clause usable in any Contact (or joined) query."""
    shared_contact_ids = (
        select(ContactTag.contact_id)
        .join(TagShare, TagShare.tag_id == ContactTag.tag_id)
        .where(TagShare.grantee_id == user.id)
    )
    return or_(
        Contact.owner_id == user.id,
        Contact.id.in_(shared_contact_ids),
    )
```

Every list/detail endpoint on a contact-owned resource joins to Contact and applies `visible_filter(user)`. For resources without a direct Contact join, the query adds it.

### 5.4 What OIDC does NOT decide

- Whether a user is "household member" — implicit from presence in the `User` table + `is_active=true`
- Any role/scope/group logic — not read from the token
- Per-resource access — entirely the `visible_filter` rule

A new Zitadel user who has never logged in cannot access anything until they authenticate once (JIT provisioning) and you as superuser either share tags with them or leave them with an empty private silo.

### 5.5 Admission control

Two modes, picked per env:

- **Auto-admit (default for personal tenant):** any valid OIDC token → JIT `User(is_active=true)` with zero data visible (empty silo).
- **Approval-required:** JIT `User(is_active=false)`; superuser flips `is_active` in UI. Useful if the IdP tenant ever contains users not meant to access this app.

Controlled by `OIDC_JIT_ACTIVE=true|false` (default `true`).

## 6. Auth flow

### 6.1 Login (browser)

1. User hits `https://crm.${DOMAIN}`.
2. Cloudflare edge intercepts. If no valid `CF_Authorization` cookie, CF renders its own login page (per the Access policy — Google, email OTP, whatever IdP you federate).
3. User authenticates at CF.
4. CF sets `CF_Authorization` cookie, redirects back to `https://crm.${DOMAIN}`, and forwards the request onward to Traefik.
5. SPA HTML loads. No client-side login work in the app.

### 6.2 API call

1. SPA does `fetch("/api/v1/contacts")`. Browser auto-sends `CF_Authorization` cookie.
2. Cloudflare edge revalidates the cookie, injects `Cf-Access-Jwt-Assertion: <JWT>` header, proxies to Traefik → backend.
3. Backend `get_current_user` dependency:
   - Reads `Cf-Access-Jwt-Assertion` header (falls back to `CF_Authorization` cookie if header absent).
   - Decodes JWT header to get `kid`.
   - Looks up key in JWKS cache (TTL 1 h; refresh on `kid` miss).
   - Verifies `signature, iss, aud, exp`; tolerates 60 s clock skew.
   - Extracts `sub` and `email`.
   - `SELECT user WHERE oidc_iss=<iss> AND oidc_sub=<sub>`; if miss, INSERT (JIT).
   - Returns `User`.
4. Route handler calls CRUD functions that apply `visible_contact_ids(current_user)`.

### 6.3 Logout

Client-side: redirect browser to `https://<team>.cloudflareaccess.com/cdn-cgi/access/logout?returnTo=${returnUrl}`. CF clears its cookie; user must re-auth to reach the app again. The app has nothing to revoke — CF is the authority.

### 6.4 Dual-mode decision tree (`get_current_user`)

```
if AUTH_MODE == "local":
    verify as local HS256 JWT from Authorization: Bearer → existing code path
elif AUTH_MODE == "oidc":
    extract token from Cf-Access-Jwt-Assertion (or CF_Authorization cookie)
    verify as JWT via CF JWKS → new path
else:  # "both"
    try OIDC (CF header/cookie) path; on miss-or-failure, try local Bearer path
    emit structured log: which path succeeded
```

Local path stays 100% untouched until Phase 4.

### 6.5 First-time admission

CF Access's own policy is the first gate: only allowed emails can reach the app's login. The second gate is our JIT provisioning:

- `OIDC_JIT_ACTIVE=true` (default for personal tenant): any CF-authenticated request JIT-creates a `User(is_active=true)`. Safe because CF Access already restricted admission to your whitelist.
- `OIDC_JIT_ACTIVE=false`: JIT row created with `is_active=false`; superuser flips the flag. Use if you widen the CF policy and want an app-side second gate.

## 7. Migration strategy

### 7.1 Schema migration (Alembic)

```
Revision: multi_users_oidc
  + user.oidc_iss         VARCHAR(512) NULL, indexed
  + user.oidc_sub         VARCHAR(255) NULL, indexed
  ~ user.hashed_password  NOT NULL → NULL
  + uq_user_oidc_identity UNIQUE (oidc_iss, oidc_sub)
  + tagshare              (tag_id, grantee_id) PK, created_at, both FKs CASCADE
```

No data backfill — existing superuser row gets `oidc_iss=NULL, oidc_sub=NULL` and continues to log in via local mode until Phase 3.

### 7.2 Data semantics at migration time

- All existing rows remain owned by the current superuser.
- No tags are pre-shared.
- Wife's first OIDC login creates an empty `User` row; her list views return `[]` everywhere.
- Superuser then creates/reuses tags and shares them to populate wife's view incrementally.

## 8. Rollout phases

Each phase is independently deployable and testable.

### Phase 0 — Schema + dual-mode backend (no behavior change)

Merge target: `AUTH_MODE=local` in prod. Nothing visible changes; tests prove parity.

- Alembic migration lands.
- `backend/app/core/oidc.py`: `verify_oidc_token()`, JWKS cache.
- `backend/app/api/deps.py`: `get_current_user` learns the `both`/`oidc` branches (dead code in prod).
- `backend/app/crud.py`: `visible_filter(user)` helper + `get_or_create_user_from_claims()`.
- Every list/detail CRUD function refactored to apply `visible_filter`.
- `TagShare` model + `/api/v1/tag-shares` router (POST, DELETE, GET by tag) + tests.
- Frontend stays on local login; no UI change required here.
- Unit tests: JWKS verifier with stubbed JWKS, `visible_filter` with two-user fixtures.

**Exit criteria:** all existing tests pass; new tests pass; prod behavior unchanged.

### Phase 1 — CF Access app setup + minimal frontend

- In Cloudflare Zero Trust dashboard, create Access Application for `crm.${DOMAIN}`:
  - Type: Self-hosted
  - Session duration: 24 h (tune later)
  - Identity providers: your existing federation (Google / email OTP / ... — whatever the rest of the homelab uses)
  - Policy: Include → Emails → your email + wife's email
  - Record the Application AUD → `OIDC_AUDIENCE`
  - Team domain is the `https://<team>.cloudflareaccess.com` URL → `OIDC_ISSUER_URL`
- Frontend: add minimal `auth.ts` with `getIdentity()` and `logout()`. No `oidc-client-ts`. Delete the existing email+password login form (Phase 4 anyway; doing it here saves a frontend deploy).
- Dev env: `AUTH_MODE=both`. Local dev without CF in front uses local password login; to exercise the CF path locally, either (a) run through `cloudflared` with a dev CF Access policy allowing localhost, or (b) use the Phase 3 mock-JWT fixture for backend tests.
- Identity merge rule: if a `User` with `email == claim.email` exists and `oidc_sub IS NULL`, populate `oidc_iss/oidc_sub` rather than INSERT. One-time migration pattern; drops out in Phase 4.

**Exit criteria:** superuser can log in through CF Access in prod (no code-side login UI); local login still works for dev; all tests pass.

### Phase 2 — Prod dual-mode

- Deploy `AUTH_MODE=both` to prod with `OIDC_*` env set.
- Superuser logs in via OIDC in prod; identity merge runs.
- Wife logs in via OIDC in prod; new `User` row created (empty silo).
- Superuser tags and shares first batch of joint contacts; wife verifies visibility end-to-end.
- Monitor structured logs for `auth_path` distribution.

**Exit criteria:** both users have logged in via OIDC at least once; visibility and write-through work for shared tags.

### Phase 3 — Flip to OIDC-only

- `AUTH_MODE=oidc` in prod.
- Local login endpoints return 404 (feature-flagged off, not deleted yet).
- E2E tests rewritten against an OIDC-style access token (test fixture issues signed JWTs with a test JWKS).

**Exit criteria:** one week of prod traffic with zero local-path successes; no rollback needed.

### Phase 4 — Cleanup

- Drop `/login/access-token`, `/password-recovery/*`, `/reset-password/*` routes.
- Remove `hashed_password` column via Alembic (`DROP COLUMN`).
- Remove `pwdlib`, `verify_password`, `get_password_hash`, email password-reset utils.
- Remove `FIRST_SUPERUSER_PASSWORD` from `.env.sops`.
- Delete local-path branch from `get_current_user`; `AUTH_MODE` collapses to OIDC-only (the variable stays but only `oidc` is valid).

**Exit criteria:** auth code surface is single-path; dependency footprint shrinks.

## 9. Testing strategy

### 9.1 Backend unit

- **JWKS verifier:** stub `httpx_mock` to serve a fake JWKS backed by an in-test RS256 key. Generate tokens with claims (including CF-shaped `email`, `sub`, `iss=https://<team>.cloudflareaccess.com`); assert valid / expired / wrong-aud / wrong-iss / malformed / missing-kid outcomes. Test both header source (`Cf-Access-Jwt-Assertion`) and cookie source (`CF_Authorization`).
- **`visible_contact_ids`:** two-user fixture (alice, bob). Create contacts owned by each. Create tags, share a subset. Assert alice's list/detail returns only her owned + bob-shared-via-tag rows.
- **TagShare CRUD:** create, delete, cascade-on-tag-delete, idempotent upsert.
- **JIT provisioning:** token with new `(iss, sub)` → user created with claims; token with existing `(iss, sub)` → no insert; email-merge path (Phases 1–3 only) covered.

### 9.2 Integration

- **Dual-mode routing:** same test with `AUTH_MODE=local`, `oidc`, `both`; verify each accepts the right token type and rejects the wrong one.
- **Admission control:** `OIDC_JIT_ACTIVE=false` → user created with `is_active=false` → requests return 403 until superuser flips the flag.

### 9.3 E2E (Playwright)

- **Phase 0–2:** local-login E2E path retained.
- **Phase 3+:** replace with OIDC path using a stubbed IdP:
  - Option A — `mock-oidc-provider` container in compose's `e2e` profile, no dependency on Zitadel Cloud during CI.
  - Option B — dedicated Zitadel Cloud test project with service-account machine tokens.
  - **Recommendation:** Option A (CI isolation + speed); smoke test against real Zitadel Cloud runs only on manual trigger.

### 9.4 Manual smoke (release gate)

1. Incognito window → `https://crm.${DOMAIN}` → redirect to Zitadel → login → redirect back → contact list loads.
2. Tag a contact "joint"; share with wife; wife sees it.
3. Wife edits; superuser sees the edit.
4. Remove share; wife no longer sees it.

## 10. Security considerations

- **Token storage:** access + refresh tokens in memory only; `oidc-client-ts` configured with `WebStorageStateStore(new InMemoryWebStorage())`. XSS-resistant; survives page reload via silent renewal iframe against the IdP.
- **CSRF:** non-issue because we authenticate via bearer header, not cookie. No cookie auth for the API.
- **JWKS cache poisoning:** refresh-on-`kid`-miss is rate-limited (e.g. 1 req / 10 s) to avoid a DoS vector via invalid `kid` headers.
- **Clock skew:** ±60 s tolerance on `exp`/`nbf`/`iat`.
- **JWT `alg` confusion:** the *OIDC* verifier is pinned to algorithms advertised in JWKS; `none` is explicitly rejected; HS* is rejected (OIDC providers use RS/ES). The *local* HS256 verifier (`AUTH_MODE=local|both`) is a separate code path with its own `SECRET_KEY` — the two are never conflated, and Phase 4 removes the local path entirely.
- **Audience mismatch:** tokens issued for other clients (e.g. the SPA's ID token — `aud = client_id`) are rejected by the backend (`aud` must equal `OIDC_AUDIENCE`).
- **Break-glass:** during Phase 0–2, local superuser login is the break-glass. In Phase 4+, break-glass is "roll back the Phase 4 deploy" — noted and acceptable given the 2-user scale. An alternative (keep one local superuser forever) was considered and rejected as a permanent dual-path liability; if this turns out to matter operationally, it's a small post-Phase-4 change.
- **Secrets at rest:** `OIDC_*` config values live in `.env.sops`. No client secret for the SPA (PKCE). If a confidential client is ever added (e.g. for M2M), its secret goes in `.env.sops`.

## 11. Dependencies (out of scope here)

- **Homelab-wide IdP direction:** the Apr 17 Authelia+LLDAP plan is paused in favor of Zitadel Cloud for personal-crm specifically. Whether the rest of the homelab migrates to Zitadel Cloud, stays on the Authelia plan, or takes a third path is a **separate spec**. This spec proceeds without that decision.
- **Wife's Zitadel invite + onboarding:** human checklist in handoff, not code.

## 12. Open questions

None at time of writing. All load-bearing decisions are locked in Section 2.

## 13. Appendix — provider-swap test

After Phase 4 ships, a one-afternoon exercise to prove portability:

1. Spin up a disposable Keycloak or Authelia instance.
2. Change `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, `OIDC_CLIENT_ID_SPA` env values.
3. Register a matching client in the new IdP; create one user.
4. Log in; confirm JIT provisioning creates a new `User` row keyed by the new `(iss, sub)`.
5. Revert env.

If step 4 works without code changes, the OIDC-as-just-an-IdP promise is verified.
