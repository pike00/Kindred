"""Tests for API key auth: management endpoints, bearer auth, and impersonation guard."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import crud
from app.core import api_keys as api_keys_util
from app.core.config import settings
from app.models import (
    ActivityLog,
    APIKey,
    APIKeyCreate,
    Contact,
    User,
    UserCreate,
)
from tests.utils.utils import random_email, random_lower_string

# ─── helpers ──────────────────────────────────────────────────────────────────


def _create_user(db: Session) -> User:
    user = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            password=random_lower_string(),
            full_name="Test User",
        ),
    )
    return user


def _issue_key(
    db: Session,
    *,
    owner: User,
    can_impersonate: list = (),
    expires_at: datetime | None = None,
) -> tuple[APIKey, str]:
    return crud.create_api_key(
        session=db,
        owner_id=owner.id,
        key_in=APIKeyCreate(
            name="test key",
            can_impersonate=list(can_impersonate),
            expires_at=expires_at,
        ),
    )


# ─── unit-level: key generation + lookup ─────────────────────────────────────


def test_generated_key_has_kk_prefix_and_high_entropy() -> None:
    plaintext, key_hash, key_prefix = api_keys_util.generate_key()
    assert plaintext.startswith("kk_")
    assert len(plaintext) > 30
    assert key_hash == api_keys_util.hash_key(plaintext)
    assert len(key_hash) == 64
    assert plaintext[3 : 3 + len(key_prefix)] == key_prefix


def test_looks_like_api_key_distinguishes_jwt_from_key() -> None:
    plaintext, _, _ = api_keys_util.generate_key()
    assert api_keys_util.looks_like_api_key(plaintext) is True
    # JWTs have dots, no kk_ prefix
    assert api_keys_util.looks_like_api_key("eyJhbGc.eyJzdWI.signature") is False


def test_lookup_returns_none_for_unknown_key(db: Session) -> None:
    assert (
        crud.get_api_key_by_plaintext(session=db, plaintext="kk_doesnotexist") is None
    )


def test_lookup_rejects_revoked_key(db: Session) -> None:
    owner = _create_user(db)
    api_key, plaintext = _issue_key(db, owner=owner)
    crud.revoke_api_key(session=db, api_key=api_key)
    assert crud.get_api_key_by_plaintext(session=db, plaintext=plaintext) is None


def test_lookup_rejects_expired_key(db: Session) -> None:
    owner = _create_user(db)
    _, plaintext = _issue_key(
        db,
        owner=owner,
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    assert crud.get_api_key_by_plaintext(session=db, plaintext=plaintext) is None


# ─── HTTP: management endpoints ──────────────────────────────────────────────


def test_create_returns_plaintext_once_then_listing_only_shows_prefix(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={"name": "first key", "can_impersonate": []},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["plaintext_key"].startswith("kk_")
    prefix = body["key_prefix"]

    listed = client.get(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
    ).json()
    matched = [k for k in listed["data"] if k["key_prefix"] == prefix]
    assert len(matched) == 1
    assert "plaintext_key" not in matched[0]


def test_revoke_makes_key_unusable(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={"name": "to-revoke", "can_impersonate": []},
    ).json()
    plaintext = created["plaintext_key"]

    # key works
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={"Authorization": f"Bearer {plaintext}"},
    )
    assert r.status_code == 200

    # revoke
    r = client.delete(
        f"{settings.API_V1_STR}/users/me/api-keys/{created['id']}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    # subsequent use fails
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={"Authorization": f"Bearer {plaintext}"},
    )
    assert r.status_code == 401


def test_cannot_revoke_someone_elses_key(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    other = _create_user(db)
    other_key, _ = _issue_key(db, owner=other)
    r = client.delete(
        f"{settings.API_V1_STR}/users/me/api-keys/{other_key.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404  # don't leak existence


# ─── HTTP: bearer-token auth via API key ─────────────────────────────────────


def test_api_key_authenticates_as_owner_by_default(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    me = client.get(
        f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers
    ).json()
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={"name": "owner key", "can_impersonate": []},
    ).json()
    plaintext = created["plaintext_key"]

    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={"Authorization": f"Bearer {plaintext}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == me["id"]


def test_invalid_api_key_401(client: TestClient) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={"Authorization": "Bearer kk_definitely_not_a_real_key_xyz"},
    )
    assert r.status_code == 401


# ─── HTTP: impersonation via X-On-Behalf-Of ──────────────────────────────────


def test_impersonation_succeeds_for_whitelisted_target(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    target = _create_user(db)
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={
            "name": "janet bot",
            "can_impersonate": [str(target.id)],
        },
    ).json()
    plaintext = created["plaintext_key"]

    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(target.id),
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["id"] == str(target.id)


def test_impersonation_rejected_when_target_not_whitelisted(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    target = _create_user(db)
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={"name": "no-impersonate key", "can_impersonate": []},
    ).json()
    plaintext = created["plaintext_key"]

    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(target.id),
        },
    )
    assert r.status_code == 403


def test_impersonation_rejects_invalid_uuid_header(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={"name": "k", "can_impersonate": []},
    ).json()
    plaintext = created["plaintext_key"]
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": "not-a-uuid",
        },
    )
    assert r.status_code == 400


def test_create_rejects_unknown_impersonation_target(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={
            "name": "bad",
            "can_impersonate": ["00000000-0000-0000-0000-000000000000"],
        },
    )
    assert r.status_code == 400


# ─── audit log: actor_id and acting_api_key_id ───────────────────────────────


def test_audit_log_records_acting_api_key_and_impersonated_actor(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    target = _create_user(db)
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=superuser_token_headers,
        json={
            "name": "audit-test bot",
            "can_impersonate": [str(target.id)],
        },
    ).json()
    plaintext = created["plaintext_key"]
    api_key_id = created["id"]

    # Create a contact via impersonation; use target's owner_id implicitly.
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(target.id),
        },
        json={"first_name": "Audit", "last_name": "Subject"},
    )
    assert r.status_code in (200, 201), r.text
    contact_id = r.json()["id"]

    # Verify the audit log entry attributes the actor to the impersonated
    # user and links the API key.
    log = db.exec(
        select(ActivityLog).where(
            ActivityLog.entity_type == "contact",
            ActivityLog.entity_id == contact_id,
        )
    ).first()
    assert log is not None
    assert str(log.actor_id) == str(target.id)
    assert str(log.acting_api_key_id) == str(api_key_id)

    # And the contact itself is owned by the target.
    contact = db.get(Contact, contact_id)
    assert contact is not None
    assert str(contact.owner_id) == str(target.id)
