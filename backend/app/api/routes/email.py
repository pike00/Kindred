"""Email ingestion API routes.

Handles Gmail OAuth2 flow, IMAP configuration, and email polling.
"""

import json
import logging
import secrets
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response
from redis import Redis
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.crud import (
    create_email_oauth_token,
    delete_email_oauth_token,
    list_email_oauth_tokens,
)
from app.email_service import (
    exchange_gmail_code,
    get_gmail_auth_url,
    process_email_for_contact,
)
from app.models import (
    Contact,
    EmailOAuthToken,
    EmailOAuthTokenCreate,
    EmailOAuthTokenPublic,
    EmailOAuthTokensPublic,
    User,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email"])
_OAUTH_STATE_TTL_SECONDS = 600
_OAUTH_STATE_COOKIE = "kindred_gmail_oauth_state"


def _oauth_state_key(state: str) -> str:
    return f"kindred:gmail-oauth-state:{state}"


def _get_oauth_redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/oauth/authorize")
def gmail_authorize(
    request: Request,
    session: SessionDep,
    current_user: CurrentUser,
    response: Response,
    contact_id: uuid.UUID = Query(
        ..., description="Contact ID to associate with this email"
    ),
    email_address: str = Query(..., description="Email address being authorized"),
) -> dict[str, Any]:
    """Get Gmail OAuth2 authorization URL.

    The state parameter will encode the contact_id and email_address.
    """
    contact = session.get(Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")

    state = secrets.token_urlsafe(32)
    redis = _get_oauth_redis()
    redis.set(
        _oauth_state_key(state),
        json.dumps(
            {
                "user_id": str(current_user.id),
                "contact_id": str(contact_id),
                "email_address": email_address,
            }
        ),
        ex=_OAUTH_STATE_TTL_SECONDS,
    )
    auth_url, _ = get_gmail_auth_url(state)
    response.set_cookie(
        _OAUTH_STATE_COOKIE,
        state,
        max_age=_OAUTH_STATE_TTL_SECONDS,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
        path=f"{settings.API_V1_STR}/email/oauth",
    )
    return {"authorization_url": auth_url, "state": state}


@router.get("/oauth/callback")
def gmail_callback(
    request: Request,
    response: Response,
    session: SessionDep,
    code: str = Query(...),
    state: str = Query(...),
) -> dict[str, Any]:
    """Handle Gmail OAuth2 callback and store encrypted tokens.

    The state is an opaque, one-time server-side value.
    """
    try:
        cookie_state = request.cookies.get(_OAUTH_STATE_COOKIE)
        if not cookie_state or not secrets.compare_digest(cookie_state, state):
            raise ValueError("OAuth state cookie does not match")
        redis = _get_oauth_redis()
        serialized_state = redis.getdel(_oauth_state_key(state))
        if not serialized_state:
            raise ValueError("State not found or expired")
        state_data = json.loads(serialized_state)
        user_id = uuid.UUID(str(state_data["user_id"]))
        contact_id = uuid.UUID(str(state_data["contact_id"]))
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Verify contact exists and belongs to user
    current_user = session.get(User, user_id)
    if not current_user or not current_user.is_active:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    contact = session.get(Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Exchange code for tokens
    try:
        token_data = exchange_gmail_code(code)
    except Exception as e:
        logger.error(f"Failed to exchange Gmail code: {e}")
        raise HTTPException(
            status_code=400, detail="Failed to exchange authorization code"
        )

    verified_email_address = token_data.get("email_address")
    if not verified_email_address:
        raise HTTPException(
            status_code=400,
            detail="Could not verify the Gmail account address",
        )

    # Encryption happens in the persistence boundary.
    token_in = EmailOAuthTokenCreate(
        provider="gmail",
        email_address=verified_email_address,
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        token_expires_at=token_data.get("token_expires_at"),
    )

    token_row = create_email_oauth_token(
        session=session,
        token_in=token_in,
        owner_id=current_user.id,
        contact_id=contact_id,
    )
    response.delete_cookie(
        _OAUTH_STATE_COOKIE,
        path=f"{settings.API_V1_STR}/email/oauth",
    )

    return {
        "ok": True,
        "token_id": str(token_row.id),
        "email_address": verified_email_address,
        "message": "Gmail account connected successfully",
    }


@router.get("/tokens", response_model=EmailOAuthTokensPublic)
def list_email_tokens(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID | None = Query(None),
) -> Any:
    """List configured email OAuth tokens for the current user."""
    tokens = list_email_oauth_tokens(
        session=session,
        owner_id=current_user.id,
        contact_id=contact_id,
    )
    return EmailOAuthTokensPublic(
        data=[EmailOAuthTokenPublic.model_validate(t) for t in tokens],
        count=len(tokens),
    )


@router.delete("/tokens/{token_id}")
def delete_email_token(
    session: SessionDep,
    current_user: CurrentUser,
    token_id: uuid.UUID,
) -> dict[str, str]:
    """Delete an email OAuth token."""
    token_row = session.get(EmailOAuthToken, token_id)
    if not token_row or token_row.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Token not found")

    success = delete_email_oauth_token(session=session, token_id=token_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete token")

    return {"ok": "true"}


@router.post("/poll/all")
def poll_all_emails(
    session: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Poll every auto-logged email account owned by the current user."""
    from app.email_service import poll_all_email_accounts

    results = poll_all_email_accounts(session=session, owner_id=current_user.id)
    total = sum(results.values())

    return {
        "ok": True,
        "total_new_interactions": total,
        "results": results,
        "message": f"Created {total} new interaction(s) from email",
    }


@router.post("/poll/{contact_id}")
def poll_contact_email(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> dict[str, Any]:
    """Manually trigger email polling for a contact.

    Processes emails and creates Interaction records for matched messages.
    """
    contact = session.get(Contact, contact_id)
    if not contact or contact.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Contact not found")

    if not contact.auto_log_email:
        raise HTTPException(
            status_code=400,
            detail="Email auto-logging is not enabled for this contact",
        )

    # Find OAuth token for this contact
    token_row = session.exec(
        select(EmailOAuthToken).where(
            EmailOAuthToken.contact_id == contact_id,
            EmailOAuthToken.owner_id == current_user.id,
        )
    ).first()

    if not token_row:
        raise HTTPException(
            status_code=404,
            detail="No email OAuth token found for this contact",
        )

    # Process emails (run in background for large mailboxes)

    count = process_email_for_contact(
        session=session,
        owner_id=current_user.id,
        token_row=token_row,
    )

    return {
        "ok": True,
        "new_interactions": count,
        "message": f"Created {count} new interaction(s) from email",
    }
