import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import Tag, TagShare, TagSharePublic, TagSharesPublic, User

router = APIRouter(prefix="/tag-shares", tags=["tag-shares"])


class _ShareIn(BaseModel):
    tag_id: uuid.UUID
    grantee_id: uuid.UUID


@router.post("/", response_model=TagSharePublic)
def create_tag_share(
    *, session: SessionDep, current_user: CurrentUser, body: _ShareIn
) -> TagSharePublic:
    tag = session.get(Tag, body.tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    grantee = session.get(User, body.grantee_id)
    if not grantee or not grantee.is_active:
        raise HTTPException(status_code=404, detail="Grantee not found")
    existing = session.get(TagShare, (body.tag_id, body.grantee_id))
    if existing:
        return TagSharePublic(
            tag_id=existing.tag_id,
            grantee_id=existing.grantee_id,
            grantee_email=grantee.email,
            created_at=existing.created_at,
        )
    share = TagShare(tag_id=body.tag_id, grantee_id=body.grantee_id)
    session.add(share)
    session.commit()
    session.refresh(share)
    return TagSharePublic(
        tag_id=share.tag_id,
        grantee_id=share.grantee_id,
        grantee_email=grantee.email,
        created_at=share.created_at,
    )


@router.get("/", response_model=TagSharesPublic)
def list_tag_shares(
    *, session: SessionDep, current_user: CurrentUser, tag_id: uuid.UUID
) -> TagSharesPublic:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    rows = session.exec(
        select(TagShare, User)
        .join(User, User.id == TagShare.grantee_id)
        .where(TagShare.tag_id == tag_id)
    ).all()
    data = [
        TagSharePublic(
            tag_id=s.tag_id,
            grantee_id=s.grantee_id,
            grantee_email=u.email,
            created_at=s.created_at,
        )
        for s, u in rows
    ]
    return TagSharesPublic(data=data, count=len(data))


@router.delete("/{tag_id}/{grantee_id}")
def delete_tag_share(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tag_id: uuid.UUID,
    grantee_id: uuid.UUID,
) -> dict[str, str]:
    tag = session.get(Tag, tag_id)
    if not tag or tag.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")
    share = session.get(TagShare, (tag_id, grantee_id))
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    session.delete(share)
    session.commit()
    return {"message": "Share removed"}
