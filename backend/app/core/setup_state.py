"""First-boot admin onboarding state.

A single-row table tracking whether token-gated setup has been completed.
The token itself is never persisted — only its HMAC-SHA256 digest using
``settings.INITIAL_ADMIN_TOKEN_PEPPER`` as the key. The plaintext is shown
once in the container log on first boot, Jupyter-style.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

from sqlmodel import Field, Session, SQLModel, select

from app.core.config import settings

SETUP_TOKEN_BYTES = 48
SINGLETON_ID = 1


class SetupState(SQLModel, table=True):
    """Singleton row controlling the first-boot setup gate."""

    __tablename__ = "setup_state"

    id: int = Field(default=SINGLETON_ID, primary_key=True)
    complete: bool = Field(default=False)
    token_hash: str | None = Field(default=None, max_length=128)


def hash_setup_token(token: str) -> str:
    """HMAC-SHA256 the token with the configured pepper. Hex digest."""
    return hmac.new(
        settings.INITIAL_ADMIN_TOKEN_PEPPER.encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_setup_token(token: str, token_hash: str) -> bool:
    """Constant-time comparison of a plaintext token against a stored hash."""
    return hmac.compare_digest(hash_setup_token(token), token_hash)


def get_state(session: Session) -> SetupState | None:
    return session.exec(select(SetupState).where(SetupState.id == SINGLETON_ID)).first()


def ensure_state_with_token(session: Session) -> tuple[SetupState, str | None]:
    """Idempotent: ensure a SetupState row exists and return ``(state, token)``.

    - No row at all → create one with a fresh token; return ``(state, token)``.
    - Row exists with ``complete=True`` → return ``(state, None)``.
    - Row exists with ``complete=False`` → return ``(state, None)``. The
      token was only ever returned at creation time; it is not recoverable.
    """
    state = get_state(session)
    if state is None:
        token = secrets.token_urlsafe(SETUP_TOKEN_BYTES)
        state = SetupState(
            id=SINGLETON_ID, complete=False, token_hash=hash_setup_token(token)
        )
        session.add(state)
        session.commit()
        session.refresh(state)
        return state, token
    return state, None


def mark_complete(session: Session, state: SetupState) -> SetupState:
    state.complete = True
    state.token_hash = None
    session.add(state)
    session.commit()
    session.refresh(state)
    return state
