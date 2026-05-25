"""Data migration: dedupe existing Contact.company strings into Organization records.

This script:
1. Finds all distinct, non-null, non-empty Contact.company values per owner
2. Deduplicates by trimmed/lowercased name (keeping the original casing from the first occurrence)
3. Creates Organization records for each unique company
4. Updates Contact.organization_id to point to the correct Organization
5. Keeps Contact.company as-is for the transition period

Run via:
    docker compose exec backend uv run python -m scripts.dedupe_organizations
"""

import logging
from collections import defaultdict
from typing import Any

from sqlmodel import Session, select

from app.core.db import engine
from app.models import Contact, Organization

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def dedupe_and_create_organizations(session: Session) -> dict[str, Any]:
    """Dedupe Contact.company strings and create Organization records.

    Returns a summary dict with counts.
    """
    # Step 1: Gather all distinct (owner_id, company) pairs
    statement = (
        select(Contact.owner_id, Contact.company)  # type: ignore[attr-defined]
        .where(Contact.company.isnot(None))  # type: ignore[attr-defined]
        .where(Contact.company != "")  # type: ignore[attr-defined]
        .distinct()
    )
    rows = session.exec(statement).all()

    # Step 2: Group by owner, then by normalized (trimmed/lowercased) company name
    # Keep the first original casing encountered for each normalized name
    owner_companies: dict[str, dict[str, str]] = defaultdict(
        lambda: {}
    )  # owner_id -> {normalized_name: original_name}

    for owner_id, company in rows:
        if not company:
            continue
        normalized = company.strip().lower()
        original = company.strip()
        if normalized not in owner_companies[owner_id]:
            owner_companies[owner_id][normalized] = original

    # Step 3: Check existing organizations to avoid duplicates
    existing_orgs = session.exec(select(Organization)).all()
    existing_keys: set[tuple[str, str]] = set()  # (owner_id, normalized_name)
    for org in existing_orgs:
        existing_keys.add((str(org.owner_id), org.name.strip().lower()))

    # Step 4: Create new Organization records
    org_map: dict[str, dict[str, str]] = defaultdict(
        dict
    )  # owner_id -> {normalized_name: org_id}
    orgs_created = 0

    for owner_id, normalized_names in owner_companies.items():
        for normalized, original_name in normalized_names.items():
            key = (owner_id, normalized)
            if key in existing_keys:
                # Org already exists, fetch it
                existing = session.exec(
                    select(Organization).where(
                        Organization.owner_id == owner_id,  # type: ignore[attr-defined]
                        Organization.name == original_name,  # type: ignore[attr-defined]
                    )
                ).first()
                if existing:
                    org_map[owner_id][normalized] = str(existing.id)
                continue

            org = Organization(
                name=original_name,
                owner_id=owner_id,  # type: ignore[arg-type]
            )
            session.add(org)
            session.flush()  # Get the ID
            org_map[owner_id][normalized] = str(org.id)
            existing_keys.add(key)
            orgs_created += 1

    logger.info(f"Created {orgs_created} new Organization records")

    # Step 5: Update Contact.organization_id where it's not set
    contacts_updated = 0
    contacts = session.exec(
        select(Contact).where(
            Contact.company.isnot(None),  # type: ignore[attr-defined]
            Contact.organization_id.is_(None),  # type: ignore[attr-defined]
        )
    ).all()

    for contact in contacts:
        if not contact.company:
            continue
        normalized = contact.company.strip().lower()
        owner_id = str(contact.owner_id)
        if owner_id in org_map and normalized in org_map[owner_id]:
            contact.organization_id = org_map[owner_id][normalized]
            session.add(contact)
            contacts_updated += 1

    logger.info(f"Updated {contacts_updated} Contact records with organization_id")

    session.commit()

    return {
        "orgs_created": orgs_created,
        "contacts_updated": contacts_updated,
        "owners_processed": len(owner_companies),
    }


def main() -> None:
    logger.info("Starting organization deduplication migration...")
    with Session(engine) as session:
        summary = dedupe_and_create_organizations(session)
    logger.info(f"Migration complete: {summary}")


if __name__ == "__main__":
    main()
