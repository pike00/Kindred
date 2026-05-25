"""Inverse lookup for directional relationship types.

A relationship row is directional: ``contact_id`` is "X" and
``related_contact_id`` is "Y" with a ``relationship_type`` describing
Y from X's perspective ("Y is X's <type>"). To keep both contacts'
profiles symmetric, every row is paired with an inverse row in the
opposite direction.

This module now queries the ``inverse_relationship_map`` table as the
single source of truth; the seed data is loaded into that table at
migrate time so runtime behaviour can be changed without a code deploy.
"""

import uuid

from sqlmodel import Session, select

from app.models import InverseRelationshipMap


def get_inverse_from_db(
    session: Session, relationship_type: str
) -> tuple[str, bool] | None:
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


def infer_inverse(relationship_type: str) -> str | None:
    """Return the inverse relationship type, or None if unknown.

    This is a lightweight fallback that works without a database session.
    Used primarily for validation in contexts where a session is unavailable.

    Lookup is case-insensitive and trimmed; the returned value is
    lowercase for asymmetric matches and the input's normalised form
    for symmetric matches.
    """
    # This is kept as a lightweight fallback using the original Python dicts
    # In production, prefer get_inverse_from_db() which uses the database
    SYMMETRIC: frozenset[str] = frozenset(
        {
            "spouse",
            "partner",
            "fiance",
            "fiancee",
            "ex",
            "friend",
            "best friend",
            "sibling",
            "twin",
            "cousin",
            "colleague",
            "coworker",
            "co-worker",
            "neighbor",
            "roommate",
            "housemate",
            "classmate",
            "acquaintance",
            "bandmate",
            "teammate",
        }
    )

    ASYMMETRIC: dict[str, str] = {
        "parent": "child",
        "child": "parent",
        "mother": "child",
        "father": "child",
        "mom": "child",
        "dad": "child",
        "son": "parent",
        "daughter": "parent",
        "stepparent": "stepchild",
        "stepchild": "stepparent",
        "grandparent": "grandchild",
        "grandchild": "grandparent",
        "grandmother": "grandchild",
        "grandfather": "grandchild",
        "uncle": "niece/nephew",
        "aunt": "niece/nephew",
        "niece": "aunt/uncle",
        "nephew": "aunt/uncle",
        "mentor": "mentee",
        "mentee": "mentor",
        "manager": "report",
        "report": "manager",
        "boss": "report",
        "employee": "manager",
        "teacher": "student",
        "student": "teacher",
        "professor": "student",
        "advisor": "advisee",
        "advisee": "advisor",
        "doctor": "patient",
        "patient": "doctor",
        "therapist": "client",
        "client": "therapist",
        "lawyer": "client",
        "landlord": "tenant",
        "tenant": "landlord",
    }

    key = relationship_type.strip().lower()
    if not key:
        return None
    if key in SYMMETRIC:
        return key
    return ASYMMETRIC.get(key)


def seed_inverse_map(session: Session, owner_id: uuid.UUID | None = None) -> int:  # noqa: ARG001
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
