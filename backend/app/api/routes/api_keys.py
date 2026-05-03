"""Manage API keys for machine-to-machine access.

Keys are owned by the calling user. They authenticate as that user by
default; with ``X-On-Behalf-Of: <user_id>`` they act as a different user
listed in the key's impersonation whitelist.

The plaintext key is returned **only** in the create response. After
that, only the prefix is visible — losing the plaintext means rotating
the key.
"""

import uuid

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    APIKey,
    APIKeyCreate,
    APIKeyCreated,
    APIKeyImpersonate,
    APIKeyPublic,
    APIKeysPublic,
    Message,
    User,
)

router = APIRouter(prefix="/users/me/api-keys", tags=["api-keys"])


def _to_public(api_key: APIKey, can_impersonate: list[uuid.UUID]) -> APIKeyPublic:
    return APIKeyPublic(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        owned_by_user_id=api_key.owned_by_user_id,
        can_impersonate=can_impersonate,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        revoked_at=api_key.revoked_at,
        expires_at=api_key.expires_at,
    )


@router.post("/", response_model=APIKeyCreated, status_code=201)
def create_my_api_key(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    key_in: APIKeyCreate,
) -> APIKeyCreated:
    """Create a new API key. Returns the plaintext token once — store it now."""
    # Validate every requested impersonation target exists and is active.
    for target_id in key_in.can_impersonate:
        if target_id == current_user.id:
            continue
        target = session.get(User, target_id)
        if target is None or not target.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot impersonate user {target_id}: not found or inactive",
            )

    api_key, plaintext = crud.create_api_key(
        session=session, owner_id=current_user.id, key_in=key_in
    )
    targets = crud.get_api_key_impersonate_targets(
        session=session, api_key_id=api_key.id
    )
    public = _to_public(api_key, targets)
    return APIKeyCreated(**public.model_dump(), plaintext_key=plaintext)


@router.get("/", response_model=APIKeysPublic)
def list_my_api_keys(
    *, session: SessionDep, current_user: CurrentUser
) -> APIKeysPublic:
    keys = crud.list_api_keys(session=session, owner_id=current_user.id)
    if not keys:
        return APIKeysPublic(data=[], count=0)

    # Batch-load impersonation targets to avoid N+1.
    rows = session.exec(
        select(APIKeyImpersonate).where(
            APIKeyImpersonate.api_key_id.in_([k.id for k in keys])
        )
    ).all()
    by_key: dict[uuid.UUID, list[uuid.UUID]] = {}
    for row in rows:
        by_key.setdefault(row.api_key_id, []).append(row.user_id)

    data = [_to_public(k, by_key.get(k.id, [])) for k in keys]
    return APIKeysPublic(data=data, count=len(data))


@router.delete("/{api_key_id}", response_model=Message)
def revoke_my_api_key(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    api_key_id: uuid.UUID,
) -> Message:
    """Revoke a key. Idempotent: revoking an already-revoked key returns 200."""
    api_key = session.get(APIKey, api_key_id)
    if api_key is None or api_key.owned_by_user_id != current_user.id:
        # Don't leak the existence of keys owned by other users.
        raise HTTPException(status_code=404, detail="API key not found")
    if api_key.revoked_at is None:
        crud.revoke_api_key(session=session, api_key=api_key)
    return Message(message="API key revoked")
