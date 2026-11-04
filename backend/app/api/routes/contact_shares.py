import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ActivityLog,
    AllContactsShare,
    AllContactsSharePublic,
    AllContactsSharesPublic,
    Message,
    User,
)

router = APIRouter(prefix="/contact-shares", tags=["contact-shares"])


class ContactShareIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    grantee_email: EmailStr


def _resolve_grantee(session: SessionDep, body: ContactShareIn) -> User | None:
    return session.exec(select(User).where(User.email == body.grantee_email)).first()


@router.post("/", response_model=AllContactsSharePublic)
def create_contact_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    body: ContactShareIn,
) -> AllContactsSharePublic:
    grantee = _resolve_grantee(session, body)
    if grantee is None or not grantee.is_active:
        raise HTTPException(status_code=404, detail="Grantee not found")
    if grantee.id == current_user.id:
        raise HTTPException(
            status_code=400, detail="Cannot share contacts with yourself"
        )

    existing = session.get(AllContactsShare, (current_user.id, grantee.id))
    if existing is not None:
        return AllContactsSharePublic(
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
            entity_id=current_user.id,
            action="create",
            changes_json={
                "scope": "all_contacts",
                "grantee_email": grantee.email,
            },
        )
    )
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        existing = session.get(AllContactsShare, (current_user.id, grantee.id))
        if existing is None:
            raise
        return AllContactsSharePublic(
            grantee_email=grantee.email,
            created_at=existing.created_at,
        )
    session.refresh(share)

    return AllContactsSharePublic(
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
            grantee_email=grantee.email,
            created_at=share.created_at,
        )
        for share, grantee in rows
    ]
    return AllContactsSharesPublic(data=data, count=len(data))


def _delete_share(
    *,
    session: SessionDep,
    current_user: User,
    share: AllContactsShare,
    grantee: User,
) -> Message:
    session.delete(share)
    session.add(
        ActivityLog(
            owner_id=current_user.id,
            actor_id=current_user.id,
            entity_type="AllContactsShare",
            entity_id=current_user.id,
            action="delete",
            changes_json={
                "scope": "all_contacts",
                "grantee_email": grantee.email,
            },
        )
    )
    session.commit()
    return Message(message="Share removed")


@router.delete("/", response_model=Message)
def delete_contact_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    grantee_email: EmailStr,
) -> Message:
    row = session.exec(
        select(AllContactsShare, User)
        .join(User, User.id == AllContactsShare.grantee_id)
        .where(
            AllContactsShare.owner_id == current_user.id,
            User.email == grantee_email,
        )
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Share not found")

    share, grantee = row
    return _delete_share(
        session=session,
        current_user=current_user,
        share=share,
        grantee=grantee,
    )


@router.delete("/{grantee_id}", response_model=Message, include_in_schema=False)
def delete_contact_share_by_grantee_id(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    grantee_id: uuid.UUID,
) -> Message:
    """Compatibility path for clients holding IDs from before the disclosure fix."""
    share = session.get(AllContactsShare, (current_user.id, grantee_id))
    grantee = session.get(User, grantee_id)
    if share is None or grantee is None:
        raise HTTPException(status_code=404, detail="Share not found")

    return _delete_share(
        session=session,
        current_user=current_user,
        share=share,
        grantee=grantee,
    )
