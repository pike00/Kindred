"""OAuth-based contact import endpoints (Google People API; iCloud later)."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, HTTPException, status
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core import crypto, security
from app.core.config import settings
from app.models import OAuthCredential, OAuthCredentialPublic, OAuthProvider

router = APIRouter(prefix="/contacts/import", tags=["contact-imports"])


# --- Google constants -------------------------------------------------------

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = ("https://www.googleapis.com/auth/contacts.readonly",)
STATE_TTL = timedelta(minutes=10)
STATE_AUDIENCE = "contact-import-oauth"


# --- Schemas ----------------------------------------------------------------


class AuthorizeResponse(BaseModel):
    authorize_url: str
    state: str


class ExchangeRequest(BaseModel):
    code: str
    state: str


# --- State token (CSRF-binding the authorize and exchange calls) -----------


def _issue_state(*, user_id: str, provider: OAuthProvider) -> str:
    payload = {
        "sub": user_id,
        "provider": provider.value,
        "aud": STATE_AUDIENCE,
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.now(timezone.utc) + STATE_TTL,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=security.ALGORITHM)


def _verify_state(state: str, *, user_id: str, provider: OAuthProvider) -> None:
    try:
        payload = jwt.decode(
            state,
            settings.SECRET_KEY,
            algorithms=[security.ALGORITHM],
            audience=STATE_AUDIENCE,
        )
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OAuth state: {exc}",
        ) from exc
    if payload.get("sub") != user_id or payload.get("provider") != provider.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state does not match this user/provider",
        )


# --- Google endpoints -------------------------------------------------------


def _require_google_config() -> None:
    if not settings.google_import_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Google import is not configured. Set GOOGLE_OAUTH_CLIENT_ID, "
                "GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI."
            ),
        )


@router.post("/google/authorize", response_model=AuthorizeResponse)
def google_authorize(*, current_user: CurrentUser) -> AuthorizeResponse:
    """Return the Google OAuth consent URL for the current user.

    The frontend redirects window.location to ``authorize_url``. Google
    redirects back to ``GOOGLE_OAUTH_REDIRECT_URI`` with ``code`` and
    ``state``; the frontend then POSTs both to ``/google/exchange``.
    """
    _require_google_config()
    state = _issue_state(user_id=str(current_user.id), provider=OAuthProvider.GOOGLE)
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return AuthorizeResponse(
        authorize_url=f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}",
        state=state,
    )


@router.post("/google/exchange", response_model=OAuthCredentialPublic)
def google_exchange(
    *,
    body: ExchangeRequest,
    session: SessionDep,
    current_user: CurrentUser,
) -> OAuthCredentialPublic:
    """Exchange Google's authorization code for tokens and store them.

    Replaces any existing Google credential for this user (one Google account
    per user). Refresh and access tokens are encrypted at rest with
    :mod:`app.core.crypto`.
    """
    _require_google_config()
    _verify_state(
        body.state, user_id=str(current_user.id), provider=OAuthProvider.GOOGLE
    )

    token_resp = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": body.code,
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=30.0,
    )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google token exchange failed: {token_resp.text}",
        )
    payload: dict[str, Any] = token_resp.json()

    refresh_token = payload.get("refresh_token")
    access_token = payload.get("access_token")
    if not refresh_token or not access_token:
        # Google only issues a refresh_token on first consent unless
        # prompt=consent is sent. We send it, so absence means a real failure.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google did not return a refresh_token; re-consent with offline access required",
        )

    expires_in = int(payload.get("expires_in", 0))
    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        if expires_in
        else None
    )
    granted_scopes = payload.get("scope", " ".join(GOOGLE_SCOPES))

    existing = session.exec(
        select(OAuthCredential).where(
            OAuthCredential.user_id == current_user.id,
            OAuthCredential.provider == OAuthProvider.GOOGLE,
        )
    ).first()

    now = datetime.now(timezone.utc)
    if existing:
        existing.encrypted_refresh_token = crypto.encrypt(refresh_token)
        existing.encrypted_access_token = crypto.encrypt(access_token)
        existing.access_token_expires_at = expires_at
        existing.scopes = granted_scopes
        existing.updated_at = now
        # Re-consent invalidates any prior sync cursor.
        existing.sync_token = None
        cred = existing
    else:
        cred = OAuthCredential(
            user_id=current_user.id,
            provider=OAuthProvider.GOOGLE,
            encrypted_refresh_token=crypto.encrypt(refresh_token),
            encrypted_access_token=crypto.encrypt(access_token),
            access_token_expires_at=expires_at,
            scopes=granted_scopes,
        )
        session.add(cred)

    session.commit()
    session.refresh(cred)

    return OAuthCredentialPublic(
        provider=cred.provider,
        scopes=cred.scopes.split() if cred.scopes else [],
        last_synced_at=cred.last_synced_at,
        created_at=cred.created_at,
        updated_at=cred.updated_at,
    )
