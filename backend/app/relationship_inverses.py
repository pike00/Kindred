"""Inverse lookup for directional relationship types.

A relationship row is directional: ``contact_id`` is "X" and
``related_contact_id`` is "Y" with a ``relationship_type`` describing
Y from X's perspective ("Y is X's <type>"). To keep both contacts'
profiles symmetric, every row is paired with an inverse row in the
opposite direction. This module supplies the inverse type when it can
be inferred; the API otherwise asks the caller to provide it.
"""

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


def infer_inverse(relationship_type: str) -> str | None:
    """Return the inverse relationship type, or None if unknown.

    Lookup is case-insensitive and trimmed; the returned value is
    lowercase for asymmetric matches and the input's normalised form
    for symmetric matches.
    """
    key = relationship_type.strip().lower()
    if not key:
        return None
    if key in SYMMETRIC:
        return key
    return ASYMMETRIC.get(key)
