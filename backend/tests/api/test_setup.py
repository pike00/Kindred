"""Tests for token-gated first-boot admin onboarding (Phase 11)."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.core.setup_state import (
    SINGLETON_ID,
    SetupState,
    ensure_state_with_token,
    hash_setup_token,
    mark_complete,
    verify_setup_token,
)
from app.main import app
from app.models import User


def _reset_setup_state(session: Session, *, complete: bool = True) -> None:
    """Force the singleton row into a known state for the test."""
    existing = session.get(SetupState, SINGLETON_ID)
    if existing is not None:
        session.delete(existing)
        session.commit()
    if complete:
        session.add(SetupState(id=SINGLETON_ID, complete=True, token_hash=None))
        session.commit()


@pytest.fixture
def reset_to_complete(db: Session) -> Generator[None, None, None]:
    """Most tests run with the gate down (setup already complete)."""
    _reset_setup_state(db, complete=True)
    yield
    _reset_setup_state(db, complete=True)


@pytest.fixture
def reset_to_pending(db: Session) -> Generator[str, None, None]:
    """Set the gate up with a freshly-issued token; yield the plaintext."""
    _reset_setup_state(db, complete=False)
    state, token = ensure_state_with_token(db)
    assert token is not None
    yield token
    _reset_setup_state(db, complete=True)


# ---------------------------------------------------------------------------
# Token helpers
# ---------------------------------------------------------------------------


def test_hash_setup_token_is_deterministic_for_same_input() -> None:
    assert hash_setup_token("abc") == hash_setup_token("abc")


def test_hash_setup_token_differs_for_different_input() -> None:
    assert hash_setup_token("abc") != hash_setup_token("abd")


def test_verify_setup_token_accepts_matching_token() -> None:
    assert verify_setup_token("hunter2", hash_setup_token("hunter2"))


def test_verify_setup_token_rejects_wrong_token() -> None:
    assert not verify_setup_token("wrong", hash_setup_token("right"))


def test_ensure_state_with_token_creates_row_and_returns_token(
    db: Session,
) -> None:
    _reset_setup_state(db, complete=False)
    # Wipe entirely so this is the "no row at all" path.
    existing = db.get(SetupState, SINGLETON_ID)
    if existing is not None:
        db.delete(existing)
        db.commit()
    state, token = ensure_state_with_token(db)
    try:
        assert token is not None
        assert state.complete is False
        assert state.token_hash == hash_setup_token(token)
    finally:
        _reset_setup_state(db, complete=True)


def test_ensure_state_with_token_is_idempotent_when_row_exists(
    db: Session,
) -> None:
    _reset_setup_state(db, complete=False)
    state1, token1 = ensure_state_with_token(db)
    state2, token2 = ensure_state_with_token(db)
    try:
        assert token1 is not None
        # Second call must not regenerate the token; original hash preserved.
        assert token2 is None
        assert state2.token_hash == state1.token_hash
    finally:
        _reset_setup_state(db, complete=True)


def test_mark_complete_clears_token_hash(db: Session) -> None:
    _reset_setup_state(db, complete=False)
    state, _ = ensure_state_with_token(db)
    try:
        mark_complete(db, state)
        refreshed = db.get(SetupState, SINGLETON_ID)
        assert refreshed is not None
        assert refreshed.complete is True
        assert refreshed.token_hash is None
    finally:
        _reset_setup_state(db, complete=True)


# ---------------------------------------------------------------------------
# Setup gate middleware
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("reset_to_pending")
def test_gate_returns_503_for_arbitrary_path_when_setup_pending() -> None:
    with TestClient(app) as client:
        r = client.get(f"{settings.API_V1_STR}/users/me")
    assert r.status_code == 503
    assert "first-time setup" in r.text.lower()


def test_gate_allows_get_setup_when_pending(reset_to_pending: str) -> None:
    token = reset_to_pending
    with TestClient(app) as client:
        r = client.get(f"/setup?token={token}")
    assert r.status_code == 200


@pytest.mark.usefixtures("reset_to_pending")
def test_gate_allows_health_check_when_pending() -> None:
    with TestClient(app) as client:
        r = client.get(f"{settings.API_V1_STR}/health")
    assert r.status_code == 200


@pytest.mark.usefixtures("reset_to_complete")
def test_gate_is_open_when_setup_complete() -> None:
    with TestClient(app) as client:
        # An unauthenticated request should still flow through (and get a
        # normal 401 from the auth dep), not be blocked by the gate.
        r = client.get(f"{settings.API_V1_STR}/users/me")
    assert r.status_code != 503


# ---------------------------------------------------------------------------
# /setup endpoints
# ---------------------------------------------------------------------------


@pytest.mark.usefixtures("reset_to_pending")
def test_get_setup_rejects_wrong_token() -> None:
    with TestClient(app) as client:
        r = client.get("/setup?token=not-the-real-token")
    assert r.status_code == 403


@pytest.mark.usefixtures("reset_to_complete")
def test_get_setup_when_complete_returns_410() -> None:
    with TestClient(app) as client:
        r = client.get("/setup?token=anything")
    assert r.status_code == 410


def test_post_setup_creates_first_superuser_and_lifts_gate(
    db: Session, reset_to_pending: str
) -> None:
    token = reset_to_pending
    payload = {
        "token": token,
        "email": "first-admin@example.com",
        "password": "correct-horse-battery-staple",
        "full_name": "First Admin",
    }
    with TestClient(app) as client:
        r = client.post("/setup", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "first-admin@example.com"
    assert body["is_superuser"] is True

    # Setup must now be complete and the token hash erased.
    db.expire_all()
    refreshed = db.get(SetupState, SINGLETON_ID)
    assert refreshed is not None
    assert refreshed.complete is True
    assert refreshed.token_hash is None

    # The created user must exist.
    from sqlmodel import select

    user = db.exec(select(User).where(User.email == "first-admin@example.com")).first()
    assert user is not None
    assert user.is_superuser is True

    # Cleanup the user we just created so other tests don't see it.
    db.delete(user)
    db.commit()


@pytest.mark.usefixtures("reset_to_pending")
def test_post_setup_rejects_wrong_token() -> None:
    payload = {
        "token": "definitely-wrong",
        "email": "rogue@example.com",
        "password": "correct-horse-battery-staple",
    }
    with TestClient(app) as client:
        r = client.post("/setup", json=payload)
    assert r.status_code == 403


@pytest.mark.usefixtures("reset_to_complete")
def test_post_setup_when_complete_returns_410() -> None:
    payload = {
        "token": "anything",
        "email": "late@example.com",
        "password": "correct-horse-battery-staple",
    }
    with TestClient(app) as client:
        r = client.post("/setup", json=payload)
    assert r.status_code == 410
