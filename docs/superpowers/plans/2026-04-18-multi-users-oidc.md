# Multi-User Personal-CRM with Provider-Agnostic OIDC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a multi-user personal-crm where users authenticate via any OIDC-compliant IdP (initially Zitadel Cloud), data is private by default, and sharing is tag-based with read+write semantics.

**Architecture:** Single FastAPI dependency (`get_current_user`) dispatches by `AUTH_MODE=local|oidc|both`. OIDC tokens verified locally via `PyJWKClient` against the IdP's JWKS. JIT-created `User` rows keyed by `(oidc_iss, oidc_sub)`. Visibility enforced by a `visible_contact_ids(user)` subquery applied uniformly in every contact / contact-child list endpoint. Sharing modelled as `TagShare(tag_id, grantee_id)`.

**Tech Stack:** FastAPI, SQLModel, Alembic, pyjwt, httpx, React + Vite + `oidc-client-ts`, Zitadel Cloud as initial IdP.

**Spec:** [docs/superpowers/specs/2026-04-18-multi-users-oidc-design.md](../specs/2026-04-18-multi-users-oidc-design.md) — authoritative for rationale and edge cases; this plan is the mechanical execution.

> **Revision 2026-04-18 (after initial draft):** pivoted from Zitadel Cloud to **Cloudflare Access (Zero Trust)**. Impact is scoped: Tasks 2, 3, 5, 7–11 unchanged (model/visibility/CRUD/compose are IdP-agnostic). Task 4 (verifier), Task 6 (dispatch) adapt to read from `Cf-Access-Jwt-Assertion` header / `CF_Authorization` cookie and fetch JWKS directly from CF rather than via `.well-known/openid-configuration`. Tasks 12–14 are rewritten: Task 12 becomes CF Access Application setup; Task 13 collapses to a minimal `auth.ts` (no `oidc-client-ts`, no PKCE); Task 14 removes the login page and wires logout-to-CF. One new env var (`OIDC_JWKS_URL`) joins the ones added in Task 1.

---

## Phase 0 — Schema + dual-mode backend (no behavior change)

End state: `AUTH_MODE=local` in prod, all new code merged but inactive. Existing tests pass unchanged.

### Task 1: Add `AUTH_MODE` + OIDC settings

**Files:**
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Add settings fields**

Append to the `Settings` class in `backend/app/core/config.py`, just before `settings = Settings()`:

```python
    # OIDC / multi-user (Phase 0+)
    AUTH_MODE: Literal["local", "oidc", "both"] = "local"
    OIDC_ISSUER_URL: str = ""
    OIDC_AUDIENCE: str = ""
    OIDC_CLIENT_ID_SPA: str = ""
    OIDC_JIT_ACTIVE: bool = True

    @model_validator(mode="after")
    def _check_oidc_config(self) -> Self:
        if self.AUTH_MODE in ("oidc", "both") and not (
            self.OIDC_ISSUER_URL and self.OIDC_AUDIENCE
        ):
            raise ValueError(
                "AUTH_MODE=oidc or both requires OIDC_ISSUER_URL and OIDC_AUDIENCE"
            )
        return self
```

- [ ] **Step 2: Run existing tests (regression)**

Run `uv run pytest -q` from `backend/`. Expected: all existing tests pass.

- [ ] **Step 3: Commit**

`git commit` with message `feat(auth): add AUTH_MODE and OIDC_* settings (default local)`.

---

### Task 2: Add `oidc_iss`, `oidc_sub` to User and define `TagShare` model

**Files:**
- Modify: `backend/app/models.py`

- [ ] **Step 1: Extend `User` table class**

Replace the `User` table class (around line 52 in `backend/app/models.py`) with:

```python
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str | None = None  # nullable: OIDC users have no password
    oidc_iss: str | None = Field(default=None, max_length=512, index=True)
    oidc_sub: str | None = Field(default=None, max_length=255, index=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    __table_args__ = (
        sa.UniqueConstraint("oidc_iss", "oidc_sub", name="uq_user_oidc_identity"),
    )
```

- [ ] **Step 2: Add `TagShare` near the `ContactTag` block (~line 158)**

Immediately after the `ContactTag` class in `backend/app/models.py`, add:

```python
# ─── TagShare (grant access to rows bearing a tag) ───────────────────────────

class TagShare(SQLModel, table=True):
    __tablename__ = "tag_share"
    tag_id: uuid.UUID = Field(
        foreign_key="tag.id", primary_key=True, ondelete="CASCADE"
    )
    grantee_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    created_at: datetime = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class TagSharePublic(SQLModel):
    tag_id: uuid.UUID
    grantee_id: uuid.UUID
    grantee_email: str
    created_at: datetime


class TagSharesPublic(SQLModel):
    data: list[TagSharePublic]
    count: int
```

- [ ] **Step 3: Run mypy**

Run `uv run mypy app/models.py` from `backend/`. Expected: zero errors.

- [ ] **Step 4: Commit**

`git commit` message: `feat(auth): add oidc columns to User and TagShare model`.

---

### Task 3: Alembic migration for new columns + table

**Files:**
- Create: `backend/app/alembic/versions/YYYYYYYY_multi_users_oidc.py`

- [ ] **Step 1: Generate migration**

Run `uv run alembic revision --autogenerate -m "multi users oidc"` from `backend/`. A new file appears under `backend/app/alembic/versions/`.

- [ ] **Step 2: Verify autogenerate contents**

The `upgrade()` function should include:
- `op.add_column('user', sa.Column('oidc_iss', sa.String(length=512), nullable=True))`
- `op.add_column('user', sa.Column('oidc_sub', sa.String(length=255), nullable=True))`
- `op.create_index(...)` for both new columns
- `op.alter_column('user', 'hashed_password', existing_type=..., nullable=True)`
- `op.create_unique_constraint('uq_user_oidc_identity', 'user', ['oidc_iss', 'oidc_sub'])`
- `op.create_table('tag_share', ...)` with two FKs and timestamptz

If any of these are missing, add them manually. Remove any unrelated drops autogenerate adds.

- [ ] **Step 3: Apply migration**

Run `uv run alembic upgrade head` from `backend/`. Expected: `INFO  [alembic.runtime.migration] Running upgrade ... multi users oidc`.

- [ ] **Step 4: Verify schema**

Run this one-liner from `backend/`:

```bash
uv run python -c "from sqlalchemy import inspect; from app.core.db import engine; i=inspect(engine); assert 'oidc_iss' in {c['name'] for c in i.get_columns('user')}; assert 'tag_share' in i.get_table_names(); print('ok')"
```
Expected: `ok`.

- [ ] **Step 5: Test downgrade + upgrade cycle**

Run `uv run alembic downgrade -1 && uv run alembic upgrade head` from `backend/`. Both complete without error.

- [ ] **Step 6: Commit**

`git commit` message: `feat(auth): alembic migration for oidc columns and tag_share table`.

---

### Task 4: JWT + JWKS token verifier (`core/oidc.py`) — Cloudflare Access shaped

**Files:**
- Modify: `backend/app/core/config.py` (add `OIDC_JWKS_URL`)
- Create: `backend/app/core/oidc.py`
- Create: `backend/tests/core/__init__.py` and `backend/tests/core/test_oidc.py`

CF Access does not publish an OIDC discovery document at `.well-known/openid-configuration` for Access apps. It publishes a JWKS directly at `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`. The verifier therefore fetches JWKS from an explicit `OIDC_JWKS_URL` config value. That keeps the module provider-generic: any IdP whose JWKS URL you know will work.

- [ ] **Step 1: Add `OIDC_JWKS_URL` setting**

In `backend/app/core/config.py`, inside the `Settings` class add:

```python
    OIDC_JWKS_URL: str = ""
```

And extend the existing `_check_oidc_config` validator to also require `OIDC_JWKS_URL` when `AUTH_MODE` is `oidc` or `both`:

```python
    @model_validator(mode="after")
    def _check_oidc_config(self) -> Self:
        if self.AUTH_MODE in ("oidc", "both") and not (
            self.OIDC_ISSUER_URL and self.OIDC_AUDIENCE and self.OIDC_JWKS_URL
        ):
            raise ValueError(
                "AUTH_MODE=oidc or both requires OIDC_ISSUER_URL, OIDC_AUDIENCE, and OIDC_JWKS_URL"
            )
        return self
```

- [ ] **Step 2: Write failing test with a stubbed JWKS**

Create `backend/tests/core/test_oidc.py`:

```python
import base64
import time
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core import oidc


def _b64(n: int) -> str:
    b = n.to_bytes((n.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


@pytest.fixture
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _pem(key):
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()


def _jwks(key) -> dict:
    pn = key.public_key().public_numbers()
    return {"keys": [{"kty": "RSA", "kid": "test-key", "use": "sig",
                      "alg": "RS256", "n": _b64(pn.n), "e": _b64(pn.e)}]}


def _make_token(key, *, aud: str, iss: str, sub: str = "user-1",
                 email: str = "u@t.x", exp_offset: int = 300):
    now = int(time.time())
    return jwt.encode(
        {"sub": sub, "aud": aud, "iss": iss, "email": email,
         "iat": now, "exp": now + exp_offset},
        _pem(key), algorithm="RS256", headers={"kid": "test-key"},
    )


def _cf_env(monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL",
                        "https://team.cloudflareaccess.com")
    monkeypatch.setattr(oidc.settings, "OIDC_AUDIENCE", "aud-hash-123")
    monkeypatch.setattr(oidc.settings, "OIDC_JWKS_URL",
                        "https://team.cloudflareaccess.com/cdn-cgi/access/certs")


def test_verify_success(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="aud-hash-123",
                         iss="https://team.cloudflareaccess.com")
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        payload = oidc.verify_oidc_token(token)
    assert payload["sub"] == "user-1"
    assert payload["email"] == "u@t.x"


def test_wrong_audience(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="other-aud",
                         iss="https://team.cloudflareaccess.com")
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_wrong_issuer(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="aud-hash-123",
                         iss="https://attacker.example.com")
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_expired(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="aud-hash-123",
                         iss="https://team.cloudflareaccess.com", exp_offset=-60)
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_missing_kid(rsa_key, monkeypatch):
    _cf_env(monkeypatch)
    oidc._reset_cache_for_tests()
    token = jwt.encode(
        {"sub": "u", "aud": "aud-hash-123",
         "iss": "https://team.cloudflareaccess.com",
         "iat": int(time.time()), "exp": int(time.time()) + 300},
        _pem(rsa_key), algorithm="RS256",  # no kid in header
    )
    with patch("app.core.oidc._fetch_jwks", return_value=_jwks(rsa_key)):
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_not_configured(monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL", "")
    oidc._reset_cache_for_tests()
    with pytest.raises(oidc.OIDCError):
        oidc.verify_oidc_token("x.y.z")
```

Also `touch backend/tests/core/__init__.py`.

- [ ] **Step 3: Add dev dependency**

Run `uv add --dev cryptography` from `backend/`.

- [ ] **Step 4: Run test, expect ImportError**

Run `uv run pytest tests/core/test_oidc.py -q` from `backend/`. Expected: FAIL.

- [ ] **Step 5: Implement `backend/app/core/oidc.py`**

```python
"""JWT verification against a remote JWKS. Provider-agnostic by design.

Used here for Cloudflare Access JWT assertions but accepts any JWKS-backed
issuer (Authelia, Auth0, Keycloak, Zitadel, ...). No OIDC discovery step;
JWKS URL is supplied explicitly via OIDC_JWKS_URL.
"""
from __future__ import annotations

import time
from typing import Any

import httpx
import jwt

from app.core.config import settings


class OIDCError(Exception):
    """Raised when a token cannot be verified."""


_JWKS_TTL_SEC = 3600
_ALLOWED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"]
_LEEWAY_SEC = 60

_jwks_cache: tuple[float, dict[str, Any]] | None = None


def _reset_cache_for_tests() -> None:
    global _jwks_cache
    _jwks_cache = None


def _fetch_jwks(jwks_uri: str) -> dict[str, Any]:
    resp = httpx.get(jwks_uri, timeout=5.0)
    resp.raise_for_status()
    return resp.json()


def _get_jwks() -> dict[str, Any]:
    global _jwks_cache
    now = time.time()
    if _jwks_cache and (now - _jwks_cache[0]) < _JWKS_TTL_SEC:
        return _jwks_cache[1]
    jwks = _fetch_jwks(settings.OIDC_JWKS_URL)
    _jwks_cache = (now, jwks)
    return jwks


def _key_for_kid(jwks: dict[str, Any], kid: str) -> Any:
    for jwk in jwks.get("keys", []):
        if jwk.get("kid") == kid:
            return jwt.PyJWK(jwk).key
    raise OIDCError(f"Unknown kid: {kid}")


def verify_oidc_token(token: str) -> dict[str, Any]:
    """Verify token against configured issuer/audience. Returns decoded payload."""
    if not (settings.OIDC_ISSUER_URL and settings.OIDC_AUDIENCE
            and settings.OIDC_JWKS_URL):
        raise OIDCError("OIDC not configured")
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise OIDCError(f"Malformed JWT header: {e}") from e

    kid = header.get("kid")
    if not kid:
        raise OIDCError("Missing kid in JWT header")

    try:
        key = _key_for_kid(_get_jwks(), kid)
    except OIDCError:
        # refresh once on kid miss
        global _jwks_cache
        _jwks_cache = None
        key = _key_for_kid(_get_jwks(), kid)

    try:
        payload = jwt.decode(
            token, key,
            algorithms=_ALLOWED_ALGS,
            audience=settings.OIDC_AUDIENCE,
            issuer=settings.OIDC_ISSUER_URL.rstrip("/"),
            leeway=_LEEWAY_SEC,
        )
    except jwt.InvalidTokenError as e:
        raise OIDCError(f"Invalid token: {e}") from e

    if not payload.get("sub"):
        raise OIDCError("Missing sub claim")
    return payload
```

- [ ] **Step 6: Run tests, expect pass**

Run `uv run pytest tests/core/test_oidc.py -q` from `backend/`. Expected: 6 passed.

- [ ] **Step 7: Commit**

`git commit` message: `feat(auth): JWT+JWKS verifier (Cloudflare Access compatible)`.

---

### Task 5: `visible_contact_ids` helper + `get_or_create_user_from_claims`

**Files:**
- Modify: `backend/app/crud.py`
- Create: `backend/tests/crud/test_visibility.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/crud/test_visibility.py`:

```python
import uuid

import pytest
from sqlmodel import Session, select

from app import crud
from app.core.db import engine
from app.core.security import get_password_hash
from app.models import Contact, ContactTag, Tag, TagShare, User


@pytest.fixture
def two_users():
    with Session(engine) as s:
        alice = User(email=f"alice-{uuid.uuid4()}@t.x",
                     hashed_password=get_password_hash("x"))
        bob = User(email=f"bob-{uuid.uuid4()}@t.x",
                   hashed_password=get_password_hash("x"))
        s.add(alice); s.add(bob); s.commit(); s.refresh(alice); s.refresh(bob)
        yield alice, bob
        s.delete(alice); s.delete(bob); s.commit()


def test_own_contacts_visible(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        c = Contact(owner_id=alice.id, first_name="A")
        s.add(c); s.commit(); s.refresh(c)
        ids = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(alice)))).all())
        assert c.id in ids
        ids_bob = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(bob)))).all())
        assert c.id not in ids_bob
        s.delete(c); s.commit()


def test_tag_shared_contact_visible(two_users):
    alice, bob = two_users
    with Session(engine) as s:
        c = Contact(owner_id=alice.id, first_name="Shared")
        t = Tag(owner_id=alice.id, name="joint")
        s.add(c); s.add(t); s.commit(); s.refresh(c); s.refresh(t)
        s.add(ContactTag(contact_id=c.id, tag_id=t.id))
        s.add(TagShare(tag_id=t.id, grantee_id=bob.id))
        s.commit()
        ids_bob = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(bob)))).all())
        assert c.id in ids_bob
        share = s.get(TagShare, (t.id, bob.id))
        s.delete(share); s.commit()
        ids_bob = list(s.exec(select(Contact.id).where(
            Contact.id.in_(crud.visible_contact_ids(bob)))).all())
        assert c.id not in ids_bob
        s.delete(t); s.delete(c); s.commit()


def test_jit_user_creation():
    with Session(engine) as s:
        claims = {"iss": "https://issuer.test", "sub": "new-abc",
                  "email": f"new-{uuid.uuid4()}@t.x", "name": "New"}
        u1 = crud.get_or_create_user_from_claims(session=s, claims=claims)
        assert u1.oidc_sub == "new-abc"
        u2 = crud.get_or_create_user_from_claims(session=s, claims=claims)
        assert u1.id == u2.id
        s.delete(u1); s.commit()


def test_email_merge_existing_local_user():
    with Session(engine) as s:
        email = f"merge-{uuid.uuid4()}@t.x"
        local = User(email=email, hashed_password=get_password_hash("x"))
        s.add(local); s.commit(); s.refresh(local)
        claims = {"iss": "https://issuer.test", "sub": "merge-sub",
                  "email": email, "name": "Merged"}
        u = crud.get_or_create_user_from_claims(session=s, claims=claims)
        s.refresh(u)
        assert u.id == local.id
        assert u.oidc_sub == "merge-sub"
        s.delete(u); s.commit()
```

- [ ] **Step 2: Run tests, expect AttributeError**

Run `uv run pytest tests/crud/test_visibility.py -q` from `backend/`. Expected: FAIL.

- [ ] **Step 3: Add helpers to `backend/app/crud.py`**

Append to `backend/app/crud.py`:

```python
from sqlalchemy import union
from sqlmodel import Select, select

from app.models import Contact, ContactTag, TagShare, User


def visible_contact_ids(user: User) -> Select:
    """Subquery: contact IDs visible to user (owned OR tag-shared)."""
    owned = select(Contact.id).where(Contact.owner_id == user.id)
    shared = (
        select(ContactTag.contact_id)
        .join(TagShare, TagShare.tag_id == ContactTag.tag_id)
        .where(TagShare.grantee_id == user.id)
    )
    return union(owned, shared)


def get_or_create_user_from_claims(
    *, session: Session, claims: dict[str, object]
) -> User:
    """Resolve (iss, sub) to a User row; JIT-create on first sight.

    During Phase 1-3 migration, merge onto an existing local User matching
    `email` if `oidc_sub` is still NULL. After Phase 4 this branch is moot.
    """
    iss = str(claims["iss"])
    sub = str(claims["sub"])
    email = str(claims.get("email", "")) or None

    existing = session.exec(
        select(User).where(User.oidc_iss == iss, User.oidc_sub == sub)
    ).first()
    if existing:
        return existing

    if email:
        merge = session.exec(
            select(User).where(User.email == email, User.oidc_sub.is_(None))  # type: ignore[attr-defined]
        ).first()
        if merge:
            merge.oidc_iss = iss
            merge.oidc_sub = sub
            session.add(merge)
            session.commit()
            session.refresh(merge)
            return merge

    from app.core.config import settings

    new_user = User(
        email=email or f"{sub}@oidc.invalid",
        full_name=str(claims.get("name", "")) or None,
        is_active=settings.OIDC_JIT_ACTIVE,
        is_superuser=False,
        oidc_iss=iss,
        oidc_sub=sub,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user
```

- [ ] **Step 4: Run tests, expect pass**

Run `uv run pytest tests/crud/test_visibility.py -q` from `backend/`. Expected: 4 passed.

- [ ] **Step 5: Commit**

`git commit` message: `feat(auth): add visible_contact_ids and JIT user provisioning`.

---

### Task 6: Extend `get_current_user` with dual-mode dispatch

**Files:**
- Modify: `backend/app/api/deps.py`
- Create: `backend/tests/api/test_deps_auth_mode.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/api/test_deps_auth_mode.py`:

```python
from unittest.mock import patch

import pytest
from sqlmodel import Session

from app.api import deps
from app.core import oidc
from app.core.db import engine


@pytest.fixture
def session():
    with Session(engine) as s:
        yield s


def test_oidc_mode_uses_verifier(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "oidc")
    monkeypatch.setattr("app.core.config.settings.OIDC_ISSUER_URL", "https://t.x")
    monkeypatch.setattr("app.core.config.settings.OIDC_AUDIENCE", "crm-api")

    with patch("app.core.oidc.verify_oidc_token") as v, \
         patch("app.crud.get_or_create_user_from_claims") as p:
        v.return_value = {"iss": "https://t.x", "sub": "s",
                           "email": "oidc@t.x"}
        p.return_value = type("U", (), {"is_active": True, "id": "x"})()
        user = deps.get_current_user(session=session, token="fake.jwt.token")
    assert user.is_active


def test_both_mode_falls_back_to_local(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "both")
    monkeypatch.setattr("app.core.config.settings.OIDC_ISSUER_URL", "https://t.x")
    monkeypatch.setattr("app.core.config.settings.OIDC_AUDIENCE", "crm-api")

    def _raise(_):
        raise oidc.OIDCError("nope")

    with patch("app.core.oidc.verify_oidc_token", side_effect=_raise), \
         patch("app.api.deps._get_current_user_local") as local:
        local.return_value = "local-user"
        user = deps.get_current_user(session=session, token="fake.jwt.token")
    assert user == "local-user"


def test_local_mode_ignores_oidc(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "local")
    with patch("app.api.deps._get_current_user_local") as local:
        local.return_value = "local-user"
        user = deps.get_current_user(session=session, token="any")
    assert user == "local-user"
```

- [ ] **Step 2: Run tests, expect failure**

Run `uv run pytest tests/api/test_deps_auth_mode.py -q` from `backend/`. Expected: FAIL.

- [ ] **Step 3: Rewrite `backend/app/api/deps.py`**

The OIDC path reads the CF-shaped JWT from the `Cf-Access-Jwt-Assertion` header (primary) or `CF_Authorization` cookie (fallback). The local path keeps reading `Authorization: Bearer`. Replace the whole file:

```python
from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app import crud
from app.core import oidc, security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User


CF_ACCESS_HEADER = "Cf-Access-Jwt-Assertion"
CF_ACCESS_COOKIE = "CF_Authorization"


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
LocalTokenDep = Annotated[str | None, Depends(reusable_oauth2)]


def _extract_cf_token(request: Request) -> str | None:
    """Read the CF Access JWT from the header (preferred) or cookie."""
    header = request.headers.get(CF_ACCESS_HEADER)
    if header:
        return header
    cookie = request.cookies.get(CF_ACCESS_COOKIE)
    if cookie:
        return cookie
    return None


def _get_current_user_local(session: Session, token: str) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def _get_current_user_oidc(session: Session, token: str) -> User:
    try:
        claims = oidc.verify_oidc_token(token)
    except oidc.OIDCError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OIDC token invalid: {e}",
        )
    user = crud.get_or_create_user_from_claims(session=session, claims=claims)
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User not active")
    return user


def get_current_user(
    request: Request,
    session: SessionDep,
    local_token: LocalTokenDep,
) -> User:
    mode = settings.AUTH_MODE
    cf_token = _extract_cf_token(request)

    if mode == "local":
        if not local_token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return _get_current_user_local(session, local_token)

    if mode == "oidc":
        if not cf_token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return _get_current_user_oidc(session, cf_token)

    # both: prefer OIDC (CF), fall back to local Bearer
    if cf_token:
        try:
            return _get_current_user_oidc(session, cf_token)
        except HTTPException:
            pass  # fall through to local
    if local_token:
        return _get_current_user_local(session, local_token)
    raise HTTPException(status_code=401, detail="Not authenticated")


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
```

Also update the Step 1 test file — its signatures call `deps.get_current_user(session=session, token="...")`. The new signature is `(request, session, local_token)`. The tests need a fake `Request`. Use `fastapi.Request` or the helper from `starlette.testclient`. Recommended replacement for the test body:

```python
from starlette.requests import Request as StarletteRequest

def _fake_request(*, header: str | None = None, cookie: str | None = None):
    scope = {
        "type": "http",
        "headers": ([(b"cf-access-jwt-assertion", header.encode())] if header else []),
        "path": "/", "method": "GET", "query_string": b"", "raw_path": b"/",
        "client": ("test", 0),
    }
    req = StarletteRequest(scope)
    if cookie:
        req.cookies.setdefault("CF_Authorization", cookie)  # type: ignore[attr-defined]
    return req


def test_oidc_mode_uses_verifier(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "oidc")
    with patch("app.core.oidc.verify_oidc_token") as v, \
         patch("app.crud.get_or_create_user_from_claims") as p:
        v.return_value = {"iss": "https://team.cloudflareaccess.com",
                           "sub": "s", "email": "oidc@t.x"}
        p.return_value = type("U", (), {"is_active": True, "id": "x"})()
        user = deps.get_current_user(
            request=_fake_request(header="fake.jwt.token"),
            session=session,
            local_token=None,
        )
    assert user.is_active


def test_both_mode_uses_cf_then_falls_back_to_local(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "both")
    def _raise(_):
        raise oidc.OIDCError("nope")
    with patch("app.core.oidc.verify_oidc_token", side_effect=_raise), \
         patch("app.api.deps._get_current_user_local") as local:
        local.return_value = "local-user"
        user = deps.get_current_user(
            request=_fake_request(header="bad.cf.jwt"),
            session=session, local_token="local.bearer",
        )
    assert user == "local-user"


def test_local_mode_ignores_cf_header(monkeypatch, session):
    monkeypatch.setattr("app.core.config.settings.AUTH_MODE", "local")
    with patch("app.api.deps._get_current_user_local") as local:
        local.return_value = "local-user"
        user = deps.get_current_user(
            request=_fake_request(header="cf.jwt.should.be.ignored"),
            session=session, local_token="local.bearer",
        )
    assert user == "local-user"
```

- [ ] **Step 4: Run full test suite**

Run `uv run pytest -q` from `backend/`. Expected: new tests pass; existing tests still green because `AUTH_MODE=local` default preserves behavior.

- [ ] **Step 5: Commit**

`git commit` message: `feat(auth): dual-mode get_current_user dispatching by AUTH_MODE`.

---

### Task 7: TagShare CRUD router

**Files:**
- Create: `backend/app/api/routes/tag_shares.py`
- Modify: `backend/app/api/main.py`
- Create: `backend/tests/api/routes/test_tag_shares.py`

- [ ] **Step 1: Write failing API tests**

Create `backend/tests/api/routes/test_tag_shares.py`:

```python
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.user import create_random_user, authentication_token_from_email


def _make_tag(client, headers, name="t"):
    r = client.post(
        f"{settings.API_V1_STR}/tags/", headers=headers, json={"name": name}
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_share_and_unshare(client: TestClient, db: Session):
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    tag = _make_tag(client, alice_h, "shared-tag")

    r = client.post(f"{settings.API_V1_STR}/tag-shares/",
                    headers=alice_h,
                    json={"tag_id": tag["id"], "grantee_id": str(bob.id)})
    assert r.status_code == 200, r.text

    r = client.get(f"{settings.API_V1_STR}/tag-shares/?tag_id={tag['id']}",
                   headers=alice_h)
    assert r.status_code == 200
    assert r.json()["count"] == 1

    r = client.delete(
        f"{settings.API_V1_STR}/tag-shares/{tag['id']}/{bob.id}",
        headers=alice_h,
    )
    assert r.status_code == 200
    r = client.get(f"{settings.API_V1_STR}/tag-shares/?tag_id={tag['id']}",
                   headers=alice_h)
    assert r.json()["count"] == 0


def test_cannot_share_unowned_tag(client: TestClient, db: Session):
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)
    tag = _make_tag(client, alice_h, "alices")
    r = client.post(f"{settings.API_V1_STR}/tag-shares/",
                    headers=bob_h,
                    json={"tag_id": tag["id"], "grantee_id": str(alice.id)})
    assert r.status_code == 404
```

- [ ] **Step 2: Run tests, expect 404**

Run `uv run pytest tests/api/routes/test_tag_shares.py -q` from `backend/`. Expected: FAIL.

- [ ] **Step 3: Create `backend/app/api/routes/tag_shares.py`**

```python
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import Tag, TagShare, TagSharePublic, TagSharesPublic, User

router = APIRouter(prefix="/tag-shares", tags=["tag-shares"])


class _ShareIn(BaseModel):
    tag_id: uuid.UUID
    grantee_id: uuid.UUID


@router.post("/", response_model=TagSharePublic)
def create_tag_share(
    *, session: SessionDep, current_user: CurrentUser, body: _ShareIn
) -> TagSharePublic:
    tag = session.get(Tag, body.tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    grantee = session.get(User, body.grantee_id)
    if not grantee or not grantee.is_active:
        raise HTTPException(status_code=404, detail="Grantee not found")
    existing = session.get(TagShare, (body.tag_id, body.grantee_id))
    if existing:
        return TagSharePublic(
            tag_id=existing.tag_id, grantee_id=existing.grantee_id,
            grantee_email=grantee.email, created_at=existing.created_at,
        )
    share = TagShare(tag_id=body.tag_id, grantee_id=body.grantee_id)
    session.add(share)
    session.commit()
    session.refresh(share)
    return TagSharePublic(
        tag_id=share.tag_id, grantee_id=share.grantee_id,
        grantee_email=grantee.email, created_at=share.created_at,
    )


@router.get("/", response_model=TagSharesPublic)
def list_tag_shares(
    *, session: SessionDep, current_user: CurrentUser, tag_id: uuid.UUID
) -> TagSharesPublic:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    rows = session.exec(
        select(TagShare, User)
        .join(User, User.id == TagShare.grantee_id)
        .where(TagShare.tag_id == tag_id)
    ).all()
    data = [
        TagSharePublic(
            tag_id=s.tag_id, grantee_id=s.grantee_id,
            grantee_email=u.email, created_at=s.created_at,
        )
        for s, u in rows
    ]
    return TagSharesPublic(data=data, count=len(data))


@router.delete("/{tag_id}/{grantee_id}")
def delete_tag_share(
    *, session: SessionDep, current_user: CurrentUser,
    tag_id: uuid.UUID, grantee_id: uuid.UUID,
) -> dict[str, str]:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    share = session.get(TagShare, (tag_id, grantee_id))
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    session.delete(share)
    session.commit()
    return {"message": "Share removed"}
```

- [ ] **Step 4: Register router in `backend/app/api/main.py`**

Add `from app.api.routes import tag_shares` near the other route imports, and `api_router.include_router(tag_shares.router)` in the include-router block.

- [ ] **Step 5: Run tests, expect pass**

Run `uv run pytest tests/api/routes/test_tag_shares.py -q` from `backend/`. Expected: 2 passed.

- [ ] **Step 6: Commit**

`git commit` message: `feat(auth): tag-share CRUD router`.

---

### Task 8: Apply `visible_contact_ids` to Contact list/detail queries

**Files:**
- Modify: `backend/app/api/routes/contacts.py`
- Modify: `backend/tests/api/routes/test_contacts.py`

- [ ] **Step 1: Add cross-user isolation test**

Append to `backend/tests/api/routes/test_contacts.py`:

```python
def test_contact_isolation_between_users(client, db):
    from tests.utils.user import create_random_user, authentication_token_from_email
    alice = create_random_user(db); bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    r = client.post(f"{settings.API_V1_STR}/contacts/", headers=alice_h,
                    json={"first_name": "Private"})
    assert r.status_code == 200
    alice_cid = r.json()["id"]

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    ids = [c["id"] for c in r.json()["data"]]
    assert alice_cid not in ids

    r = client.get(f"{settings.API_V1_STR}/contacts/{alice_cid}", headers=bob_h)
    assert r.status_code == 404
```

- [ ] **Step 2: Run test — pass or fail depending on current code**

Run `uv run pytest tests/api/routes/test_contacts.py::test_contact_isolation_between_users -q` from `backend/`. If it already passes (existing code filters by `owner_id`), skip to Step 4.

- [ ] **Step 3: Refactor Contact list/detail to use `visible_contact_ids`**

In `backend/app/api/routes/contacts.py`, locate the list endpoint and replace the `owner_id`-filter version with:

```python
from app.crud import visible_contact_ids

@router.get("/", response_model=ContactsPublic)
def read_contacts(
    session: SessionDep, current_user: CurrentUser,
    skip: int = 0, limit: int = 100,
) -> ContactsPublic:
    stmt = (
        select(Contact)
        .where(Contact.id.in_(visible_contact_ids(current_user)))
        .offset(skip).limit(limit)
    )
    contacts = session.exec(stmt).all()
    count_stmt = (
        select(func.count()).select_from(Contact)
        .where(Contact.id.in_(visible_contact_ids(current_user)))
    )
    count = session.exec(count_stmt).one()
    return ContactsPublic(data=contacts, count=count)
```

And the detail endpoint:

```python
@router.get("/{contact_id}", response_model=ContactPublic)
def read_contact(
    contact_id: uuid.UUID, session: SessionDep, current_user: CurrentUser,
) -> Contact:
    contact = session.get(Contact, contact_id)
    visible_ids = set(session.exec(visible_contact_ids(current_user)).all())
    if contact is None or contact.id not in visible_ids:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact
```

- [ ] **Step 4: Add shared-tag visibility test**

Append to `test_contacts.py`:

```python
def test_shared_tag_exposes_contact(client, db):
    from tests.utils.user import create_random_user, authentication_token_from_email
    alice = create_random_user(db); bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact = client.post(f"{settings.API_V1_STR}/contacts/",
                          headers=alice_h, json={"first_name": "Joint"}).json()
    tag = client.post(f"{settings.API_V1_STR}/tags/",
                      headers=alice_h, json={"name": "joint"}).json()
    # Associate tag with contact via existing endpoint; adjust to match actual API
    r = client.post(
        f"{settings.API_V1_STR}/contacts/{contact['id']}/tags/{tag['id']}",
        headers=alice_h,
    )
    assert r.status_code in (200, 204)

    r = client.post(f"{settings.API_V1_STR}/tag-shares/", headers=alice_h,
                    json={"tag_id": tag["id"], "grantee_id": str(bob.id)})
    assert r.status_code == 200

    r = client.get(f"{settings.API_V1_STR}/contacts/", headers=bob_h)
    assert contact["id"] in [c["id"] for c in r.json()["data"]]

    r = client.get(f"{settings.API_V1_STR}/contacts/{contact['id']}", headers=bob_h)
    assert r.status_code == 200
```

If there's no `POST /contacts/{id}/tags/{tag_id}` endpoint today, inspect the actual tag-association path and adapt the test.

- [ ] **Step 5: Run full test suite**

Run `uv run pytest -q` from `backend/`. Expected: all green.

- [ ] **Step 6: Commit**

`git commit` message: `feat(auth): apply visible_contact_ids filter to Contact endpoints`.

---

### Task 9: Apply visibility to contact-child resources

Applies to: `interactions`, `gifts`, `debts`, `life_events`, `addresses`, `contact_fields`, `custom_fields`, `reminders`. Each has `contact_id` + `owner_id`. Pattern is identical.

**Files:**
- Modify each router under `backend/app/api/routes/` in the list
- Add one isolation test per router

- [ ] **Step 1: Do one router first (interactions)**

In `backend/app/api/routes/interactions.py`, change the list endpoint from:

```python
stmt = select(Interaction).where(Interaction.owner_id == current_user.id)
```

to:

```python
from app.crud import visible_contact_ids

stmt = select(Interaction).where(
    Interaction.contact_id.in_(visible_contact_ids(current_user))
)
```

For detail endpoints, change the `owner_id` ownership check to `contact_id` membership in `visible_contact_ids(current_user)`.

Append isolation + shared-tag tests to `test_interactions.py` mirroring the Task 8 pattern (substitute `/contacts/{id}/interactions` or whatever the actual path is).

Run `uv run pytest tests/api/routes/test_interactions.py -q` from `backend/`. Expected: green.

Commit: `feat(auth): apply visibility filter to interactions`.

- [ ] **Step 2: Repeat for each remaining child router**

Order: `gifts.py`, `debts.py`, `life_events.py`, `addresses.py`, `contact_fields.py`, `custom_fields.py`, `reminders.py`. Each change is mechanical and identical in shape. **One commit per router** keeps bisecting sane.

- [ ] **Step 3: Full regression**

Run `uv run pytest -q` from `backend/`. Expected: all green.

---

### Task 10: Confirm owner-only resources (audit)

**Files:**
- Inspect: `backend/app/api/routes/groups.py`, `journal.py`, and the `tags.py` list endpoint

- [ ] **Step 1: Add owner-only isolation tests**

For `test_groups.py`, `test_journal.py`, `test_tags.py` (create if missing), add a `test_<x>_isolated_between_users` that confirms alice's groups/journal/tags are NOT visible to bob. These should pass with no code change because these routers filter by `owner_id` and we've chosen not to share them.

- [ ] **Step 2: Run tests**

Run `uv run pytest -q` from `backend/`. Expected: all green.

- [ ] **Step 3: Commit**

`git commit` message: `test(auth): confirm groups/journal/tags remain owner-only`.

---

### Task 11: Phase 0 compose + env wiring (still `AUTH_MODE=local`)

**Files:**
- Modify: `.env`, `.env.sops`, `.env.example` (if it exists), `compose.yml`, `compose.override.yml`, `compose.prod.yml`, `compose.remote.yml`

- [ ] **Step 1: Add env keys**

Append to `.env`, `.env.sops`, `.env.example`:

```
# Multi-user auth (Phase 0 keeps AUTH_MODE=local)
AUTH_MODE=local
# Cloudflare Access values (populated in Phase 1 / Task 12):
OIDC_ISSUER_URL=
OIDC_AUDIENCE=
OIDC_JWKS_URL=
# Reserved for future non-CF providers (ignored by CF Access path):
OIDC_CLIENT_ID_SPA=
OIDC_JIT_ACTIVE=true
```

Per your SOPS workflow preference, edit `.env` first, then re-encrypt to `.env.sops`.

- [ ] **Step 2: Wire env passthrough in compose**

For each compose file, under the `backend` service `environment:` block, add:

```yaml
environment:
  # …existing…
  AUTH_MODE: ${AUTH_MODE:-local}
  OIDC_ISSUER_URL: ${OIDC_ISSUER_URL:-}
  OIDC_AUDIENCE: ${OIDC_AUDIENCE:-}
  OIDC_JWKS_URL: ${OIDC_JWKS_URL:-}
  OIDC_CLIENT_ID_SPA: ${OIDC_CLIENT_ID_SPA:-}
  OIDC_JIT_ACTIVE: ${OIDC_JIT_ACTIVE:-true}
```

Frontend only needs `VITE_AUTH_MODE` (so the login page knows whether to show the local form). Under the `frontend` service `environment:` block:

```yaml
environment:
  VITE_AUTH_MODE: ${AUTH_MODE:-local}
  VITE_CF_LOGOUT_URL: ${OIDC_ISSUER_URL:+${OIDC_ISSUER_URL}/cdn-cgi/access/logout}
```

The frontend does NOT need `VITE_OIDC_*` fields: CF Access handles login at the edge, not in the SPA.

- [ ] **Step 3: Boot the stack**

Run `docker compose -f compose.yml -f compose.override.yml up -d --build` and `docker compose logs backend --tail=80`. Expected: backend starts, migration applied, healthy.

- [ ] **Step 4: Smoke-test local login**

Run a curl POST to `/api/v1/login/access-token` with your superuser credentials. Expected: non-empty access token in JSON response.

- [ ] **Step 5: Commit**

`git commit` message: `chore(auth): wire AUTH_MODE and OIDC env across compose files`.

**Phase 0 complete.** Nothing has changed for end users. All plumbing is in place.

---

## Phase 1 — Cloudflare Access app setup + minimal frontend

### Task 12: Cloudflare Access Application setup (human checklist)

No code. Record outcomes in `docs/handoff/2026-04-18-cf-access-setup.md`.

Prerequisite: `kindred.${DOMAIN}` already proxied through Cloudflare (your homelab already does this via tunnel, per recent commits). If not, set that up first.

- [ ] **Step 1:** In Cloudflare Zero Trust dashboard (`one.dash.cloudflare.com`) → **Access → Applications → Add an application → Self-hosted**.
- [ ] **Step 2:** Application configuration:
  - **Name**: `personal-crm`
  - **Session duration**: 24 hours
  - **Application domain**: `kindred.${DOMAIN}`
  - **Identity providers**: pick whatever you already use for your homelab (Google, email OTP, GitHub, …). Multiple is fine.
- [ ] **Step 3:** Add a **Policy** to the app:
  - **Action**: Allow
  - **Session duration**: inherit
  - **Include**: `Emails` → add your email, add wife's email
  - Leave Require/Exclude empty
- [ ] **Step 4:** After creation, copy the **Application Audience (AUD) Tag** from the app's Overview tab → this is `OIDC_AUDIENCE` (a long hex string).
- [ ] **Step 5:** Your team domain (visible in Zero Trust → Settings → General → Team domain) has the form `<team-name>.cloudflareaccess.com`. Record:
  - `OIDC_ISSUER_URL = https://<team-name>.cloudflareaccess.com`
  - `OIDC_JWKS_URL = https://<team-name>.cloudflareaccess.com/cdn-cgi/access/certs`
- [ ] **Step 6:** Test the policy: visit `https://kindred.${DOMAIN}` in an incognito browser. You should be redirected to CF's Access login, authenticate, then reach the app (still showing the existing local login since `AUTH_MODE=local` until Phase 2).
- [ ] **Step 7:** Write `docs/handoff/2026-04-18-cf-access-setup.md` with: team domain, AUD tag, allowlisted emails, a short "how to add another household member" recipe (just edit the Access policy's Include list).
- [ ] **Step 8:** Commit handoff doc: `docs(auth): Cloudflare Access app setup handoff`.

---

### Task 13: Frontend — minimal auth module for Cloudflare Access

Because CF Access handles the login flow entirely at the edge, the frontend has almost no OIDC work. We need only:

1. A way to fetch the current user's identity (our `/api/v1/users/me` endpoint does this — the backend extracts it from the CF JWT on the server side).
2. A logout affordance that redirects to CF's logout URL.
3. Detection that we're in CF Access mode (to hide the legacy local-login form).

**Files:**
- Create: `frontend/src/auth/cf.ts`

- [ ] **Step 1: Create `frontend/src/auth/cf.ts`**

```ts
// Cloudflare Access auth integration.
// No OAuth client — CF edge handles login. This module just exposes:
//   - cfEnabled(): whether we're running behind CF Access
//   - logout(): redirect to CF Access logout
//
// Identity is served by the backend's /api/v1/users/me, which derives it
// from the Cf-Access-Jwt-Assertion header the edge injects. No frontend
// JWT handling.

const authMode = import.meta.env.VITE_AUTH_MODE as string | undefined;
const cfLogoutUrl = import.meta.env.VITE_CF_LOGOUT_URL as string | undefined;

export const cfEnabled = (): boolean =>
  (authMode === "oidc" || authMode === "both") && !!cfLogoutUrl;

export const logout = (): void => {
  if (cfEnabled() && cfLogoutUrl) {
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `${cfLogoutUrl}?returnTo=${returnTo}`;
    return;
  }
  // Local fallback: clear any stored bearer and reload
  localStorage.removeItem("access_token");
  window.location.href = "/";
};
```

- [ ] **Step 2: Commit**

`git commit` message: `feat(auth): minimal Cloudflare Access frontend helper`.

---

### Task 14: Frontend — adapt login page, wire logout, cookies-not-bearer

CF Access handles the full login flow at the edge; the SPA never renders a login UI when behind CF. What remains:

1. Hide the legacy email+password form when `VITE_AUTH_MODE != local` (CF has already authenticated the user if they reached the SPA).
2. Make sure API calls send cookies so the CF cookie reaches the backend (usually it does via browser default, but the generated client may need `credentials: "include"` set).
3. Wire "Log out" to redirect to CF's logout URL.

**Files:**
- Modify: `frontend/src/routes/login.tsx` (or equivalent login-page file)
- Modify: the generated API client bootstrap (typically `frontend/src/client/core/OpenAPI.ts` — check for `WITH_CREDENTIALS`)
- Modify: the user-menu / header component that owns "Log out"

- [ ] **Step 1: Conditional render on login page**

Open the existing login-page component. At the top of its body:

```tsx
import { cfEnabled } from "@/auth/cf";

if (cfEnabled()) {
  // Behind CF Access, the user is always authenticated to reach this code.
  // If they somehow landed on /login, just bounce them home.
  window.location.replace("/");
  return null;
}
// fall through to the existing email+password form
```

- [ ] **Step 2: Ensure API requests send cookies**

Find the generated client's `OpenAPI` config (typically `frontend/src/client/core/OpenAPI.ts`). Set:

```ts
OpenAPI.WITH_CREDENTIALS = true;
OpenAPI.CREDENTIALS = "include";
```

Same-origin requests to `/api/*` under `kindred.${DOMAIN}` will auto-carry the `CF_Authorization` cookie. No token interceptor needed when CF is in front.

For dev against a different origin (e.g. `localhost:5173` → `localhost:8000`) with `AUTH_MODE=local`, the existing bearer-token path continues to work; `OpenAPI.TOKEN` stays as-is.

- [ ] **Step 3: Logout wiring**

In the header/user-menu component that owns "Log out":

```tsx
import { cfEnabled, logout as cfLogout } from "@/auth/cf";

const onLogout = () => {
  if (cfEnabled()) {
    cfLogout();  // redirects to CF Access logout
    return;
  }
  // existing local logout (clear localStorage token, redirect to /login)
};
```

- [ ] **Step 4: Manual smoke with `AUTH_MODE=local`**

Run `bun run dev` from `frontend/`. Open `http://localhost:5173` — you should still see the normal email+password login (because `VITE_AUTH_MODE=local`). Log in successfully. Logout still works via the local path.

- [ ] **Step 5: Commit**

`git commit` message: `feat(auth): CF-aware login page, cookie-credentialed API, CF logout`.

---

### Task 15: Dev-side OIDC smoke

Point the dev frontend at Zitadel Cloud and log in as superuser.

- [ ] **Step 1: Set dev env**

In `.env` (unencrypted dev copy):

```
AUTH_MODE=both
OIDC_ISSUER_URL=https://<your-slug>.zitadel.cloud
OIDC_AUDIENCE=<api-resource-id>
OIDC_CLIENT_ID_SPA=<spa-client-id>
```

- [ ] **Step 2: Restart backend + frontend**

Run `docker compose restart backend` and `bun run dev` from `frontend/`.

- [ ] **Step 3: Sign in via Zitadel at <http://localhost:5173>**

Click "Sign in" → Zitadel login → redirect back → contact list loads. Confirm the identity-merge path populated `oidc_sub` on your existing superuser row.

- [ ] **Step 4: Verify DB state**

Query the `user` table (via psql or a small Python script) and confirm:
- `oidc_iss` is set to the Zitadel issuer URL
- `oidc_sub` is set to a non-empty string
- `hashed_password` is still present (local login still works in parallel)

- [ ] **Step 5: Verify local login still works in parallel**

Open an incognito browser, log in with email/password. Succeeds (proves `AUTH_MODE=both` fallback).

- [ ] **Step 6: Persist config to sops**

Edit `.env.sops` via sops to add the three OIDC values. Commit: `chore(auth): wire Zitadel Cloud OIDC values (sops)`.

---

## Phase 2 — Prod dual-mode rollout

### Task 16: Deploy `AUTH_MODE=both` to prod + real users

- [ ] **Step 1:** Deploy with prod compose file, same `AUTH_MODE=both`.
- [ ] **Step 2:** Sign in to prod CRM as superuser via Zitadel. Confirm identity merge on the prod `User` row.
- [ ] **Step 3:** Ask wife to sign in to prod CRM via Zitadel. Confirm a new `User` row is created for her.
- [ ] **Step 4:** Tag first batch of shared contacts. As superuser, tag ~5 joint contacts with a `family` tag. Share that tag with wife using the tag-shares POST endpoint.
- [ ] **Step 5:** Wife logs in, sees the 5 shared contacts, edits one. Confirm edit persists and superuser sees it.
- [ ] **Step 6:** Monitor logs for a week. Trend should move toward OIDC-only usage.

**Phase 2 exit criteria:** both users have logged in via OIDC at least once; at least one shared-tag round-trip verified.

---

## Phase 3 — Flip to `AUTH_MODE=oidc`

### Task 17: Add mock-oidc-provider to compose `e2e` profile

**Files:**
- Modify: `compose.yml`

- [ ] **Step 1: Add mock IdP service**

```yaml
  mock-oidc:
    image: ghcr.io/navikt/mock-oauth2-server:2.1.10
    profiles: [e2e]
    ports: ["8080:8080"]
    environment:
      JSON_CONFIG: |
        {
          "interactiveLogin": false,
          "httpServer": "NettyWrapper",
          "tokenProvider": {
            "keyProvider": {"initialKeys": "", "algorithm": "RS256"}
          }
        }
```

- [ ] **Step 2: Write an E2E helper that mints a test JWT**

Create `e2e/fixtures/oidc.ts`:

```ts
export async function mintMockToken(opts: {
  sub: string; email: string; aud: string;
}): Promise<string> {
  const r = await fetch("http://localhost:8080/default/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "openid profile email",
      audience: opts.aud,
      sub: opts.sub,
      email: opts.email,
    }).toString(),
  });
  const json = await r.json();
  return json.access_token;
}
```

- [ ] **Step 3: Commit**

`git commit` message: `test(auth): mock OIDC server in e2e profile`.

---

### Task 18: Rewrite E2E for OIDC

- [ ] **Step 1: Replace login calls in tests**

In each Playwright test currently posting to `/login/access-token`, swap for a direct header injection using a token minted from the mock:

```ts
const token = await mintMockToken({
  sub: "test-user", email: "test@e2e.x", aud: "crm-api"
});
await page.setExtraHTTPHeaders({Authorization: `Bearer ${token}`});
```

- [ ] **Step 2: Run full E2E under `AUTH_MODE=oidc`**

Set `OIDC_ISSUER_URL=http://mock-oidc:8080/default`, bring up `docker compose --profile e2e up -d`, run Playwright. Expected: all green.

- [ ] **Step 3: Commit**

`git commit` message: `test(auth): e2e suite runs under AUTH_MODE=oidc against mock IdP`.

---

### Task 19: Flip prod to `AUTH_MODE=oidc`

- [ ] **Step 1:** Update `.env.sops`: `AUTH_MODE=oidc`.
- [ ] **Step 2:** Deploy. Watch logs.
- [ ] **Step 3:** Attempt local login with curl — expect 401.
- [ ] **Step 4:** Both users sign in via Zitadel — confirm smooth.
- [ ] **Step 5:** Commit + tag: `feat(auth): flip production AUTH_MODE to oidc`, then `git tag phase-3-oidc-only`.

---

## Phase 4 — Cleanup

### Task 20: Remove local auth surface

**Files (destructive):**
- Modify: `backend/app/api/routes/login.py`, `backend/app/api/deps.py`, `backend/app/core/security.py`, `backend/app/models.py`, `backend/pyproject.toml`, `backend/app/utils.py`, `.env`/`.env.sops`/compose files, `frontend/src/routes/login.tsx`

- [ ] **Step 1: Delete password endpoints from `login.py`**

Keep only `test_token` if the frontend uses it for "who am I" ping; drop `login_access_token`, `recover_password`, `reset_password`, `recover_password_html_content`.

- [ ] **Step 2: Simplify `get_current_user`**

```python
def get_current_user(session: SessionDep, token: TokenDep) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _get_current_user_oidc(session, token)
```

Delete `_get_current_user_local`. Remove `AUTH_MODE` branching.

- [ ] **Step 3: Delete password utilities**

Delete or trim `backend/app/core/security.py` (password helpers). Drop `generate_password_reset_token`, `verify_password_reset_token`, `generate_reset_password_email`, `send_email` from `backend/app/utils.py` (unless `send_email` has other consumers).

Remove `pwdlib` from `backend/pyproject.toml`; run `uv lock`.

- [ ] **Step 4: Alembic migration — drop `hashed_password`**

Run `uv run alembic revision -m "drop hashed_password"` from `backend/`. Edit the generated file:

```python
def upgrade():
    op.drop_column("user", "hashed_password")

def downgrade():
    op.add_column("user", sa.Column("hashed_password", sa.String(), nullable=True))
```
Apply: `uv run alembic upgrade head`.

- [ ] **Step 5: Remove model field**

In `backend/app/models.py`, delete `hashed_password: str | None` from `User`.

- [ ] **Step 6: Delete password-related schemas**

`NewPassword`, `UpdatePassword`, `UserUpdate.password`, `UserCreate.password`, `UserRegister.password` — drop them. Users register via Zitadel now.

- [ ] **Step 7: Clean env**

Remove `FIRST_SUPERUSER_PASSWORD`, `SECRET_KEY` from `.env`, `.env.sops`, `.env.example`, and all compose files.

- [ ] **Step 8: Run full test suite**

Run `uv run pytest -q` from `backend/`. Fix or delete tests referencing removed password helpers. Keep isolation/share tests — they still apply.

- [ ] **Step 9: Regenerate frontend API client**

Run `bash scripts/generate-client.sh`.

- [ ] **Step 10: Remove frontend local-login UI**

In the login page, remove the email+password form entirely. Keep only the "Sign in" button.

- [ ] **Step 11: Full E2E**

Run Playwright against the `e2e` profile. Expected: all green.

- [ ] **Step 12: Commit in focused commits**

```
refactor(auth): drop local login dispatch, oidc is the only path
refactor(auth): remove password helpers and email reset utilities
refactor(auth): drop hashed_password column and password schemas
chore(auth): remove FIRST_SUPERUSER_PASSWORD and SECRET_KEY from env
refactor(auth): remove local login UI and obsolete tests
```

Tag: `git tag phase-4-cleanup-done`.

---

## Post-Phase-4 — provider-swap validation (optional)

### Task 21: Swap OIDC provider as a portability test

- [ ] **Step 1:** Spin up a disposable Keycloak locally or use a free Auth0 tenant.
- [ ] **Step 2:** Register a `crm-frontend` client + `crm-api` audience; create one user.
- [ ] **Step 3:** Change `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, `OIDC_CLIENT_ID_SPA` in dev.
- [ ] **Step 4:** Restart backend + frontend.
- [ ] **Step 5:** Log in. Confirm a new `User` row is JIT-created with the new `(iss, sub)`. No code change.
- [ ] **Step 6:** Revert env; document evidence in `docs/handoff/`.

Closes the loop on the "OIDC as just an IdP" promise.

---

## Plan self-review

Verified against spec:

- §2 locked decisions → all reflected (AUTH_MODE dual→oidc, tags-only, read+write, JIT, 2–5 users). ✓
- §3 architecture → Tasks 4–7 (oidc.py, deps.py), Tasks 13–14 (frontend). ✓
- §4 data model → Tasks 2 + 3. ✓
- §5 permission model → Tasks 5 + 8 + 9 + 10. ✓
- §6 auth flow → Tasks 6, 13, 14. ✓
- §7 migration → Task 3 schema; Task 5 email-merge path; Task 16 real users. ✓
- §8 rollout phases → Tasks organised into 5 phases matching spec. ✓
- §9 testing → Tasks 4, 5, 6, 7, 8, 9, 10 (backend); 17, 18 (e2e). ✓
- §10 security → algorithm pinning in Task 4, token storage in Task 13, break-glass behavior flagged in Task 20. ✓
- §11 homelab dependency → noted as out of scope; personal-crm ships against Zitadel Cloud directly. ✓

Placeholder scan: no TBDs; every code block shows actual code.

Type consistency: `visible_contact_ids` used consistently across tasks; `TagShare`, `TagSharePublic`, `TagSharesPublic` defined once and reused; `oidc.verify_oidc_token` / `oidc.OIDCError` consistent; `crud.get_or_create_user_from_claims` signature matches.
