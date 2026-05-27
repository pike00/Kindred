"""Contact merge and unmerge service logic.

Handles merging two contacts (absorbing one into another) with full
audit trail via the contact_merge table, and reversing the operation.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Address,
    Contact,
    ContactField,
    ContactMerge,
    ContactTag,
    CustomFieldValue,
    Debt,
    Gift,
    Interaction,
    InteractionAttendee,
    LifeEvent,
    MediaRecommendation,
    Note,
    Relationship,
    Reminder,
)

logger = logging.getLogger(__name__)


def merge_contacts(
    *,
    session: Session,
    surviving_id: str | Contact,
    absorbed_id: str | Contact,
    merged_by: str | None = None,
    notes: str | None = None,
) -> ContactMerge:
    """Merge absorbed contact into surviving contact.

    All child rows (ContactField, Address, Interaction, Note, Relationship, etc.)
    are reassigned to the surviving contact. The absorbed contact is soft-deleted
    via the ``is_merged`` flag so the operation can be undone.

    Two-way relationships are handled by rewriting both ``contact_id`` and
    ``related_contact_id``. If a relationship would become a self-link
    (survivor -> survivor), it is deleted as degenerate.

    Args:
        session: Database session.
        surviving_id: The contact that survives (ID or Contact object).
        absorbed_id: The contact to be absorbed (ID or Contact object).
        merged_by: Optional user ID who performed the merge.
        notes: Optional notes about the merge.

    Returns:
        The ContactMerge audit log entry.

    Raises:
        ValueError: If contacts not found, already merged, or invalid input.
    """
    # Resolve contacts
    if isinstance(surviving_id, str):
        surviving = session.get(Contact, surviving_id)
    else:
        surviving = surviving_id
        surviving_id = str(surviving.id)

    if isinstance(absorbed_id, str):
        absorbed = session.get(Contact, absorbed_id)
    else:
        absorbed = absorbed_id
        absorbed_id = str(absorbed.id)

    if not surviving or not absorbed:
        raise ValueError("One or both contacts not found")

    if str(surviving.id) == str(absorbed.id):
        raise ValueError("Cannot merge a contact into itself")

    if absorbed.is_merged:
        raise ValueError("Contact has already been merged")

    now = datetime.now(timezone.utc)

    # ── Rewrite all FK columns that point to absorbed_id ────────────────
    # Junction tables
    session.exec(
        select(ContactTag)
        .where(ContactTag.contact_id == absorbed.id)
        .update({ContactTag.contact_id: surviving.id})
    )
    session.exec(
        select(InteractionAttendee)
        .where(InteractionAttendee.contact_id == absorbed.id)
        .update({InteractionAttendee.contact_id: surviving.id})
    )

    # Direct child tables
    for model in [
        ContactField,
        Address,
        Interaction,
        Note,
        Reminder,
        Gift,
        Debt,
        LifeEvent,
        MediaRecommendation,
        CustomFieldValue,
    ]:
        session.exec(
            select(model)
            .where(model.contact_id == absorbed.id)
            .update({model.contact_id: surviving.id})
        )

    # ── Handle Relationship table (both directions) ──────────────────────
    # Relationships where absorbed is the "from" contact
    absorbed_as_from = session.exec(
        select(Relationship).where(Relationship.contact_id == absorbed.id)
    ).all()

    for rel in absorbed_as_from:
        if rel.related_contact_id == surviving.id:
            # This would become a self-relationship (survivor -> survivor)
            # Delete it and its inverse
            if rel.inverse_id:
                session.exec(
                    select(Relationship)
                    .where(Relationship.id == rel.inverse_id)
                    .delete()
                )
            session.delete(rel)
        else:
            # Rewrite: absorbed -> X becomes survivor -> X
            rel.contact_id = surviving.id
            session.add(rel)
            # Also update the inverse's related_contact_id
            if rel.inverse_id:
                inverse = session.get(Relationship, rel.inverse_id)
                if inverse:
                    inverse.related_contact_id = surviving.id
                    session.add(inverse)

    # Relationships where absorbed is the "to" contact (related_contact_id)
    absorbed_as_to = session.exec(
        select(Relationship).where(Relationship.related_contact_id == absorbed.id)
    ).all()

    for rel in absorbed_as_to:
        if rel.contact_id == surviving.id:
            # This would become a self-relationship (survivor -> survivor)
            # Delete it and its inverse
            if rel.inverse_id:
                session.exec(
                    select(Relationship)
                    .where(Relationship.id == rel.inverse_id)
                    .delete()
                )
            session.delete(rel)
        else:
            # Rewrite: X -> absorbed becomes X -> survivor
            rel.related_contact_id = surviving.id
            session.add(rel)
            # Also update the inverse's contact_id
            if rel.inverse_id:
                inverse = session.get(Relationship, rel.inverse_id)
                if inverse:
                    inverse.contact_id = surviving.id
                    session.add(inverse)

    # ── Mark absorbed contact as merged ─────────────────────────────────
    absorbed.is_merged = True
    absorbed.merged_into_id = surviving.id
    session.add(absorbed)

    # ── Create merge log entry ──────────────────────────────────────────
    merge_log = ContactMerge(
        surviving_id=surviving.id,
        absorbed_id=absorbed.id,
        merged_by=merged_by,
        merged_at=now,
        notes=notes,
    )
    session.add(merge_log)

    session.flush()  # Get the merge_log.id

    logger.info(f"Merged contact {absorbed.id} into {surviving.id} by user {merged_by}")

    return merge_log


def unmerge_contact(
    *,
    session: Session,
    absorbed_id: str | Contact,
) -> None:
    """Reverse a previously merged contact.

    Looks up the contact_merge log entry, restores the absorbed contact
    by moving child rows back (only those created after the merge timestamp),
    and deletes the merge log entry.

    Args:
        session: Database session.
        absorbed_id: The absorbed contact to restore (ID or Contact object).

    Raises:
        ValueError: If no merge log found or contact not in merged state.
    """
    # Resolve contact
    if isinstance(absorbed_id, str):
        absorbed = session.get(Contact, absorbed_id)
    else:
        absorbed = absorbed_id

    if not absorbed:
        raise ValueError("Absorbed contact not found")

    if not absorbed.is_merged:
        raise ValueError("Contact is not marked as merged")

    # Find the merge log entry
    merge_log = session.exec(
        select(ContactMerge).where(ContactMerge.absorbed_id == absorbed.id)
    ).first()

    if not merge_log:
        raise ValueError("No merge log found for this contact")

    surviving_id = merge_log.surviving_id
    merge_time = merge_log.merged_at

    # ── Move child rows back to absorbed contact ───────────────────────
    # Only move rows that were created after the merge (i.e., were moved during merge)
    # For junction tables without created_at, we need a different approach
    # For simplicity, we'll use the merge timestamp to identify rows

    # Junction tables - move rows back where created_at > merge_time
    session.exec(
        select(ContactTag)
        .where(
            ContactTag.contact_id == surviving_id,
            ContactTag.created_at > merge_time,
        )
        .update({ContactTag.contact_id: absorbed.id})
    )
    # InteractionAttendee - move back attendees where interaction was created after merge
    # Get interactions that were moved to survivor after merge
    moved_interactions = (
        select(Interaction.id)
        .where(
            Interaction.contact_id == surviving_id,
            Interaction.created_at > merge_time,
        )
        .subquery()
    )
    session.exec(
        select(InteractionAttendee)
        .where(InteractionAttendee.interaction_id.in_(select(moved_interactions.c.id)))
        .update({InteractionAttendee.contact_id: absorbed.id})
    )

    # Direct child tables - move rows back where created_at > merge_time
    for model in [
        ContactField,
        Address,
        Interaction,
        Note,
        Reminder,
        Gift,
        Debt,
        LifeEvent,
        MediaRecommendation,
        CustomFieldValue,
    ]:
        session.exec(
            select(model)
            .where(
                model.contact_id == surviving_id,
                model.created_at > merge_time,
            )
            .update({model.contact_id: absorbed.id})
        )

    # ── Handle Relationship table for unmerge ───────────────────────────
    # Relationships where surviving is the "from" contact and was created after merge
    post_merge_rels = session.exec(
        select(Relationship).where(
            Relationship.contact_id == surviving_id,
            Relationship.created_at > merge_time,
        )
    ).all()

    for rel in post_merge_rels:
        # Rewrite: survivor -> X becomes absorbed -> X
        rel.contact_id = absorbed.id
        session.add(rel)
        # Update inverse's related_contact_id
        if rel.inverse_id:
            inverse = session.get(Relationship, rel.inverse_id)
            if inverse:
                inverse.related_contact_id = absorbed.id
                session.add(inverse)

    # Relationships where surviving is the "to" contact (related_contact_id) and was created after merge
    post_merge_rels_to = session.exec(
        select(Relationship).where(
            Relationship.related_contact_id == surviving_id,
            Relationship.created_at > merge_time,
        )
    ).all()

    for rel in post_merge_rels_to:
        # Rewrite: X -> survivor becomes X -> absorbed
        rel.related_contact_id = absorbed.id
        session.add(rel)
        # Update inverse's contact_id
        if rel.inverse_id:
            inverse = session.get(Relationship, rel.inverse_id)
            if inverse:
                inverse.contact_id = absorbed.id
                session.add(inverse)

    # ── Restore absorbed contact ────────────────────────────────────────
    absorbed.is_merged = False
    absorbed.merged_into_id = None
    session.add(absorbed)

    # ── Delete merge log entry ──────────────────────────────────────────
    session.delete(merge_log)

    logger.info(f"Unmerged contact {absorbed.id} from {surviving_id}")


def get_merge_logs(
    *,
    session: Session,
    skip: int = 0,
    limit: int = 100,
    contact_id: str | None = None,
) -> tuple[list[ContactMerge], int]:
    """List contact merge log entries with optional filtering.

    Args:
        session: Database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        contact_id: Optional filter by contact (surviving or absorbed).

    Returns:
        Tuple of (list of ContactMerge objects, total count).
    """
    statement = select(ContactMerge)

    if contact_id:
        statement = statement.where(
            (ContactMerge.surviving_id == contact_id)
            | (ContactMerge.absorbed_id == contact_id)
        )

    # Count before pagination
    count_stmt = select(func.count()).select_from(statement.subquery())
    count = session.exec(count_stmt).one()

    # Apply ordering and pagination
    statement = (
        statement.order_by(ContactMerge.merged_at.desc()).offset(skip).limit(limit)
    )

    results = session.exec(statement).all()
    return results, count
