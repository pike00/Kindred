# Multi-User Personal-CRM with Provider-Agnostic OIDC

**Status:** Design — awaiting user review
**Date:** 2026-04-18
**Origin:** User scratch notes at `docs/superpowers/specs/multi-users` ("Husband/Wife — share all contacts / share by groups / share by tag")
**Supersedes:** Single-user password-login model in current codebase

## 1. Goal

Turn personal-crm from a single-superuser app into a small household CRM (2–5 users) where:

1. Users authenticate via any OIDC-compliant identity provider (initial: Zitadel Cloud; swappable: Auth0, Authelia, Authentik, Keycloak, …).
2. Data is private to each user by default.
3. Users share data by marking **tags** as shared with specific household members (read + write).
4. Permissions are decided entirely at the app level — the IdP is treated as a black-box authenticator, not a source of authorization policy.

Non-goals: multi-tenancy (households as isolated silos), in-app invitations, SCIM provisioning, fine-grained per-row ACLs, sharing by group or by individual contact.

## 2. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| IdP stack | Zitadel Cloud (free tier) initially, code is OIDC-generic | 2–5 users inside free tier; no homelab ops burden; swappable later |
| Protocol | OpenID Connect (OIDC) on top of OAuth 2.0 | Universal; no provider SDK on backend |
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
┌──────────────┐     OIDC (authcode+PKCE)     ┌────────────────┐
│  React SPA   │ ───────────────────────────▶ │ Zitadel Cloud  │
│  (frontend)  │ ◀─────── id+access+refresh ──│  (initial IdP) │
└──────┬───────┘                              └────────────────┘
       │  Authorization: Bearer <access_token>        ▲
       ▼                                              │ JWKS fetch
┌──────────────┐                                      │
│ FastAPI API  │ ─────────────────────────────────────┘
│   (backend)  │   verify JWT  → map (iss,sub) → User row
│              │   apply visible_filter(user) on every query
└──────┬───────┘
       ▼
┌──────────────┐
│  Postgres    │   Users, Contacts, Tags, TagShare, …
└──────────────┘
```

Three pieces:

1. **Frontend (React + Vite):** uses `oidc-client-ts` for the auth-code+PKCE flow. Stores access token in memory; silently renews via refresh token. Attaches bearer to every `/api/*` call.
2. **Backend (FastAPI):** verifies access tokens locally against cached JWKS. JIT-creates `User` rows on first sight of a new `(iss, sub)`. Applies `visible_filter(user)` to every list/detail query.
3. **IdP (Zitadel Cloud initially):** issues tokens. Zero personal-crm code is provider-specific — swapping to Auth0 is three env-var changes + a test.

### 3.1 OIDC env contract (provider-neutral)

```
OIDC_ISSUER_URL       # e.g. https://<tenant>.zitadel.cloud
OIDC_AUDIENCE         # the API resource identifier
OIDC_CLIENT_ID_SPA    # public PKCE client for the frontend
AUTH_MODE             # local | oidc | both
```

No `ZITADEL_*` variables. No provider SDK.

### 3.2 Token model

- **ID token** — JWT, consumed by frontend for "who am I" state. Never sent to the API.
- **Access token** — JWT (Zitadel/Auth0/Keycloak) or opaque (Authelia default). Sent as `Authorization: Bearer`. Backend verifies locally if JWT, via `/userinfo` or introspection if opaque.
- **Refresh token** — opaque; lives in the frontend OIDC library's session store; used for silent renewal.

Personal-crm's initial provider (Zitadel Cloud) issues JWT access tokens, so the hot path is local verification. Opaque-token adapter is an implementation detail, documented but not built in v1.

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

1. User hits `/`. Frontend has no valid access token → redirect to `OIDC_ISSUER_URL/oauth/v2/authorize?...` with PKCE challenge.
2. IdP authenticates (password + TOTP / passkey, whatever the IdP enforces).
3. IdP redirects to `https://crm.${DOMAIN}/auth/callback?code=...&state=...`.
4. Frontend posts `code + code_verifier` to the IdP's token endpoint → gets `{id_token, access_token, refresh_token}`.
5. Frontend stores tokens in-memory (via `oidc-client-ts`), sets user state from ID token claims, redirects to originally-requested route.

### 6.2 API call

1. Frontend's axios interceptor attaches `Authorization: Bearer <access_token>`.
2. Backend `get_current_user` dependency:
   - Reads header.
   - Decodes JWT header to get `kid`.
   - Looks up key in JWKS cache (TTL 1h; refresh on `kid` miss).
   - Verifies `signature, iss, aud, exp, nbf`; tolerates 60 s clock skew.
   - Extracts `sub`.
   - `SELECT user WHERE oidc_iss=<iss> AND oidc_sub=<sub>`; if miss, INSERT with `email`/`name` from claims.
   - Returns `User`.
3. Route handler calls CRUD functions that apply `visible_filter(current_user)`.

### 6.3 Logout

Frontend clears its OIDC session and redirects to `OIDC_ISSUER_URL/oidc/v1/end_session`. The access token remains cryptographically valid until `exp` — we do not maintain a revocation list. Mitigation: short access-token TTL (15 min default); silent renewal via refresh token.

### 6.4 Dual-mode decision tree (`get_current_user`)

```
if AUTH_MODE == "local":
    verify as local HS256 JWT → existing code path
elif AUTH_MODE == "oidc":
    verify as OIDC JWT via JWKS → new path
else:  # "both"
    try OIDC path; on verify failure, try local path; 401 if both fail
    emit structured log: which path succeeded
```

Local path stays 100% untouched until Phase 4.

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

### Phase 1 — IdP tenant setup + dev-side OIDC

- Create Zitadel Cloud tenant; document tenant URL in handoff.
- Create Project `personal-crm`.
- Create SPA client (PKCE, redirect URIs: `http://localhost:5173/auth/callback`, `https://crm.${DOMAIN}/auth/callback`).
- Create API resource (audience identifier).
- Create user for superuser; create user for wife (invite by email).
- Frontend: add `oidc-client-ts`, login button, callback route, axios interceptor, logout.
- Dev env: `AUTH_MODE=both`, superuser logs in via OIDC at localhost, confirms JIT provisioning updates the existing superuser row (`SELECT ... WHERE email=<super>` on first OIDC login merges `oidc_sub` onto the existing row instead of creating a second).
- `SELECT ... WHERE email=<claim>` identity merge rule: if a `User` with matching email exists and has `oidc_sub IS NULL`, populate it rather than INSERT. This is a **one-time migration** pattern; after Phase 3 it's disabled.

**Exit criteria:** superuser can log in via OIDC in dev; local login still works; all tests pass.

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

- **JWKS verifier:** stub `httpx_mock` to serve a fake `/.well-known/openid-configuration` and JWKS backed by an in-test RS256 key. Generate tokens with claims; assert valid/expired/wrong-aud/wrong-iss outcomes.
- **`visible_filter`:** two-user fixture (alice, bob). Create contacts owned by each. Create tags, share a subset. Assert alice's list/detail returns only her owned + bob-shared-via-tag rows.
- **TagShare CRUD:** create, delete, cascade-on-tag-delete, idempotent upsert.
- **JIT provisioning:** token with new `(iss, sub)` → user created with claims; token with existing `(iss, sub)` → no insert; email-merge path (Phase 1–3 only) covered.

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
