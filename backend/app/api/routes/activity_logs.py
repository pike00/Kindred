"""Read-only endpoint for the audit activity log."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import visible_contact_ids
from app.models import ActivityLog, ActivityLogsPublic, ContactTag, Tag, TagShare

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


@router.get("/", response_model=ActivityLogsPublic)
def list_activity_logs(
    session: SessionDep,
    current_user: CurrentUser,
    entity_type: str | None = Query(default=None),
    entity_id: uuid.UUID | None = Query(default=None),
    tag_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
) -> Any:
    """Return activity log entries for entities visible to the current user.

    Owned logs (any entity type) are always included.  Contact-entity logs are
    also included when the contact is visible via a TagShare grant.
    """
    visible = visible_contact_ids(current_user)
    base = select(ActivityLog).where(
        or_(
            ActivityLog.owner_id == current_user.id,
            and_(
                ActivityLog.entity_type == "contact",
                ActivityLog.entity_id.in_(visible),
            ),
        )
    )

    if tag_id is not None:
        has_access = session.exec(
            select(Tag.id).where(
                Tag.id == tag_id,
                or_(
                    Tag.owner_id == current_user.id,
                    select(TagShare.tag_id)
                    .where(
                        TagShare.tag_id == tag_id,
                        TagShare.grantee_id == current_user.id,
                    )
                    .exists(),
                ),
            )
        ).first()
        if has_access is None:
            raise HTTPException(status_code=403)
        contacts_for_tag = select(ContactTag.contact_id).where(
            ContactTag.tag_id == tag_id
        )
        base = base.where(
            ActivityLog.entity_type == "contact",
            ActivityLog.entity_id.in_(contacts_for_tag),
        )

    if entity_type is not None:
        base = base.where(ActivityLog.entity_type == entity_type)
    if entity_id is not None:
        base = base.where(ActivityLog.entity_id == entity_id)

    count = session.exec(select(func.count()).select_from(base.subquery())).one()
    rows = session.exec(
        base.order_by(ActivityLog.occurred_at.desc()).offset(offset).limit(limit)  # type: ignore[union-attr]
    ).all()
    return ActivityLogsPublic(data=list(rows), count=count)
