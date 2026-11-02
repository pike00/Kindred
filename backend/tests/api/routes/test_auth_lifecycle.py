"""Regression tests for secret requirements and revocable local sessions."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlmodel import Session

from app import crud
from app.core.config import Settings, settings
from app.models import UserCreate
from tests.utils.user import user_authentication_headers
from tests.utils.utils import random_email, random_lower_string


def _create_login_user(
    client: TestClient, db: Session
) -> tuple[str, str, dict[str, str]]:
    email = random_email()
    password = random_lower_string()
    crud.create_user(
        session=db,
        user_create=UserCreate(email=email, password=password),
    )
    headers = user_authentication_headers(
        client=client,
        email=email,
        password=password,
    )
    return email, password, headers


def test_production_settings_require_stable_secrets() -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(
            _env_file=None,
            PROJECT_NAME="audit",
            POSTGRES_SERVER="localhost",
            POSTGRES_USER="audit",
            POSTGRES_PASSWORD="secure-postgres-password",
            POSTGRES_DB="audit",
            SECRET_KEY="",
            INITIAL_ADMIN_TOKEN_PEPPER="",
            ENVIRONMENT="production",
        )


def test_password_change_revokes_old_access_token(
    client: TestClient,
    db: Session,
) -> None:
    _email, old_password, old_headers = _create_login_user(client, db)
    new_password = random_lower_string()

    changed = client.patch(
        f"{settings.API_V1_STR}/users/me/password",
        headers=old_headers,
        json={
            "current_password": old_password,
            "new_password": new_password,
        },
    )
    assert changed.status_code == 200

    rejected = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers=old_headers,
    )
    assert rejected.status_code == 401


def test_logout_revokes_current_access_token(
    client: TestClient,
    db: Session,
) -> None:
    email, _password, headers = _create_login_user(client, db)

    logged_out = client.post(
        f"{settings.API_V1_STR}/users/me/logout",
        headers=headers,
    )
    assert logged_out.status_code == 200

    rejected = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers=headers,
    )
    assert rejected.status_code == 401

    # A fresh login uses the incremented session version.
    new_headers = user_authentication_headers(
        client=client,
        email=email,
        password=_password,
    )
    assert (
        client.get(f"{settings.API_V1_STR}/users/me", headers=new_headers).status_code
        == 200
    )


def test_oidc_email_link_requires_verified_email(db: Session) -> None:
    email = random_email()
    local_user = crud.create_user(
        session=db,
        user_create=UserCreate(
            email=email,
            password=random_lower_string(),
        ),
    )
    issuer = "https://idp.example.com"

    unverified = crud.get_or_create_user_from_claims(
        session=db,
        claims={
            "iss": issuer,
            "sub": f"unverified-{uuid.uuid4().hex}",
            "email": email,
            "email_verified": False,
        },
    )
    assert unverified.id != local_user.id
    db.refresh(local_user)
    assert local_user.oidc_sub is None

    verified = crud.get_or_create_user_from_claims(
        session=db,
        claims={
            "iss": issuer,
            "sub": f"verified-{uuid.uuid4().hex}",
            "email": email,
            "email_verified": True,
        },
    )
    assert verified.id == local_user.id
    db.refresh(local_user)
    assert local_user.oidc_iss == issuer
    assert local_user.oidc_sub is not None
