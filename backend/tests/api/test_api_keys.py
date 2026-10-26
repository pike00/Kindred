"""Tests for API key auth: management endpoints, bearer auth, and impersonation guard."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
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


@pytest.mark.parametrize("target_kind", ["other", "self", "unknown", "inactive"])
@pytest.mark.parametrize("credential", ["login", "api_key"])
def test_normal_user_cannot_grant_impersonation(
    client: TestClient,
    db: Session,
    user: User,
    user_headers: dict[str, str],
    target_kind: str,
    credential: str,
) -> None:
    target_id = user.id if target_kind == "self" else uuid4()
    if target_kind in {"other", "inactive"}:
        target = _create_user(db)
        if target_kind == "inactive":
            target.is_active = False
            db.add(target)
            db.commit()
        target_id = target.id
    headers = user_headers
    if credential == "api_key":
        _, plaintext = _issue_key(db, owner=user)
        headers = {"Authorization": f"Bearer {plaintext}"}
    before = {key.id for key in crud.list_api_keys(session=db, owner_id=user.id)}

    response = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=headers,
        json={"name": "unauthorized grant", "can_impersonate": [str(target_id)]},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Only superusers can grant impersonation"
    assert {
        key.id for key in crud.list_api_keys(session=db, owner_id=user.id)
    } == before


def test_self_registered_user_cannot_grant_admin_impersonation(
    client: TestClient, db: Session
) -> None:
    email, password = random_email(), random_lower_string()
    registered = client.post(
        f"{settings.API_V1_STR}/users/signup",
        json={"email": email, "password": password},
    )
    assert registered.status_code == 200
    assert registered.json()["is_superuser"] is False
    login = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    shared = client.post(
        f"{settings.API_V1_STR}/contact-shares/",
        headers=headers,
        json={"grantee_email": settings.FIRST_SUPERUSER},
    )
    assert shared.status_code == 200

    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=headers,
        json={"name": "escalation", "can_impersonate": [shared.json()["grantee_id"]]},
    )

    assert created.status_code == 403
    user = crud.get_user_by_email(session=db, email=email)
    assert user is not None
    assert not crud.list_api_keys(session=db, owner_id=user.id)
    assert (
        client.get(f"{settings.API_V1_STR}/users/me", headers=headers).json()[
            "is_superuser"
        ]
        is False
    )


def test_normal_user_can_manage_personal_key(
    client: TestClient, user_headers: dict[str, str], user: User
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=user_headers,
        json={"name": "personal"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["can_impersonate"] == []
    headers = {"Authorization": f"Bearer {body['plaintext_key']}"}
    authenticated = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert authenticated.status_code == 200
    assert authenticated.json()["id"] == str(user.id)
    listed = client.get(
        f"{settings.API_V1_STR}/users/me/api-keys/", headers=user_headers
    )
    assert listed.status_code == 200
    assert body["id"] in {key["id"] for key in listed.json()["data"]}
    revoked = client.delete(
        f"{settings.API_V1_STR}/users/me/api-keys/{body['id']}", headers=user_headers
    )
    assert revoked.status_code == 200
    assert (
        client.get(f"{settings.API_V1_STR}/users/me", headers=headers).status_code
        == 401
    )


def test_legacy_non_admin_key_cannot_permanently_promote_owner(
    client: TestClient, db: Session, user: User, user_headers: dict[str, str]
) -> None:
    admin = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    assert admin is not None
    # Seed the permission an unpatched server would have issued.
    _, plaintext = _issue_key(db, owner=user, can_impersonate=[admin.id])
    response = client.patch(
        f"{settings.API_V1_STR}/users/{user.id}",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(admin.id),
        },
        json={"is_superuser": True},
    )
    original_login = client.get(f"{settings.API_V1_STR}/users/me", headers=user_headers)
    assert original_login.status_code == 200
    assert (response.status_code, original_login.json()["is_superuser"]) == (403, False)


@pytest.mark.parametrize("auth_mode", ["local", "oidc", "both"])
def test_legacy_non_admin_key_cannot_impersonate_in_any_auth_mode(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch, auth_mode: str
) -> None:
    owner, target = _create_user(db), _create_user(db)
    _, plaintext = _issue_key(db, owner=owner, can_impersonate=[target.id])
    monkeypatch.setattr(settings, "AUTH_MODE", auth_mode)
    response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(target.id),
        },
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    "owner_change, expected_status", [("demoted", 403), ("inactive", 400)]
)
def test_impersonation_rechecks_owner_authority(
    client: TestClient, db: Session, owner_change: str, expected_status: int
) -> None:
    owner, target = _create_user(db), _create_user(db)
    owner.is_superuser = True
    db.add(owner)
    db.commit()
    _, plaintext = _issue_key(db, owner=owner, can_impersonate=[target.id])
    headers = {"Authorization": f"Bearer {plaintext}", "X-On-Behalf-Of": str(target.id)}
    assert (
        client.get(f"{settings.API_V1_STR}/users/me", headers=headers).status_code
        == 200
    )

    if owner_change == "demoted":
        owner.is_superuser = False
    else:
        owner.is_active = False
    db.add(owner)
    db.commit()
    assert (
        client.get(f"{settings.API_V1_STR}/users/me", headers=headers).status_code
        == expected_status
    )


def test_impersonation_rechecks_target_active_status(
    client: TestClient, db: Session
) -> None:
    owner, target = _create_user(db), _create_user(db)
    owner.is_superuser = True
    db.add(owner)
    db.commit()
    _, plaintext = _issue_key(db, owner=owner, can_impersonate=[target.id])
    target.is_active = False
    db.add(target)
    db.commit()
    response = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(target.id),
        },
    )
    assert response.status_code == 400


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
