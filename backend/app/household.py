"""Household derivation logic.

Derives a logical household/family unit from chains of spouse, child,
parent, and sibling relationships without adding a new database table.

Uses an in-app BFS walk via SQLAlchemy relationships with cycle detection
and a max_depth guard to prevent infinite loops.
"""

import logging
from collections import deque
from datetime import date
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import Contact, Relationship

logger = logging.getLogger(__name__)

# Relationship types that indicate household membership
HOUSEHOLD_RELATIONSHIP_TYPES = frozenset(
    {
        # Symmetric - same household
        "spouse",
        "partner",
        "fiance",
        "fiancee",
        "ex",
        "sibling",
        "twin",
        "roommate",
        "housemate",
        "cousin",
        # Asymmetric - parent/child share household
        "parent",
        "child",
        "mother",
        "father",
        "mom",
        "dad",
        "son",
        "daughter",
        "stepparent",
        "stepchild",
        "grandparent",
        "grandchild",
        "grandmother",
        "grandfather",
        "uncle",
        "aunt",
        "niece",
        "nephew",
    }
)

# Types that flow both directions (symmetric)
SYMMETRIC_TYPES = frozenset(
    {
        "spouse",
        "partner",
        "fiance",
        "fiancee",
        "ex",
        "sibling",
        "twin",
        "cousin",
        "roommate",
        "housemate",
    }
)

# Max depth for BFS walk to prevent infinite loops
MAX_DEPTH = 10


def _calculate_age(birthday: date | None) -> int | None:
    """Calculate age from birthday, returning None if birthday is unknown."""
    if birthday is None or birthday.year <= 4 or birthday.year < 1900:
        return None
    today = date.today()
    age = today.year - birthday.year
    if (today.month, today.day) < (birthday.month, birthday.day):
        age -= 1
    return age


def get_household_members(
    session: Session,
    contact_id: str,
    current_user: Any,
    max_depth: int = MAX_DEPTH,
) -> list[dict]:
    """Derive household members for a contact via BFS walk of relationships.

    Args:
        session: Database session
        contact_id: The starting contact ID
        current_user: The authenticated user (for visibility checks)
        max_depth: Maximum BFS depth to prevent infinite loops

    Returns:
        List of dicts with id, first_name, last_name, birthday, age, relationship_type

    Raises:
        HTTPException: If contact not found or not visible to user
    """
    from app.crud import visible_contact_ids

    # Verify the starting contact exists and is visible
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    visible_ids = {
        str(uid) for uid in session.exec(visible_contact_ids(current_user)).all()
    }
    if str(contact.id) not in visible_ids:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # BFS walk
    household = {}  # contact_id -> member info
    visited = set()
    queue = deque()

    # Start with the initial contact
    queue.append((str(contact.id), 0, None))  # (contact_id, depth, relationship_type)

    while queue:
        current_id, depth, rel_type = queue.popleft()

        if current_id in visited:
            continue

        # Cycle detection
        if depth > max_depth:
            logger.warning(
                f"Max depth {max_depth} reached while deriving household for contact {contact_id}. "
                f"Possible cycle or very large family tree."
            )
            continue

        visited.add(current_id)

        # Fetch the contact
        member = session.get(Contact, current_id)
        if member is None:
            continue

        # Calculate age
        age = _calculate_age(member.birthday)

        # Store member info
        household[current_id] = {
            "id": str(member.id),
            "first_name": member.first_name,
            "last_name": member.last_name,
            "nickname": member.nickname,
            "birthday": member.birthday.isoformat() if member.birthday else None,
            "age": age,
            "avatar_url": member.avatar_url,
        }

        # Find related contacts via relationships
        relationships = session.exec(
            select(Relationship).where(Relationship.contact_id == current_id)
        ).all()

        for rel in relationships:
            # Only follow household relationship types
            if rel.relationship_type.lower() not in HOUSEHOLD_RELATIONSHIP_TYPES:
                continue

            related_id = str(rel.related_contact_id)

            # Skip if already visited
            if related_id in visited:
                continue

            # Check visibility
            if related_id not in visible_ids:
                continue

            # Add to queue for further exploration
            queue.append((related_id, depth + 1, rel.relationship_type))

    # Convert to list, starting with the original contact
    result = []
    if str(contact.id) in household:
        result.append(household[str(contact.id)])

    # Add remaining members (excluding the original contact)
    for cid, member in household.items():
        if cid != str(contact.id):
            result.append(member)

    return result


def format_household_display(household_members: list[dict]) -> str:
    """Format household members as a display string.

    Example: "Alice, Bob, Max (13), Riley (7)"

    Args:
        household_members: List of member dicts from get_household_members

    Returns:
        Formatted string for display
    """
    parts = []
    for member in household_members:
        name = member.get("first_name", "")
        if member.get("last_name"):
            name = f"{name} {member.get('last_name', '')}".strip()
        age = member.get("age")
        if age is not None:
            parts.append(f"{name} ({age})")
        else:
            parts.append(name)
    return ", ".join(parts)
