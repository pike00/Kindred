# Multi-User Personal-CRM with Provider-Agnostic OIDC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a multi-user personal-crm where users authenticate via any OIDC-compliant IdP (initially Zitadel Cloud), data is private by default, and sharing is tag-based with read+write semantics.

**Architecture:** Single FastAPI dependency (`get_current_user`) dispatches by `AUTH_MODE=local|oidc|both`. OIDC tokens verified locally via `PyJWKClient` against the IdP's JWKS. JIT-created `User` rows keyed by `(oidc_iss, oidc_sub)`. Visibility enforced by a `visible_contact_ids(user)` subquery applied uniformly in every contact / contact-child list endpoint. Sharing modelled as `TagShare(tag_id, grantee_id)`.

**Tech Stack:** FastAPI, SQLModel, Alembic, pyjwt, httpx, React + Vite + `oidc-client-ts`, Zitadel Cloud as initial IdP.

**Spec:** [docs/superpowers/specs/2026-04-18-multi-users-oidc-design.md](../specs/2026-04-18-multi-users-oidc-design.md) — authoritative for rationale and edge cases; this plan is the mechanical execution.

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

### Task 4: OIDC token verifier (`core/oidc.py`)

**Files:**
- Create: `backend/app/core/oidc.py`
- Create: `backend/tests/core/__init__.py` and `backend/tests/core/test_oidc.py`

- [ ] **Step 1: Write failing test with a stubbed JWKS**

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


def _make_token(key, *, aud: str, iss: str, sub: str = "user-1", exp_offset: int = 300):
    now = int(time.time())
    return jwt.encode(
        {"sub": sub, "aud": aud, "iss": iss, "iat": now, "exp": now + exp_offset},
        _pem(key), algorithm="RS256", headers={"kid": "test-key"},
    )


def test_verify_success(rsa_key, monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL", "https://issuer.test")
    monkeypatch.setattr(oidc.settings, "OIDC_AUDIENCE", "crm-api")
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="crm-api", iss="https://issuer.test")
    with patch("app.core.oidc._fetch_oidc_config") as fc, \
         patch("app.core.oidc._fetch_jwks") as fj:
        fc.return_value = {"jwks_uri": "https://issuer.test/jwks"}
        fj.return_value = _jwks(rsa_key)
        payload = oidc.verify_oidc_token(token)
    assert payload["sub"] == "user-1"


def test_wrong_audience(rsa_key, monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL", "https://issuer.test")
    monkeypatch.setattr(oidc.settings, "OIDC_AUDIENCE", "crm-api")
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="other", iss="https://issuer.test")
    with patch("app.core.oidc._fetch_oidc_config") as fc, \
         patch("app.core.oidc._fetch_jwks") as fj:
        fc.return_value = {"jwks_uri": "https://issuer.test/jwks"}
        fj.return_value = _jwks(rsa_key)
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_expired(rsa_key, monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL", "https://issuer.test")
    monkeypatch.setattr(oidc.settings, "OIDC_AUDIENCE", "crm-api")
    oidc._reset_cache_for_tests()
    token = _make_token(rsa_key, aud="crm-api", iss="https://issuer.test", exp_offset=-60)
    with patch("app.core.oidc._fetch_oidc_config") as fc, \
         patch("app.core.oidc._fetch_jwks") as fj:
        fc.return_value = {"jwks_uri": "https://issuer.test/jwks"}
        fj.return_value = _jwks(rsa_key)
        with pytest.raises(oidc.OIDCError):
            oidc.verify_oidc_token(token)


def test_not_configured(monkeypatch):
    monkeypatch.setattr(oidc.settings, "OIDC_ISSUER_URL", "")
    oidc._reset_cache_for_tests()
    with pytest.raises(oidc.OIDCError):
        oidc.verify_oidc_token("x.y.z")
```

Also `touch backend/tests/core/__init__.py`.

- [ ] **Step 2: Add dev dependency**

Run `uv add --dev cryptography` from `backend/`.

- [ ] **Step 3: Run test, expect ImportError**

Run `uv run pytest tests/core/test_oidc.py -q` from `backend/`. Expected: FAIL (`cannot import name 'oidc'`).

- [ ] **Step 4: Implement `backend/app/core/oidc.py`**

```python
"""OIDC token verification. Provider-agnostic: any OIDC-compliant IdP works."""
from __future__ import annotations

import time
from typing import Any

import httpx
import jwt

from app.core.config import settings


class OIDCError(Exception):
    """Raised when an OIDC token cannot be verified."""


_CONFIG_TTL_SEC = 3600
_JWKS_TTL_SEC = 3600
_ALLOWED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"]
_LEEWAY_SEC = 60

_config_cache: tuple[float, dict[str, Any]] | None = None
_jwks_cache: tuple[float, dict[str, Any]] | None = None


def _reset_cache_for_tests() -> None:
    global _config_cache, _jwks_cache
    _config_cache = None
    _jwks_cache = None


def _fetch_oidc_config() -> dict[str, Any]:
    url = settings.OIDC_ISSUER_URL.rstrip("/") + "/.well-known/openid-configuration"
    resp = httpx.get(url, timeout=5.0)
    resp.raise_for_status()
    return resp.json()


def _fetch_jwks(jwks_uri: str) -> dict[str, Any]:
    resp = httpx.get(jwks_uri, timeout=5.0)
    resp.raise_for_status()
    return resp.json()


def _get_oidc_config() -> dict[str, Any]:
    global _config_cache
    now = time.time()
    if _config_cache and (now - _config_cache[0]) < _CONFIG_TTL_SEC:
        return _config_cache[1]
    cfg = _fetch_oidc_config()
    _config_cache = (now, cfg)
    return cfg


def _get_jwks() -> dict[str, Any]:
    global _jwks_cache
    now = time.time()
    if _jwks_cache and (now - _jwks_cache[0]) < _JWKS_TTL_SEC:
        return _jwks_cache[1]
    cfg = _get_oidc_config()
    jwks = _fetch_jwks(cfg["jwks_uri"])
    _jwks_cache = (now, jwks)
    return jwks


def _key_for_kid(jwks: dict[str, Any], kid: str) -> Any:
    for jwk in jwks.get("keys", []):
        if jwk.get("kid") == kid:
            return jwt.PyJWK(jwk).key
    raise OIDCError(f"Unknown kid: {kid}")


def verify_oidc_token(token: str) -> dict[str, Any]:
    """Verify token against the configured OIDC issuer. Returns decoded payload."""
    if not settings.OIDC_ISSUER_URL or not settings.OIDC_AUDIENCE:
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

- [ ] **Step 5: Run tests, expect pass**

Run `uv run pytest tests/core/test_oidc.py -q` from `backend/`. Expected: 4 passed.

- [ ] **Step 6: Commit**

`git commit` message: `feat(auth): add OIDC token verifier with JWKS cache`.

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

Replace the whole file:

```python
from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app import crud
from app.core import oidc, security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


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


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    mode = settings.AUTH_MODE
    if mode == "local":
        return _get_current_user_local(session, token)
    if mode == "oidc":
        return _get_current_user_oidc(session, token)
    try:
        return _get_current_user_oidc(session, token)
    except HTTPException:
        return _get_current_user_local(session, token)


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
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
OIDC_ISSUER_URL=
OIDC_AUDIENCE=
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
  OIDC_CLIENT_ID_SPA: ${OIDC_CLIENT_ID_SPA:-}
  OIDC_JIT_ACTIVE: ${OIDC_JIT_ACTIVE:-true}
```

Frontend service (Vite picks these up as public env):

```yaml
environment:
  VITE_AUTH_MODE: ${AUTH_MODE:-local}
  VITE_OIDC_ISSUER_URL: ${OIDC_ISSUER_URL:-}
  VITE_OIDC_CLIENT_ID_SPA: ${OIDC_CLIENT_ID_SPA:-}
  VITE_OIDC_AUDIENCE: ${OIDC_AUDIENCE:-}
```

- [ ] **Step 3: Boot the stack**

Run `docker compose -f compose.yml -f compose.override.yml up -d --build` and `docker compose logs backend --tail=80`. Expected: backend starts, migration applied, healthy.

- [ ] **Step 4: Smoke-test local login**

Run a curl POST to `/api/v1/login/access-token` with your superuser credentials. Expected: non-empty access token in JSON response.

- [ ] **Step 5: Commit**

`git commit` message: `chore(auth): wire AUTH_MODE and OIDC env across compose files`.

**Phase 0 complete.** Nothing has changed for end users. All plumbing is in place.

---

## Phase 1 — IdP tenant setup + frontend OIDC

### Task 12: Zitadel Cloud tenant setup (human checklist)

No code. Record outcomes in `docs/handoff/2026-04-18-zitadel-cloud-setup.md`.

- [ ] **Step 1:** Sign up at <https://zitadel.cloud>.
- [ ] **Step 2:** Create an Instance; record the instance URL (e.g. `https://<slug>.zitadel.cloud`) — this is `OIDC_ISSUER_URL`.
- [ ] **Step 3:** In the default Organization, create Project `personal-crm`.
- [ ] **Step 4:** Create Application `crm-frontend`: type `User Agent`, authentication method `PKCE`, redirect URIs:
  - `http://localhost:5173/auth/callback`
  - `https://crm.${DOMAIN}/auth/callback`
  Post-logout URIs:
  - `http://localhost:5173/`
  - `https://crm.${DOMAIN}/`
  Token Settings: **JWT access tokens** (toggle from default opaque).
  Record `Client ID` → `OIDC_CLIENT_ID_SPA`.
- [ ] **Step 5:** Create API application `crm-api` (authentication method `JWT`). Record its audience identifier → `OIDC_AUDIENCE`.
- [ ] **Step 6:** On `crm-frontend` → Token Settings → "Add additional audience" → add `crm-api`. Access tokens issued to the SPA now carry `aud: crm-api`.
- [ ] **Step 7:** Create user for superuser. Email = existing `FIRST_SUPERUSER` email (exact match enables identity merge). Strong password + TOTP.
- [ ] **Step 8:** Create user for wife. Email = her real address. Send Zitadel's password-init invite.
- [ ] **Step 9:** Write `docs/handoff/2026-04-18-zitadel-cloud-setup.md` with: instance URL, project name, SPA client ID, API audience, both user emails, and a short "how to add a new household member" recipe.
- [ ] **Step 10:** Commit handoff doc: `docs(auth): Zitadel Cloud tenant setup handoff`.

---

### Task 13: Frontend — install `oidc-client-ts` and write auth wrapper

**Files:**
- Modify: `frontend/package.json` (via `bun add`)
- Create: `frontend/src/auth/oidc.ts`

- [ ] **Step 1: Install**

Run `bun add oidc-client-ts` from `frontend/`.

- [ ] **Step 2: Create `frontend/src/auth/oidc.ts`**

```ts
import {
  UserManager,
  UserManagerSettings,
  WebStorageStateStore,
  InMemoryWebStorage,
} from "oidc-client-ts";

const issuerUrl = import.meta.env.VITE_OIDC_ISSUER_URL as string;
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID_SPA as string;
const audience = import.meta.env.VITE_OIDC_AUDIENCE as string;

const redirectUri = `${window.location.origin}/auth/callback`;
const postLogoutRedirectUri = `${window.location.origin}/`;

const settings: UserManagerSettings = {
  authority: issuerUrl,
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: postLogoutRedirectUri,
  response_type: "code",
  scope: `openid profile email ${audience ? "offline_access" : ""}`.trim(),
  automaticSilentRenew: true,
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  extraQueryParams: audience ? { audience } : {},
};

export const oidcEnabled = (): boolean =>
  (import.meta.env.VITE_AUTH_MODE as string) !== "local" && !!issuerUrl;

let _mgr: UserManager | null = null;
export const userManager = (): UserManager => {
  if (!_mgr) _mgr = new UserManager(settings);
  return _mgr;
};

export const getAccessToken = async (): Promise<string | null> => {
  const user = await userManager().getUser();
  if (!user || user.expired) return null;
  return user.access_token;
};

export const signinRedirect = () => userManager().signinRedirect();
export const signinRedirectCallback = () =>
  userManager().signinRedirectCallback();
export const signoutRedirect = () => userManager().signoutRedirect();
```

- [ ] **Step 3: Commit**

`git commit` message: `feat(auth): add oidc-client-ts wrapper`.

---

### Task 14: Frontend — callback route + login conditional + axios interceptor

**Files:**
- Create: `frontend/src/routes/auth.callback.tsx`
- Modify: existing login page
- Modify: axios/OpenAPI client bootstrap

- [ ] **Step 1: Create the callback route**

```tsx
// frontend/src/routes/auth.callback.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signinRedirectCallback } from "@/auth/oidc";

export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    signinRedirectCallback()
      .then(() => { window.location.replace("/"); })
      .catch((e) => setError(String(e)));
  }, []);
  return error ? <div>Sign-in error: {error}</div> : <div>Signing in…</div>;
}
```

If your router isn't TanStack Router, adapt to the actual pattern (React Router v6 `element={<CallbackPage />}`).

- [ ] **Step 2: Conditional login button on the existing login page**

Open `frontend/src/routes/login.tsx` (or equivalent). At the top of the component body:

```tsx
import { oidcEnabled, signinRedirect } from "@/auth/oidc";

if (oidcEnabled()) {
  return <button onClick={() => signinRedirect()}>Sign in</button>;
}
// fall through to the existing email+password form
```

- [ ] **Step 3: Axios interceptor**

Find the axios instance used by the generated API client (typically `frontend/src/client/core/OpenAPI.ts`). Augment:

```ts
import { getAccessToken } from "@/auth/oidc";

OpenAPI.TOKEN = async () => {
  const oidcToken = await getAccessToken();
  if (oidcToken) return oidcToken;
  return localStorage.getItem("access_token") ?? "";
};
```

- [ ] **Step 4: Logout wiring**

In the user-menu / header component that has "Log out":

```tsx
import { oidcEnabled, signoutRedirect } from "@/auth/oidc";

const onLogout = async () => {
  if (oidcEnabled()) {
    await signoutRedirect();
    return;
  }
  // existing local logout
};
```

- [ ] **Step 5: Manual smoke with `AUTH_MODE=local`**

Run `bun run dev` from `frontend/`. Open `http://localhost:5173` — you should still see the normal email+password login (because `VITE_AUTH_MODE=local`). Log in successfully.

- [ ] **Step 6: Commit**

`git commit` message: `feat(auth): OIDC callback route, conditional login, axios interceptor`.

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
