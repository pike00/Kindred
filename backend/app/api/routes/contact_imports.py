"""OAuth-based contact import endpoints (Google People API; iCloud later)."""

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, HTTPException, status
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import CurrentUser, SessionDep
from app.core import crypto, security
from app.core.config import settings
from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    ContactSource,
    OAuthCredential,
    OAuthCredentialPublic,
    OAuthProvider,
)

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


# --- Google People API sync ----------------------------------------------------

GOOGLE_PEOPLE_API_BASE = "https://people.googleapis.com/v1"
PEOPLE_FIELDS = "names,emailAddresses,phoneNumbers,metadata"


class GoogleSyncResult(BaseModel):
    """Summary of what the sync operation did."""

    created: int = Field(description="New contacts created during this sync.")
    updated: int = Field(description="Existing contacts updated during this sync.")
    skipped: int = Field(description="Contacts that were skipped (duplicates, errors).")
    next_sync_token: str | None = Field(
        default=None,
        description="syncToken to use for the next incremental sync.",
    )


class GoogleContactPreview(BaseModel):
    """A single contact from Google, mapped to our schema for preview."""

    resource_name: str = Field(description="Google resourceName (source_external_id).")
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    emails: list[dict[str, str]] = Field(
        default_factory=list, description="List of {label, value} dicts."
    )
    phones: list[dict[str, str]] = Field(
        default_factory=list, description="List of {label, value} dicts."
    )


class GoogleSyncPreviewResponse(BaseModel):
    """Preview of Google contacts before import."""

    contacts: list[GoogleContactPreview]
    next_sync_token: str | None = None
    total_count: int


def _get_valid_access_token(cred: OAuthCredential) -> str:
    """Return a valid access token, refreshing if expired."""
    now = datetime.now(timezone.utc)
    if (
        cred.encrypted_access_token
        and cred.access_token_expires_at
        and cred.access_token_expires_at > now + timedelta(minutes=5)
    ):
        return crypto.decrypt(cred.encrypted_access_token)

    # Refresh the token
    refresh_token = crypto.decrypt(cred.encrypted_refresh_token)
    token_resp = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30.0,
    )
    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to refresh Google access token: {token_resp.text}",
        )
    token_data = token_resp.json()
    access_token = token_data["access_token"]
    expires_in = int(token_data.get("expires_in", 3600))

    cred.encrypted_access_token = crypto.encrypt(access_token)
    cred.access_token_expires_at = now + timedelta(seconds=expires_in)
    return access_token


def _fetch_google_contacts(
    access_token: str, sync_token: str | None
) -> tuple[list[dict[str, Any]], str | None]:
    """Fetch contacts from Google People API, returning (contacts, next_sync_token)."""
    all_connections: list[dict[str, Any]] = []
    next_page_token: str | None = None
    next_sync_token: str | None = None

    while True:
        params: dict[str, Any] = {
            "personFields": PEOPLE_FIELDS,
            "pageSize": 200,
            "requestSyncToken": "true",
        }
        if next_page_token:
            params["pageToken"] = next_page_token
        if sync_token:
            params["syncToken"] = sync_token

        resp = httpx.get(
            f"{GOOGLE_PEOPLE_API_BASE}/people/me/connections",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=30.0,
        )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Google People API error: {resp.text}",
            )
        data = resp.json()
        all_connections.extend(data.get("connections", []))
        next_page_token = data.get("nextPageToken")
        next_sync_token = data.get("nextSyncToken", next_sync_token)
        if not next_page_token:
            break

    return all_connections, next_sync_token


def _map_google_contact(google_person: dict[str, Any]) -> GoogleContactPreview:
    """Map a Google People API person resource to our preview schema."""
    resource_name = google_person.get("resourceName", "")
    names = google_person.get("names", [])
    emails = google_person.get("emailAddresses", [])
    phones = google_person.get("phoneNumbers", [])

    first_name = None
    last_name = None
    middle_name = None
    if names:
        primary_name = names[0]
        first_name = primary_name.get("givenName")
        last_name = primary_name.get("familyName")
        middle_name = primary_name.get("middleName")

    email_list = [
        {"label": e.get("type", "other").lower(), "value": e.get("value", "")}
        for e in emails
        if e.get("value")
    ]
    phone_list = [
        {"label": p.get("type", "other").lower(), "value": p.get("value", "")}
        for p in phones
        if p.get("value")
    ]

    return GoogleContactPreview(
        resource_name=resource_name,
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        emails=email_list,
        phones=phone_list,
    )


def _sync_contact_to_db(
    session: Session,
    user_id: uuid.UUID,
    google_contact: GoogleContactPreview,
) -> str:
    """
    Sync a single Google contact to the database.
    Returns "created", "updated", or "skipped".
    """
    resource_name = google_contact.resource_name
    if not resource_name:
        return "skipped"

    # Check for existing contact by source_external_id
    existing = session.exec(
        select(Contact).where(
            Contact.owner_id == user_id,
            Contact.source_provider == ContactSource.GOOGLE,
            Contact.source_external_id == resource_name,
        )
    ).first()

    if existing:
        # Update existing contact
        if google_contact.first_name:
            existing.first_name = google_contact.first_name
        if google_contact.last_name is not None:
            existing.last_name = google_contact.last_name
        if google_contact.middle_name is not None:
            existing.middle_name = google_contact.middle_name
        existing.updated_at = datetime.now(timezone.utc)

        # Update email/phone fields: delete old ones and recreate
        # (simpler than diffing, and Google is source of truth)
        for old_field in session.exec(
            select(ContactField).where(ContactField.contact_id == existing.id)
        ).all():
            session.delete(old_field)

        _add_contact_fields(session, existing.id, google_contact)
        session.add(existing)
        return "updated"
    else:
        # Create new contact
        new_contact = Contact(
            owner_id=user_id,
            first_name=google_contact.first_name or "Unknown",
            last_name=google_contact.last_name,
            middle_name=google_contact.middle_name,
            source_provider=ContactSource.GOOGLE,
            source_external_id=resource_name,
        )
        session.add(new_contact)
        session.flush()  # Get the ID
        _add_contact_fields(session, new_contact.id, google_contact)
        return "created"


def _add_contact_fields(
    session: Session,
    contact_id: uuid.UUID,
    google_contact: GoogleContactPreview,
) -> None:
    """Add ContactField rows for emails and phones."""
    for email in google_contact.emails:
        session.add(
            ContactField(
                contact_id=contact_id,
                field_type=ContactFieldType.EMAIL,
                label=email["label"],
                value=email["value"],
                is_primary=(email["label"] == "primary"),
            )
        )
    for phone in google_contact.phones:
        session.add(
            ContactField(
                contact_id=contact_id,
                field_type=ContactFieldType.PHONE,
                label=phone["label"],
                value=phone["value"],
                is_primary=(phone["label"] == "primary"),
            )
        )


@router.post("/google/sync", response_model=GoogleSyncResult)
def google_sync(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> GoogleSyncResult:
    """
    Sync contacts from Google People API to the database.

    Uses the stored OAuth credential and syncToken for incremental sync.
    On first run (no syncToken), performs a full sync.
    Updates the stored syncToken for future incremental syncs.
    """
    _require_google_config()

    # Get stored credential
    cred = session.exec(
        select(OAuthCredential).where(
            OAuthCredential.user_id == current_user.id,
            OAuthCredential.provider == OAuthProvider.GOOGLE,
        )
    ).first()

    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Google credential found. Please authorize first via /google/authorize.",
        )

    # Get valid access token (refresh if needed)
    access_token = _get_valid_access_token(cred)

    # Fetch contacts from Google
    sync_token = cred.sync_token
    connections, next_sync_token = _fetch_google_contacts(access_token, sync_token)

    # Sync each contact to DB
    created = 0
    updated = 0
    skipped = 0

    for person in connections:
        try:
            preview = _map_google_contact(person)
            result = _sync_contact_to_db(session, current_user.id, preview)
            if result == "created":
                created += 1
            elif result == "updated":
                updated += 1
            else:
                skipped += 1
        except Exception as e:
            # Log but don't fail the whole sync
            import logging

            logging.getLogger(__name__).warning(
                f"Failed to sync Google contact {person.get('resourceName', 'unknown')}: {e}"
            )
            skipped += 1

    # Update credential with new sync token and timestamp
    if next_sync_token:
        cred.sync_token = next_sync_token
    cred.last_synced_at = datetime.now(timezone.utc)
    session.add(cred)
    session.commit()

    return GoogleSyncResult(
        created=created,
        updated=updated,
        skipped=skipped,
        next_sync_token=next_sync_token,
    )


@router.get("/google/sync/preview", response_model=GoogleSyncPreviewResponse)
def google_sync_preview(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> GoogleSyncPreviewResponse:
    """
    Preview Google contacts without writing to the database.

    Returns the list of contacts that would be imported/updated,
    useful for showing a preview UI before confirming the sync.
    """
    _require_google_config()

    # Get stored credential
    cred = session.exec(
        select(OAuthCredential).where(
            OAuthCredential.user_id == current_user.id,
            OAuthCredential.provider == OAuthProvider.GOOGLE,
        )
    ).first()

    if not cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Google credential found. Please authorize first via /google/authorize.",
        )

    # Get valid access token
    access_token = _get_valid_access_token(cred)

    # Fetch contacts from Google
    sync_token = cred.sync_token
    connections, next_sync_token = _fetch_google_contacts(access_token, sync_token)

    # Map to preview schema
    previews = [_map_google_contact(person) for person in connections]

    return GoogleSyncPreviewResponse(
        contacts=previews,
        next_sync_token=next_sync_token,
        total_count=len(previews),
    )
