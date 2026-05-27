"""Tests for bulk contact operations."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Contact, ContactTag, Tag


def get_superuser_id(db: Session) -> uuid.UUID:
    """Get the first user ID from the database."""
    from app.models import User

    user = db.exec(select(User).limit(1)).first()
    if user:
        return user.id
    raise ValueError("No user found in database")


def create_test_contact(db: Session, owner_id: uuid.UUID, **kwargs: Any) -> Contact:
    """Helper to create a test contact."""
    data = {
        "first_name": "Test",
        "last_name": "Contact",
        "owner_id": owner_id,
        "is_archived": False,
        "is_favorite": False,
    }
    data.update(kwargs)
    contact = Contact(**data)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def test_bulk_update_by_ids(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test bulk update with explicit contact_ids."""
    user_id = get_superuser_id(db)
    contact1 = create_test_contact(db, user_id, first_name="Alice")
    contact2 = create_test_contact(db, user_id, first_name="Bob")
    contact3 = create_test_contact(db, user_id, first_name="Charlie")

    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id), str(contact2.id)],
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 2
    assert result["skipped_count"] == 0

    # Verify contacts were updated
    db.refresh(contact1)
    db.refresh(contact2)
    db.refresh(contact3)
    assert contact1.is_favorite is True
    assert contact2.is_favorite is True
    assert contact3.is_favorite is False  # Not in the list


def test_bulk_archive(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test bulk archive operation."""
    user_id = get_superuser_id(db)
    contact1 = create_test_contact(db, user_id, first_name="Alice")
    contact2 = create_test_contact(db, user_id, first_name="Bob")

    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id), str(contact2.id)],
            "operations": {"set_is_archived": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 2

    db.refresh(contact1)
    db.refresh(contact2)
    assert contact1.is_archived is True
    assert contact2.is_archived is True


def test_bulk_unarchive(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test bulk unarchive operation."""
    user_id = get_superuser_id(db)
    contact1 = create_test_contact(db, user_id, first_name="Alice", is_archived=True)
    contact2 = create_test_contact(db, user_id, first_name="Bob", is_archived=True)

    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id), str(contact2.id)],
            "operations": {"set_is_archived": False},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 2

    db.refresh(contact1)
    db.refresh(contact2)
    assert contact1.is_archived is False
    assert contact2.is_archived is False


def test_bulk_add_tags(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test bulk add tags operation."""

    user_id = get_superuser_id(db)

    # Create tags with required owner_id
    tag1 = Tag(name="VIP", color="#ff0000", owner_id=user_id)
    tag2 = Tag(name="Work", color="#00ff00", owner_id=user_id)
    db.add(tag1)
    db.add(tag2)
    db.commit()
    db.refresh(tag1)
    db.refresh(tag2)

    # Create contacts
    contact1 = create_test_contact(db, user_id, first_name="Alice")
    contact2 = create_test_contact(db, user_id, first_name="Bob")

    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id), str(contact2.id)],
            "operations": {"add_tag_ids": [str(tag1.id), str(tag2.id)]},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 2

    # Verify tags were added
    stmt = select(ContactTag).where(ContactTag.contact_id == contact1.id)
    tags = db.exec(stmt).all()
    assert len(tags) == 2


def test_bulk_remove_tags(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test bulk remove tags operation."""
    from app.models import ContactTag

    user_id = get_superuser_id(db)

    # Create tag with required owner_id
    tag1 = Tag(name="VIP", color="#ff0000", owner_id=user_id)
    db.add(tag1)
    db.commit()
    db.refresh(tag1)

    # Create contact with tag
    contact1 = create_test_contact(db, user_id, first_name="Alice")
    contact_tag = ContactTag(contact_id=contact1.id, tag_id=tag1.id)
    db.add(contact_tag)
    db.commit()

    # Verify tag exists
    stmt = select(ContactTag).where(ContactTag.contact_id == contact1.id)
    tags = db.exec(stmt).all()
    assert len(tags) == 1

    # Remove tag via bulk operation
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id)],
            "operations": {"remove_tag_ids": [str(tag1.id)]},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 1

    # Verify tag was removed
    stmt = select(ContactTag).where(ContactTag.contact_id == contact1.id)
    tags = db.exec(stmt).all()
    assert len(tags) == 0


def test_bulk_no_ids_or_filter(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test bulk update with neither contact_ids nor select_all_filtered."""
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 400
    assert "contact_ids or set select_all_filtered" in response.json()["detail"]


def test_bulk_empty_result(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test bulk update with no matching contacts."""
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(uuid.uuid4())],
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 0
    assert result["skipped_count"] == 0


def test_bulk_other_user_contacts_not_affected(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that bulk operations only affect contacts owned by the current user."""
    from app.models import User

    # Create another user
    other_user = User(
        email="other@example.com", hashed_password="fakehash", is_active=True
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    # Create contact for other user
    other_contact = create_test_contact(db, other_user.id, first_name="Other")

    # Bulk update by explicit IDs - should fail silently on other user's contact
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(other_contact.id)],
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 0

    # Verify other user's contact was not affected
    db.refresh(other_contact)
    assert other_contact.is_favorite is False
