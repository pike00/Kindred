"""Audit subsystem: a before_flush listener that writes ActivityLog rows for
audited entities, plus a query helper that scopes reads via ownership and
TagShare grants.

Import this module at app startup (main.py) to activate the listener.
actor_id is read from session.info["actor_id"], which is stamped by the
get_current_user dependency in deps.py for every authenticated request.
"""

import enum
import uuid
from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import and_, event, func, or_
from sqlalchemy.orm import Session
from sqlmodel import select

from app.models import (
    ActivityLog,
    Address,
    Contact,
    ContactField,
    ContactTag,
    Debt,
    Gift,
    Interaction,
    InteractionAttendee,
    LifeEvent,
    MediaRecommendation,
    Note,
    Pet,
    Relationship,
    Reminder,
    Tag,
    TagShare,
    User,
)

_AUDITABLE: dict[type, str] = {
    Contact: "contact",
    Interaction: "interaction",
    Note: "note",
    Reminder: "reminder",
    Gift: "gift",
    Debt: "debt",
    LifeEvent: "life_event",
    Address: "address",
    ContactField: "contact_field",
    Relationship: "relationship",
    Pet: "pet",
    MediaRecommendation: "media_recommendation",
}

_SKIP_FIELDS = frozenset({"id", "owner_id", "updated_at", "created_at"})


def _serialize(val: object) -> object:
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, enum.Enum):
        return val.value
    return val


def _owner_for(instance: object, session: Session) -> uuid.UUID | None:
    if hasattr(instance, "owner_id"):
        return instance.owner_id  # type: ignore[union-attr]
    contact_id = getattr(instance, "contact_id", None)
    if contact_id is not None:
        contact = session.get(Contact, contact_id)
        if contact is not None:
            return contact.owner_id
    return None


def _rel_keys(instance: object) -> frozenset[str]:
    mapper = sa.inspect(type(instance))
    return frozenset(r.key for r in mapper.relationships)


def _snapshot(instance: object) -> dict:
    state = sa.inspect(instance)
    rels = _rel_keys(instance)
    snap: dict = {}
    for attr in state.attrs:
        if attr.key in rels or attr.key in _SKIP_FIELDS:
            continue
        val = getattr(instance, attr.key, None)
        if val is not None:
            snap[attr.key] = {"old": None, "new": _serialize(val)}
    return snap


def _diff(instance: object) -> dict:
    state = sa.inspect(instance)
    rels = _rel_keys(instance)
    diff: dict = {}
    for attr in state.attrs:
        if attr.key in rels or attr.key in _SKIP_FIELDS:
            continue
        hist = attr.history
        if hist.has_changes():
            old = hist.deleted[0] if hist.deleted else None
            new = hist.added[0] if hist.added else None
            diff[attr.key] = {"old": _serialize(old), "new": _serialize(new)}
    return diff


@event.listens_for(Session, "before_flush")
def _audit_before_flush(
    session: Session,
    _flush_context: object,
    _instances: object,
) -> None:
    actor_id: uuid.UUID | None = session.info.get("actor_id")
    logs: list[ActivityLog] = []

    # Collect InteractionAttendee changes grouped by interaction_id
    ia_added: dict[uuid.UUID, list[uuid.UUID]] = {}
    ia_removed: dict[uuid.UUID, list[uuid.UUID]] = {}

    for instance in list(session.new):
        if isinstance(instance, ActivityLog):
            continue
        if isinstance(instance, InteractionAttendee):
            ia_added.setdefault(instance.interaction_id, []).append(instance.contact_id)
            continue
        if type(instance) not in _AUDITABLE:
            continue
        owner_id = _owner_for(instance, session)
        if owner_id is None:
            continue
        logs.append(
            ActivityLog(
                owner_id=owner_id,
                actor_id=actor_id,
                entity_type=_AUDITABLE[type(instance)],
                entity_id=instance.id,
                action="create",
                changes_json=_snapshot(instance),
            )
        )

    for instance in list(session.deleted):
        if isinstance(instance, ActivityLog):
            continue
        if isinstance(instance, InteractionAttendee):
            ia_removed.setdefault(instance.interaction_id, []).append(
                instance.contact_id
            )
            continue
        if type(instance) not in _AUDITABLE:
            continue
        owner_id = _owner_for(instance, session)
        if owner_id is None:
            continue
        logs.append(
            ActivityLog(
                owner_id=owner_id,
                actor_id=actor_id,
                entity_type=_AUDITABLE[type(instance)],
                entity_id=instance.id,
                action="delete",
                changes_json=None,
            )
        )

    for instance in list(session.dirty):
        if isinstance(instance, ActivityLog):
            continue
        if type(instance) not in _AUDITABLE:
            continue
        diff = _diff(instance)
        if not diff:
            continue
        owner_id = _owner_for(instance, session)
        if owner_id is None:
            continue
        # Soft-delete on Contact: an UPDATE that flips `deleted_at` is logged
        # as a "delete" or "restore" action so audit consumers see the same
        # semantics as a hard delete.
        action = "update"
        if isinstance(instance, Contact) and "deleted_at" in diff:
            entry = diff["deleted_at"]
            if entry["old"] is None and entry["new"] is not None:
                action = "delete"
                diff = None  # mirror hard-delete payload shape
            elif entry["old"] is not None and entry["new"] is None:
                action = "restore"
        logs.append(
            ActivityLog(
                owner_id=owner_id,
                actor_id=actor_id,
                entity_type=_AUDITABLE[type(instance)],
                entity_id=instance.id,
                action=action,
                changes_json=diff,
            )
        )

    # Resolve InteractionAttendee changes into log entries
    for interaction_id in set(ia_added) | set(ia_removed):
        added = ia_added.get(interaction_id, [])
        removed = ia_removed.get(interaction_id, [])

        # If we already built a "create" log for this interaction this flush,
        # fold attendees into it rather than emitting a separate entry.
        # IMPORTANT: check this before session.get() — during the autoflush
        # triggered by session.get(Contact, ...) inside create_interaction, the
        # Interaction is still pending and not yet in the DB, so session.get()
        # returns None. The create_log in `logs` is the authoritative source.
        create_log = next(
            (
                entry
                for entry in logs
                if entry.entity_type == "interaction"
                and str(entry.entity_id) == str(interaction_id)
                and entry.action == "create"
            ),
            None,
        )
        if create_log is not None:
            if create_log.changes_json is None:
                create_log.changes_json = {}
            create_log.changes_json["attendees"] = [str(c) for c in added]
            continue

        # update_attendees path: interaction is already persisted, look it up.
        interaction = session.get(Interaction, interaction_id)
        if interaction is None:
            continue

        logs.append(
            ActivityLog(
                owner_id=interaction.owner_id,
                actor_id=actor_id,
                entity_type="interaction",
                entity_id=interaction_id,
                action="update_attendees",
                changes_json={
                    "added": [str(c) for c in added],
                    "removed": [str(c) for c in removed],
                },
            )
        )

    for log in logs:
        session.add(log)


class TagAccessDenied(Exception):
    """Raised by query_activity_logs when the caller lacks access to tag_id."""


def query_activity_logs(
    *,
    session: Session,
    current_user: User,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    tag_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ActivityLog], int]:
    """Return (rows, total_count) of activity logs visible to current_user.

    Visibility:
    - Owned logs (any entity type) are always included.
    - Contact-entity logs are also included when the contact is visible to the
      caller via a TagShare grant (resolved through visible_contact_ids).

    When tag_id is given, the result is narrowed to contact-entity logs whose
    contact bears that tag, and the caller must own the tag or have a
    TagShare grant on it (else TagAccessDenied is raised).
    """
    # Local import avoids circular import (crud → models, audit registers
    # the listener at import time).
    from app.crud import visible_contact_ids

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
            raise TagAccessDenied
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
        base.order_by(ActivityLog.occurred_at.desc())  # type: ignore[union-attr]
        .offset(offset)
        .limit(limit)
    ).all()
    return list(rows), count
