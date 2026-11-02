"""Regression tests for Gmail OAuth state, encryption, and response redaction."""

from __future__ import annotations

import json
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.routes import email as email_routes
from app.core.config import settings
from app.core.encryption import decrypt_token
from app.crud import create_email_oauth_token
from app.models import Contact, EmailOAuthTokenCreate, User


class _OAuthRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    def set(self, key: str, value: str, *, ex: int) -> bool:
        assert ex > 0
        self.values[key] = value
        return True

    def getdel(self, key: str) -> str | None:
        return self.values.pop(key, None)


def _contact(db: Session, user: User) -> Contact:
    contact = Contact(first_name="Gmail", owner_id=user.id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def test_gmail_oauth_state_is_random_bound_and_one_time(
    client: TestClient,
    db: Session,
    user: User,
    user_headers: dict[str, str],
    monkeypatch,
) -> None:
    redis = _OAuthRedis()
    monkeypatch.setattr(email_routes, "_get_oauth_redis", lambda: redis)
    monkeypatch.setattr(
        email_routes,
        "exchange_gmail_code",
        lambda _code: {
            "access_token": "raw-access-token",
            "refresh_token": "raw-refresh-token",
            "token_expires_at": None,
            "email_address": "gmail-owner@example.com",
        },
    )
    contact = _contact(db, user)

    authorized = client.get(
        f"{settings.API_V1_STR}/email/oauth/authorize",
        params={
            "contact_id": str(contact.id),
            "email_address": "untrusted@example.com",
        },
        headers=user_headers,
    )
    assert authorized.status_code == 200
    state = authorized.json()["state"]
    assert state != f"{contact.id}:untrusted@example.com"
    assert json.loads(redis.values[f"kindred:gmail-oauth-state:{state}"])[
        "user_id"
    ] == str(user.id)

    first = client.get(
        f"{settings.API_V1_STR}/email/oauth/callback",
        params={"code": "code", "state": state},
        headers=user_headers,
    )
    assert first.status_code == 200
    assert first.json()["email_address"] == "gmail-owner@example.com"

    replay = client.get(
        f"{settings.API_V1_STR}/email/oauth/callback",
        params={"code": "code", "state": state},
        headers=user_headers,
    )
    assert replay.status_code == 400


def test_email_tokens_encrypt_at_rest_and_redact_api_response(
    client: TestClient,
    db: Session,
    user: User,
    user_headers: dict[str, str],
) -> None:
    contact = _contact(db, user)
    token_row = create_email_oauth_token(
        session=db,
        token_in=EmailOAuthTokenCreate(
            provider="gmail",
            email_address="gmail-owner@example.com",
            access_token="raw-access-token",
            refresh_token="raw-refresh-token",
        ),
        owner_id=user.id,
        contact_id=contact.id,
    )

    assert token_row.encrypted_access_token != "raw-access-token"
    assert token_row.encrypted_refresh_token != "raw-refresh-token"
    assert decrypt_token(token_row.encrypted_access_token) == "raw-access-token"
    assert decrypt_token(token_row.encrypted_refresh_token) == "raw-refresh-token"

    response = client.get(
        f"{settings.API_V1_STR}/email/tokens",
        headers=user_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    serialized = json.dumps(body)
    assert "raw-access-token" not in serialized
    assert "raw-refresh-token" not in serialized
    assert "encrypted_access_token" not in serialized
    assert "encrypted_refresh_token" not in serialized


def test_poll_all_is_scoped_to_current_user(
    client: TestClient,
    user: User,
    user_headers: dict[str, str],
    monkeypatch,
) -> None:
    calls: list[uuid.UUID | None] = []

    def _poll_all(*, session: Session, owner_id: uuid.UUID | None = None):
        assert session is not None
        calls.append(owner_id)
        return {}

    monkeypatch.setattr("app.email_service.poll_all_email_accounts", _poll_all)

    response = client.post(
        f"{settings.API_V1_STR}/email/poll/all",
        headers=user_headers,
    )

    assert response.status_code == 200
    assert calls == [user.id]
