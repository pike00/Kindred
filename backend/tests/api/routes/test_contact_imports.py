"""Tests for OAuth-based contact-import routes (Google People API)."""

from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.routes import contact_imports
from app.core import crypto, security
from app.core.config import settings
from app.models import (
    Contact,
    ContactField,
    ContactSource,
    OAuthCredential,
    OAuthProvider,
    User,
)

GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "test-client-secret"
GOOGLE_REDIRECT_URI = "https://kindred.example.com/import/google/callback"


@pytest.fixture
def google_configured(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Make settings.google_import_enabled True for the duration of a test."""
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", GOOGLE_CLIENT_ID)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", GOOGLE_CLIENT_SECRET)
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", GOOGLE_REDIRECT_URI)
    yield


@pytest.fixture
def google_unconfigured(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "")
    yield


def _stub_token_response(
    *,
    refresh_token: str = "1//refresh-token-stub",
    access_token: str = "ya29.access-token-stub",
    expires_in: int = 3599,
    scope: str = "https://www.googleapis.com/auth/contacts.readonly",
    status_code: int = 200,
):
    class _Resp:
        def __init__(self) -> None:
            self.status_code = status_code
            self.text = "stub"

        def json(self) -> dict[str, Any]:
            return {
                "refresh_token": refresh_token,
                "access_token": access_token,
                "expires_in": expires_in,
                "scope": scope,
                "token_type": "Bearer",
            }

    captured: dict[str, Any] = {}

    def _fake_post(url: str, **kwargs: Any) -> _Resp:
        captured["url"] = url
        captured["data"] = kwargs.get("data")
        return _Resp()

    return _fake_post, captured


def _current_user(client: TestClient, headers: dict[str, str], db: Session) -> User:
    me = client.get(f"{settings.API_V1_STR}/users/me", headers=headers).json()
    user = db.get(User, me["id"])
    assert user is not None
    return user


# --- /authorize -------------------------------------------------------------


@pytest.mark.usefixtures("google_unconfigured")
def test_authorize_503_when_google_not_configured(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/authorize",
        headers=superuser_token_headers,
    )
    assert r.status_code == 503
    assert "GOOGLE_OAUTH_CLIENT_ID" in r.json()["detail"]


@pytest.mark.usefixtures("google_configured")
def test_authorize_returns_url_with_required_params(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/authorize",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()

    parsed = urlparse(body["authorize_url"])
    assert parsed.netloc == "accounts.google.com"
    assert parsed.path == "/o/oauth2/v2/auth"
    qs = parse_qs(parsed.query)
    assert qs["client_id"] == [GOOGLE_CLIENT_ID]
    assert qs["redirect_uri"] == [GOOGLE_REDIRECT_URI]
    assert qs["response_type"] == ["code"]
    assert qs["access_type"] == ["offline"]
    assert qs["prompt"] == ["consent"]
    assert "contacts.readonly" in qs["scope"][0]
    assert qs["state"] == [body["state"]]


@pytest.mark.usefixtures("google_configured")
def test_authorize_state_binds_user_and_provider(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    user = _current_user(client, superuser_token_headers, db)
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/authorize",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    state = r.json()["state"]
    payload = jwt.decode(
        state,
        settings.SECRET_KEY,
        algorithms=[security.ALGORITHM],
        audience="contact-import-oauth",
    )
    assert payload["sub"] == str(user.id)
    assert payload["provider"] == "google"
    assert "exp" in payload
    assert "nonce" in payload


# --- /exchange --------------------------------------------------------------


@pytest.mark.usefixtures("google_configured")
def test_exchange_rejects_unsigned_state(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "irrelevant", "state": "not-a-jwt"},
    )
    assert r.status_code == 400
    assert "Invalid OAuth state" in r.json()["detail"]


@pytest.mark.usefixtures("google_configured")
def test_exchange_rejects_expired_state(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    user = _current_user(client, superuser_token_headers, db)
    expired = jwt.encode(
        {
            "sub": str(user.id),
            "provider": "google",
            "aud": "contact-import-oauth",
            "nonce": "abc",
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        },
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "irrelevant", "state": expired},
    )
    assert r.status_code == 400


@pytest.mark.usefixtures("google_configured")
def test_exchange_rejects_state_for_other_user(
    client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    foreign_state = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000099",
            "provider": "google",
            "aud": "contact-import-oauth",
            "nonce": "abc",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "irrelevant", "state": foreign_state},
    )
    assert r.status_code == 400
    assert "does not match" in r.json()["detail"]


@pytest.mark.usefixtures("google_configured")
def test_exchange_persists_encrypted_credential(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _current_user(client, superuser_token_headers, db)
    # Clean any prior credential so the test is independent of execution order.
    for cred in db.exec(
        select(OAuthCredential).where(OAuthCredential.user_id == user.id)
    ).all():
        db.delete(cred)
    db.commit()

    fake_post, captured = _stub_token_response(
        refresh_token="1//test-refresh", access_token="ya29.test-access"
    )
    monkeypatch.setattr(contact_imports.httpx, "post", fake_post)

    state = contact_imports._issue_state(
        user_id=str(user.id), provider=OAuthProvider.GOOGLE
    )
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "auth-code-from-google", "state": state},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["provider"] == "google"
    assert "contacts.readonly" in body["scopes"][0]

    # Captured what we sent to Google
    assert captured["url"] == "https://oauth2.googleapis.com/token"
    assert captured["data"]["code"] == "auth-code-from-google"
    assert captured["data"]["client_id"] == GOOGLE_CLIENT_ID
    assert captured["data"]["client_secret"] == GOOGLE_CLIENT_SECRET
    assert captured["data"]["grant_type"] == "authorization_code"

    cred = db.exec(
        select(OAuthCredential).where(OAuthCredential.user_id == user.id)
    ).one()
    # Tokens were encrypted, NOT stored as plaintext
    assert cred.encrypted_refresh_token != "1//test-refresh"
    assert cred.encrypted_access_token != "ya29.test-access"
    assert crypto.decrypt(cred.encrypted_refresh_token) == "1//test-refresh"
    assert crypto.decrypt(cred.encrypted_access_token) == "ya29.test-access"
    assert cred.access_token_expires_at is not None


@pytest.mark.usefixtures("google_configured")
def test_exchange_replaces_existing_credential(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _current_user(client, superuser_token_headers, db)
    for cred in db.exec(
        select(OAuthCredential).where(OAuthCredential.user_id == user.id)
    ).all():
        db.delete(cred)
    db.commit()

    # Round 1
    fake1, _ = _stub_token_response(refresh_token="r-old", access_token="a-old")
    monkeypatch.setattr(contact_imports.httpx, "post", fake1)
    state1 = contact_imports._issue_state(
        user_id=str(user.id), provider=OAuthProvider.GOOGLE
    )
    r1 = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "code-1", "state": state1},
    )
    assert r1.status_code == 200
    cred1 = db.exec(
        select(OAuthCredential).where(OAuthCredential.user_id == user.id)
    ).one()
    cred1_id = cred1.id

    # Round 2 — should overwrite, not insert a second row
    fake2, _ = _stub_token_response(refresh_token="r-new", access_token="a-new")
    monkeypatch.setattr(contact_imports.httpx, "post", fake2)
    state2 = contact_imports._issue_state(
        user_id=str(user.id), provider=OAuthProvider.GOOGLE
    )
    r2 = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "code-2", "state": state2},
    )
    assert r2.status_code == 200

    rows = db.exec(
        select(OAuthCredential).where(OAuthCredential.user_id == user.id)
    ).all()
    assert len(rows) == 1
    assert rows[0].id == cred1_id  # Same row, updated in place
    db.refresh(rows[0])
    assert crypto.decrypt(rows[0].encrypted_refresh_token) == "r-new"


@pytest.mark.usefixtures("google_configured")
def test_exchange_400_when_google_returns_no_refresh_token(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _current_user(client, superuser_token_headers, db)
    fake_post, _ = _stub_token_response(refresh_token="")
    monkeypatch.setattr(contact_imports.httpx, "post", fake_post)
    state = contact_imports._issue_state(
        user_id=str(user.id), provider=OAuthProvider.GOOGLE
    )
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "auth-code", "state": state},
    )
    assert r.status_code == 400
    assert "refresh_token" in r.json()["detail"]


@pytest.mark.usefixtures("google_configured")
def test_exchange_400_when_google_token_call_fails(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = _current_user(client, superuser_token_headers, db)
    fake_post, _ = _stub_token_response(status_code=400)
    monkeypatch.setattr(contact_imports.httpx, "post", fake_post)
    state = contact_imports._issue_state(
        user_id=str(user.id), provider=OAuthProvider.GOOGLE
    )
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/exchange",
        headers=superuser_token_headers,
        json={"code": "auth-code", "state": state},
    )
    assert r.status_code == 400
    assert "Google token exchange failed" in r.json()["detail"]


# --- /sync/preview ---------------------------------------------------------


def _fake_google_contacts(*, sync_token=None):
    """Return a fake Google People API connections response."""
    contacts = [
        {
            "resourceName": "people/c1",
            "names": [{"givenName": "Alice", "familyName": "Smith"}],
            "emailAddresses": [{"value": "alice@example.com", "type": "home"}],
            "phoneNumbers": [{"value": "+1-555-0100", "type": "mobile"}],
        },
        {
            "resourceName": "people/c2",
            "names": [{"givenName": "Bob", "familyName": "Jones", "middleName": "T"}],
            "emailAddresses": [{"value": "bob@example.com", "type": "work"}],
        },
    ]
    resp = {"connections": contacts}
    if sync_token:
        resp["nextSyncToken"] = "sync-token-123"
    return resp


def _stub_google_api(monkeypatch, contacts_fn=None):
    """Stub out httpx.get for Google People API."""
    captured = {}
    if contacts_fn is None:
        contacts_fn = _fake_google_contacts

    class _Resp:
        def __init__(self, data, status_code=200):
            self.status_code = status_code
            self._data = data
            self.text = "stub"

        def json(self):
            return self._data

    def _fake_get(url, **kwargs):
        captured["url"] = url
        captured["params"] = kwargs.get("params", {})
        return _Resp(contacts_fn())

    monkeypatch.setattr(contact_imports.httpx, "get", _fake_get)
    return captured


def _create_google_credential(db, user_id):
    """Create a test OAuthCredential for Google."""
    cred = OAuthCredential(
        user_id=user_id,
        provider=OAuthProvider.GOOGLE,
        encrypted_refresh_token=crypto.encrypt("fake-refresh-token"),
        encrypted_access_token=crypto.encrypt("fake-access-token"),
        access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(cred)
    db.commit()
    return cred


@pytest.mark.usefixtures("google_configured")
def test_sync_preview_requires_credential(
    client,
    superuser_token_headers,
):
    """GET /sync/preview should 404 if no credential exists."""
    r = client.get(
        f"{settings.API_V1_STR}/contacts/import/google/sync/preview",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert "No Google credential" in r.json()["detail"]


@pytest.mark.usefixtures("google_configured")
def test_sync_preview_returns_contacts(
    client,
    superuser_token_headers,
    db,
    monkeypatch,
):
    """GET /sync/preview should return mapped contacts."""
    user = _current_user(client, superuser_token_headers, db)
    _create_google_credential(db, user.id)
    _stub_google_api(monkeypatch)

    r = client.get(
        f"{settings.API_V1_STR}/contacts/import/google/sync/preview",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_count"] == 2
    assert len(body["contacts"]) == 2
    # Check first contact mapping
    alice = body["contacts"][0]
    assert alice["resource_name"] == "people/c1"
    assert alice["first_name"] == "Alice"
    assert alice["last_name"] == "Smith"
    assert len(alice["emails"]) == 1
    assert alice["emails"][0]["value"] == "alice@example.com"
    assert len(alice["phones"]) == 1
    assert alice["phones"][0]["value"] == "+1-555-0100"

    # Check second contact (Bob with middle name)
    bob = body["contacts"][1]
    assert bob["first_name"] == "Bob"
    assert bob["last_name"] == "Jones"
    assert bob["middle_name"] == "T"


@pytest.mark.usefixtures("google_configured")
def test_sync_preview_includes_sync_token(
    client,
    superuser_token_headers,
    db,
    monkeypatch,
):
    """GET /sync/preview should return next_sync_token when provided."""
    user = _current_user(client, superuser_token_headers, db)
    cred = _create_google_credential(db, user.id)
    cred.sync_token = "existing-sync-token"
    db.add(cred)
    db.commit()

    captured = _stub_google_api(monkeypatch)

    r = client.get(
        f"{settings.API_V1_STR}/contacts/import/google/sync/preview",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Should pass sync_token in request
    assert captured["params"].get("syncToken") == "existing-sync-token"
    # Should return next_sync_token from response
    assert body["next_sync_token"] == "sync-token-123"


# --- /sync (POST) -----------------------------------------------------------


@pytest.mark.usefixtures("google_configured")
def test_sync_requires_credential(
    client,
    superuser_token_headers,
):
    """POST /sync should 404 if no credential exists."""
    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/sync",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
    assert "No Google credential" in r.json()["detail"]


@pytest.mark.usefixtures("google_configured")
def test_sync_creates_new_contacts(
    client,
    superuser_token_headers,
    db,
    monkeypatch,
):
    """POST /sync should create new contacts from Google data."""
    user = _current_user(client, superuser_token_headers, db)
    _create_google_credential(db, user.id)
    _stub_google_api(monkeypatch)

    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/sync",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 2
    assert body["updated"] == 0
    assert body["skipped"] == 0

    # Verify contacts were created in DB
    contacts = db.exec(
        select(Contact).where(
            Contact.owner_id == user.id,
            Contact.source_provider == ContactSource.GOOGLE,
        )
    ).all()
    assert len(contacts) == 2

    # Verify contact fields (emails, phones)
    alice = db.exec(
        select(Contact).where(Contact.source_external_id == "people/c1")
    ).first()
    assert alice is not None
    assert alice.first_name == "Alice"
    fields = db.exec(
        select(ContactField).where(ContactField.contact_id == alice.id)
    ).all()
    assert len(fields) == 2  # 1 email + 1 phone


@pytest.mark.usefixtures("google_configured")
def test_sync_updates_existing_contacts(
    client,
    superuser_token_headers,
    db,
    monkeypatch,
):
    """POST /sync should update existing contacts on re-import."""
    user = _current_user(client, superuser_token_headers, db)
    _create_google_credential(db, user.id)

    # Pre-create a contact that matches one from Google
    existing = Contact(
        owner_id=user.id,
        first_name="OldName",
        last_name="OldLastName",
        source_provider=ContactSource.GOOGLE,
        source_external_id="people/c1",
    )
    db.add(existing)
    db.commit()

    _stub_google_api(monkeypatch)

    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/sync",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 1  # people/c2 is new
    assert body["updated"] == 1  # people/c1 is updated

    # Verify the existing contact was updated
    db.refresh(existing)
    assert existing.first_name == "Alice"
    assert existing.last_name == "Smith"


@pytest.mark.usefixtures("google_configured")
def test_sync_updates_sync_token(
    client,
    superuser_token_headers,
    db,
    monkeypatch,
):
    """POST /sync should update the stored sync_token."""
    user = _current_user(client, superuser_token_headers, db)
    _create_google_credential(db, user.id)
    _stub_google_api(monkeypatch)

    r = client.post(
        f"{settings.API_V1_STR}/contacts/import/google/sync",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text

    # Verify sync_token was updated
    cred = db.exec(
        select(OAuthCredential).where(
            OAuthCredential.user_id == user.id,
            OAuthCredential.provider == OAuthProvider.GOOGLE,
        )
    ).first()
    assert cred is not None
    assert cred.sync_token == "sync-token-123"
    assert cred.last_synced_at is not None
