"""Read-only endpoint for the audit activity log."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep
from app.audit import TagAccessDenied, query_activity_logs
from app.models import ActivityLogsPublic

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
    try:
        rows, count = query_activity_logs(
            session=session,
            current_user=current_user,
            entity_type=entity_type,
            entity_id=entity_id,
            tag_id=tag_id,
            limit=limit,
            offset=offset,
        )
    except TagAccessDenied:
        raise HTTPException(status_code=403)
    return ActivityLogsPublic(data=rows, count=count)
