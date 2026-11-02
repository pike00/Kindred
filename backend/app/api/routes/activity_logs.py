"""Read-only endpoint for the audit activity log."""

import uuid

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep
from app.audit import TagAccessDenied, query_activity_logs
from app.models import ActivityLog, ActivityLogPublic, ActivityLogsPublic

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


def _to_public_activity_log(log: ActivityLog) -> ActivityLogPublic:
    changes_json = dict(log.changes_json) if log.changes_json is not None else None
    entity_id = log.entity_id
    if log.entity_type == "AllContactsShare":
        # Contact-share logs are owner-scoped. Keep legacy rows from disclosing
        # the grantee's user UUID through either the entity key or audit payload.
        entity_id = log.owner_id
        if changes_json is not None:
            changes_json.pop("grantee_id", None)

    return ActivityLogPublic(
        id=log.id,
        owner_id=log.owner_id,
        actor_id=log.actor_id,
        entity_type=log.entity_type,
        entity_id=entity_id,
        action=log.action,
        changes_json=changes_json,
        occurred_at=log.occurred_at,
    )


@router.get("/", response_model=ActivityLogsPublic)
def list_activity_logs(
    session: SessionDep,
    current_user: CurrentUser,
    entity_type: str | None = Query(default=None),
    entity_id: uuid.UUID | None = Query(default=None),
    tag_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
) -> ActivityLogsPublic:
    """Return activity log entries for entities visible to the current user.

    Owned logs (any entity type) are always included.  Contact-entity logs are
    also included when the contact is visible via a TagShare grant.
    """
    if entity_type == "AllContactsShare" and entity_id is not None:
        # Historical rows stored the grantee UUID as entity_id. The public
        # contract now identifies these owner-scoped logs by the owner UUID.
        if entity_id != current_user.id:
            return ActivityLogsPublic(data=[], count=0)
        entity_id = None

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
    return ActivityLogsPublic(
        data=[_to_public_activity_log(log) for log in rows],
        count=count,
    )
