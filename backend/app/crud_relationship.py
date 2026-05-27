"""Relationship-specific CRUD operations with inverse mapping support."""

import uuid

from sqlmodel import select

from app.models import InverseRelationshipMap, Relationship, RelationshipUpdate


def seed_inverse_map(session, _owner_id: uuid.UUID | None = None) -> int:
    """Populate ``inverse_relationship_map`` with the canonical pairs.

    Idempotent: existing rows are skipped based on ``relationship_type``.
    Returns the number of rows inserted.
    """
    SYMMETRIC_PAIRS = [
        ("spouse", "spouse", True),
        ("partner", "partner", True),
        ("fiance", "fiance", True),
        ("fiancee", "fiancee", True),
        ("ex", "ex", True),
        ("friend", "friend", True),
        ("best friend", "best friend", True),
        ("sibling", "sibling", True),
        ("twin", "twin", True),
        ("cousin", "cousin", True),
        ("colleague", "colleague", True),
        ("coworker", "coworker", True),
        ("co-worker", "co-worker", True),
        ("neighbor", "neighbor", True),
        ("roommate", "roommate", True),
        ("housemate", "housemate", True),
        ("classmate", "classmate", True),
        ("acquaintance", "acquaintance", True),
        ("bandmate", "bandmate", True),
        ("teammate", "teammate", True),
    ]

    ASYMMETRIC_PAIRS = [
        ("parent", "child", False),
        ("child", "parent", False),
        ("mother", "child", False),
        ("father", "child", False),
        ("mom", "child", False),
        ("dad", "child", False),
        ("son", "parent", False),
        ("daughter", "parent", False),
        ("stepparent", "stepchild", False),
        ("stepchild", "stepparent", False),
        ("grandparent", "grandchild", False),
        ("grandchild", "grandparent", False),
        ("grandmother", "grandchild", False),
        ("grandfather", "grandchild", False),
        ("uncle", "niece/nephew", False),
        ("aunt", "niece/nephew", False),
        ("niece", "aunt/uncle", False),
        ("nephew", "aunt/uncle", False),
        ("mentor", "mentee", False),
        ("mentee", "mentor", False),
        ("manager", "report", False),
        ("report", "manager", False),
        ("boss", "report", False),
        ("employee", "manager", False),
        ("teacher", "student", False),
        ("student", "teacher", False),
        ("professor", "student", False),
        ("advisor", "advisee", False),
        ("advisee", "advisor", False),
        ("doctor", "patient", False),
        ("patient", "doctor", False),
        ("therapist", "client", False),
        ("client", "therapist", False),
        ("lawyer", "client", False),
        ("landlord", "tenant", False),
        ("tenant", "landlord", False),
    ]

    all_pairs = SYMMETRIC_PAIRS + ASYMMETRIC_PAIRS
    inserted = 0

    for rel_type, inv_type, is_sym in all_pairs:
        existing = session.exec(
            select(InverseRelationshipMap).where(
                InverseRelationshipMap.relationship_type == rel_type
            )
        ).first()
        if existing:
            continue
        row = InverseRelationshipMap(
            relationship_type=rel_type,
            inverse_type=inv_type,
            is_symmetric=is_sym,
        )
        session.add(row)
        inserted += 1

    session.commit()
    return inserted


def get_inverse_from_db(session, relationship_type: str) -> tuple[str, bool] | None:
    """Return (inverse_type, is_symmetric) from the database, or None if unknown.

    Lookup is case-insensitive and trimmed.
    """
    key = relationship_type.strip().lower()
    if not key:
        return None

    stmt = select(InverseRelationshipMap).where(
        InverseRelationshipMap.relationship_type == key
    )
    row = session.exec(stmt).first()
    if row:
        return (row.inverse_type, row.is_symmetric)

    # Also check if this is itself an inverse_type (reverse lookup)
    stmt = select(InverseRelationshipMap).where(
        InverseRelationshipMap.inverse_type == key
    )
    row = session.exec(stmt).first()
    if row:
        return (row.relationship_type, row.is_symmetric)

    return None


def create_relationship_idempotent(
    session,
    relationship_in,
    inverse_type: str,
) -> Relationship:
    """Create a directional relationship plus its inverse, cross-linked.

    Idempotent: checks for existing inverse pair before creating.
    If the same relationship already exists (same contact_id, related_contact_id,
    and relationship_type), returns the existing forward relationship.
    """
    # Check for existing forward relationship
    existing = session.exec(
        select(Relationship).where(
            Relationship.contact_id == relationship_in.contact_id,
            Relationship.related_contact_id == relationship_in.related_contact_id,
            Relationship.relationship_type == relationship_in.relationship_type,
        )
    ).first()

    if existing:
        # Return existing relationship (idempotent)
        return existing

    forward = Relationship(
        contact_id=relationship_in.contact_id,
        related_contact_id=relationship_in.related_contact_id,
        relationship_type=relationship_in.relationship_type,
        notes=relationship_in.notes,
        inverse_id=None,
    )
    inverse = Relationship(
        contact_id=relationship_in.related_contact_id,
        related_contact_id=relationship_in.contact_id,
        relationship_type=inverse_type,
        notes=relationship_in.notes,
        inverse_id=None,
    )
    session.add(forward)
    session.add(inverse)
    session.flush()
    forward.inverse_id = inverse.id
    inverse.inverse_id = forward.id
    session.add(forward)
    session.add(inverse)
    session.commit()
    session.refresh(forward)
    return forward


def update_relationship_with_inverse(
    session,
    rel: Relationship,
    rel_in: RelationshipUpdate,
) -> Relationship:
    """Update a relationship and optionally sync its inverse.

    If the relationship type changes and the pair is symmetric,
    the inverse is also updated to maintain consistency.
    """
    from app.relationship_inverses import infer_inverse

    update_data = rel_in.model_dump(exclude_unset=True)

    # Check if relationship_type is being updated
    type_changed = "relationship_type" in update_data
    new_type = update_data.get("relationship_type")

    rel.sqlmodel_update(update_data)
    session.add(rel)
    session.flush()

    # If type changed and we have an inverse, check if we should sync
    if type_changed and rel.inverse_id:
        inverse = session.get(Relationship, rel.inverse_id)
        if inverse:
            # Check if the pair is symmetric
            result = get_inverse_from_db(session, new_type) if session else None
            is_symmetric = (
                result[1] if result else (infer_inverse(new_type) == new_type)
            )

            if is_symmetric:
                # Update inverse to match (cascade the change)
                inverse.relationship_type = new_type
                session.add(inverse)

    session.commit()
    session.refresh(rel)
    return rel
