"""Read-only endpoint for the audit activity log."""

import uuid
from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import func
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import ActivityLog, ActivityLogsPublic

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


@router.get("/", response_model=ActivityLogsPublic)
def list_activity_logs(
    session: SessionDep,
    current_user: CurrentUser,
    entity_type: str | None = Query(default=None),
    entity_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
) -> Any:
    """Return activity log entries owned by the current user."""
    base = select(ActivityLog).where(ActivityLog.owner_id == current_user.id)
    if entity_type is not None:
        base = base.where(ActivityLog.entity_type == entity_type)
    if entity_id is not None:
        base = base.where(ActivityLog.entity_id == entity_id)

    count = session.exec(select(func.count()).select_from(base.subquery())).one()
    rows = session.exec(
        base.order_by(ActivityLog.occurred_at.desc()).offset(offset).limit(limit)  # type: ignore[union-attr]
    ).all()
    return ActivityLogsPublic(data=list(rows), count=count)
