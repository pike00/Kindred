"""Regression coverage for authorization boundaries around sharing and API keys."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import APIKey, APIKeyCreate, User, UserCreate
from tests.utils.utils import random_email, random_lower_string


def _register_attacker(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> tuple[dict[str, object], dict[str, str]]:
    monkeypatch.setattr(settings, "USERS_OPEN_REGISTRATION", True)
    email = random_email()
    password = random_lower_string()

    registered = client.post(
        f"{settings.API_V1_STR}/users/signup",
        json={"email": email, "password": password},
    )
    assert registered.status_code == 200, registered.text
    attacker = registered.json()
    assert attacker["is_superuser"] is False

    login = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": email, "password": password},
    )
    assert login.status_code == 200, login.text
    return attacker, {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_reported_contact_share_to_api_key_escalation_chain_is_blocked(
    client: TestClient,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    admin = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    assert admin is not None
    attacker, attacker_headers = _register_attacker(client, monkeypatch)

    disclosed = client.post(
        f"{settings.API_V1_STR}/contact-shares/",
        headers=attacker_headers,
        json={"grantee_email": admin.email},
    )
    assert disclosed.status_code == 200, disclosed.text
    assert set(disclosed.json()) == {"grantee_email", "created_at"}
    assert str(admin.id) not in disclosed.text

    logs = client.get(
        f"{settings.API_V1_STR}/activity-logs/",
        headers=attacker_headers,
        params={"entity_type": "AllContactsShare"},
    )
    assert logs.status_code == 200, logs.text
    assert logs.json()["count"] == 1
    assert str(admin.id) not in logs.text

    # Even if an attacker obtains the admin UUID out of band, self-service keys
    # must not be able to grant impersonation.
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=attacker_headers,
        json={"name": "escalation", "can_impersonate": [str(admin.id)]},
    )
    assert created.status_code == 403, created.text
    assert created.json()["detail"] == "Only superusers can grant impersonation"
    assert crud.list_api_keys(session=db, owner_id=attacker["id"]) == []

    # Defense in depth for keys issued before the creation check existed:
    # impersonation authority is rechecked on every use.
    legacy_key, legacy_plaintext = crud.create_api_key(
        session=db,
        owner_id=attacker["id"],
        key_in=APIKeyCreate(name="legacy", can_impersonate=[admin.id]),
    )
    assert db.get(APIKey, legacy_key.id) is not None
    self_only = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {legacy_plaintext}"},
    )
    assert self_only.status_code == 200, self_only.text
    assert self_only.json()["id"] == attacker["id"]

    promoted = client.patch(
        f"{settings.API_V1_STR}/users/{attacker['id']}",
        headers={
            "Authorization": f"Bearer {legacy_plaintext}",
            "X-On-Behalf-Of": str(admin.id),
        },
        json={"is_superuser": True},
    )
    assert promoted.status_code == 403, promoted.text
    assert promoted.json()["detail"] == "Only superusers can use impersonation"

    persisted = client.get(
        f"{settings.API_V1_STR}/users/me", headers=attacker_headers
    )
    assert persisted.status_code == 200, persisted.text
    assert persisted.json()["is_superuser"] is False


def test_non_superuser_can_still_manage_personal_api_key(
    client: TestClient,
    user: User,
    user_headers: dict[str, str],
) -> None:
    created = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=user_headers,
        json={"name": "personal", "can_impersonate": []},
    )
    assert created.status_code == 201, created.text
    assert created.json()["can_impersonate"] == []

    authenticated = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {created.json()['plaintext_key']}"},
    )
    assert authenticated.status_code == 200, authenticated.text
    assert authenticated.json()["id"] == str(user.id)


@pytest.mark.parametrize("credential", ["login", "api_key"])
def test_non_superuser_cannot_grant_impersonation(
    client: TestClient,
    db: Session,
    user_headers: dict[str, str],
    api_key_headers: dict[str, str],
    credential: str,
) -> None:
    admin = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    assert admin is not None
    headers = user_headers if credential == "login" else api_key_headers

    response = client.post(
        f"{settings.API_V1_STR}/users/me/api-keys/",
        headers=headers,
        json={"name": "unauthorized", "can_impersonate": [str(admin.id)]},
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "Only superusers can grant impersonation"


def test_demoted_superuser_cannot_use_existing_impersonation_key(
    client: TestClient,
    db: Session,
) -> None:
    owner = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            password=random_lower_string(),
            is_superuser=True,
        ),
    )
    target = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            password=random_lower_string(),
        ),
    )
    _, plaintext = crud.create_api_key(
        session=db,
        owner_id=owner.id,
        key_in=APIKeyCreate(name="impersonation", can_impersonate=[target.id]),
    )
    headers = {
        "Authorization": f"Bearer {plaintext}",
        "X-On-Behalf-Of": str(target.id),
    }
    allowed = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert allowed.status_code == 200, allowed.text

    owner.is_superuser = False
    db.add(owner)
    db.commit()

    denied = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert denied.status_code == 403, denied.text
    assert denied.json()["detail"] == "Only superusers can use impersonation"


def test_inactive_superuser_cannot_use_existing_impersonation_key(
    client: TestClient,
    db: Session,
) -> None:
    owner = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            password=random_lower_string(),
            is_superuser=True,
        ),
    )
    target = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            password=random_lower_string(),
        ),
    )
    _, plaintext = crud.create_api_key(
        session=db,
        owner_id=owner.id,
        key_in=APIKeyCreate(name="impersonation", can_impersonate=[target.id]),
    )
    owner.is_active = False
    db.add(owner)
    db.commit()

    denied = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={
            "Authorization": f"Bearer {plaintext}",
            "X-On-Behalf-Of": str(target.id),
        },
    )
    assert denied.status_code == 400, denied.text
    assert denied.json()["detail"] == "Inactive user"
