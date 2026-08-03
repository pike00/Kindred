import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ActivityLog,
    AllContactsShare,
    AllContactsSharePublic,
    AllContactsSharesPublic,
    User,
)

router = APIRouter(prefix="/contact-shares", tags=["contact-shares"])


class _ShareIn(BaseModel):
    grantee_id: uuid.UUID | None = None
    grantee_email: str | None = None


def _resolve_grantee(session: SessionDep, body: _ShareIn) -> User | None:
    if body.grantee_id is not None:
        return session.get(User, body.grantee_id)
    if body.grantee_email is not None:
        return session.exec(select(User).where(User.email == body.grantee_email)).first()
    return None


@router.post("/", response_model=AllContactsSharePublic)
def create_contact_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    body: _ShareIn,
) -> AllContactsSharePublic:
    grantee = _resolve_grantee(session, body)
    if grantee is None or not grantee.is_active:
        raise HTTPException(status_code=404, detail="Grantee not found")
    if grantee.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot share contacts with yourself")

    existing = session.get(AllContactsShare, (current_user.id, grantee.id))
    if existing is not None:
        return AllContactsSharePublic(
            grantee_id=existing.grantee_id,
            grantee_email=grantee.email,
            created_at=existing.created_at,
        )

    share = AllContactsShare(owner_id=current_user.id, grantee_id=grantee.id)
    session.add(share)
    session.add(
        ActivityLog(
            owner_id=current_user.id,
            actor_id=current_user.id,
            entity_type="AllContactsShare",
            entity_id=grantee.id,
            action="create",
            changes_json={
                "scope": "all_contacts",
                "grantee_id": str(grantee.id),
                "grantee_email": grantee.email,
            },
        )
    )
    session.commit()
    session.refresh(share)

    return AllContactsSharePublic(
        grantee_id=share.grantee_id,
        grantee_email=grantee.email,
        created_at=share.created_at,
    )


@router.get("/", response_model=AllContactsSharesPublic)
def list_contact_shares(
    *,
    session: SessionDep,
    current_user: CurrentUser,
) -> AllContactsSharesPublic:
    rows = session.exec(
        select(AllContactsShare, User)
        .join(User, User.id == AllContactsShare.grantee_id)
        .where(AllContactsShare.owner_id == current_user.id)
    ).all()
    data = [
        AllContactsSharePublic(
            grantee_id=share.grantee_id,
            grantee_email=grantee.email,
            created_at=share.created_at,
        )
        for share, grantee in rows
    ]
    return AllContactsSharesPublic(data=data, count=len(data))


@router.delete("/{grantee_id}")
def delete_contact_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    grantee_id: uuid.UUID,
) -> dict[str, str]:
    share = session.get(AllContactsShare, (current_user.id, grantee_id))
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")

    grantee = session.get(User, grantee_id)
    session.delete(share)
    session.add(
        ActivityLog(
            owner_id=current_user.id,
            actor_id=current_user.id,
            entity_type="AllContactsShare",
            entity_id=grantee_id,
            action="delete",
            changes_json={
                "scope": "all_contacts",
                "grantee_id": str(grantee_id),
                "grantee_email": grantee.email if grantee is not None else "unknown",
            },
        )
    )
    session.commit()
    return {"message": "Share removed"}
