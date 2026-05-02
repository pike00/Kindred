"""Tests for bulk contact operations."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Contact, ContactTag, ContactGroup, Tag, Group


def create_test_contact(session: Session, owner_id: uuid.UUID, **kwargs: Any) -> Contact:
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
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


def test_bulk_update_by_ids(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk update with explicit contact_ids."""
    # Create test contacts
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice")
    contact2 = create_test_contact(session, superuser["id"], first_name="Bob")
    contact3 = create_test_contact(session, superuser["id"], first_name="Charlie")

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
    session.refresh(contact1)
    session.refresh(contact2)
    session.refresh(contact3)
    assert contact1.is_favorite is True
    assert contact2.is_favorite is True
    assert contact3.is_favorite is False  # Not in the list


def test_bulk_archive(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk archive operation."""
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice")
    contact2 = create_test_contact(session, superuser["id"], first_name="Bob")

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

    session.refresh(contact1)
    session.refresh(contact2)
    assert contact1.is_archived is True
    assert contact2.is_archived is True


def test_bulk_unarchive(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk unarchive operation."""
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice", is_archived=True)
    contact2 = create_test_contact(session, superuser["id"], first_name="Bob", is_archived=True)

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

    session.refresh(contact1)
    session.refresh(contact2)
    assert contact1.is_archived is False
    assert contact2.is_archived is False


def test_bulk_add_tags(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk add tags operation."""
    from app.models import Tag

    # Create tags
    tag1 = Tag(name="VIP", color="#ff0000")
    tag2 = Tag(name="Work", color="#00ff00")
    session.add(tag1)
    session.add(tag2)
    session.commit()
    session.refresh(tag1)
    session.refresh(tag2)

    # Create contacts
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice")
    contact2 = create_test_contact(session, superuser["id"], first_name="Bob")

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
    tags = session.exec(stmt).all()
    assert len(tags) == 2


def test_bulk_remove_tags(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk remove tags operation."""
    from app.models import Tag, ContactTag

    # Create tag
    tag1 = Tag(name="VIP", color="#ff0000")
    session.add(tag1)
    session.commit()
    session.refresh(tag1)

    # Create contact with tag
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice")
    contact_tag = ContactTag(contact_id=contact1.id, tag_id=tag1.id)
    session.add(contact_tag)
    session.commit()

    # Verify tag exists
    stmt = select(ContactTag).where(ContactTag.contact_id == contact1.id)
    tags = session.exec(stmt).all()
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
    tags = session.exec(stmt).all()
    assert len(tags) == 0


def test_bulk_add_groups(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk add groups operation."""
    from app.models import Group

    # Create groups
    group1 = Group(name="Family", description="Family members")
    group2 = Group(name="Work", description="Work colleagues")
    session.add(group1)
    session.add(group2)
    session.commit()
    session.refresh(group1)
    session.refresh(group2)

    # Create contact
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice")

    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id)],
            "operations": {"add_group_ids": [str(group1.id), str(group2.id)]},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 1

    # Verify groups were added
    stmt = select(ContactGroup).where(ContactGroup.contact_id == contact1.id)
    groups = session.exec(stmt).all()
    assert len(groups) == 2


def test_bulk_remove_groups(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk remove groups operation."""
    from app.models import Group, ContactGroup

    # Create group
    group1 = Group(name="Family", description="Family members")
    session.add(group1)
    session.commit()
    session.refresh(group1)

    # Create contact with group
    contact1 = create_test_contact(session, superuser["id"], first_name="Alice")
    contact_group = ContactGroup(contact_id=contact1.id, group_id=group1.id)
    session.add(contact_group)
    session.commit()

    # Remove group via bulk operation
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "contact_ids": [str(contact1.id)],
            "operations": {"remove_group_ids": [str(group1.id)]},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 1

    # Verify group was removed
    stmt = select(ContactGroup).where(ContactGroup.contact_id == contact1.id)
    groups = session.exec(stmt).all()
    assert len(groups) == 0


def test_bulk_select_all_filtered(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk update with select_all_filtered."""
    # Create test contacts
    create_test_contact(session, superuser["id"], first_name="Alice")
    create_test_contact(session, superuser["id"], first_name="Bob")
    create_test_contact(session, superuser["id"], first_name="Charlie")

    # Bulk update all contacts (no filter)
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "select_all_filtered": True,
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 3


def test_bulk_select_all_filtered_with_search(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk update with select_all_filtered and search filter."""
    # Create test contacts
    create_test_contact(session, superuser["id"], first_name="Alice")
    create_test_contact(session, superuser["id"], first_name="Bob")
    create_test_contact(session, superuser["id"], first_name="Charlie")

    # Bulk update only contacts matching "Ali" (should only match Alice)
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "select_all_filtered": True,
            "filters": {"search": "Ali"},
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 1  # Only Alice


def test_bulk_preview(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk preview endpoint."""
    # Create test contacts
    create_test_contact(session, superuser["id"], first_name="Alice")
    create_test_contact(session, superuser["id"], first_name="Bob")

    response = client.get(
        "/api/v1/contacts/bulk/preview",
        headers=superuser_token_headers,
        params={"select_all_filtered": True},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["count"] == 2
    assert len(result["data"]) == 2


def test_bulk_preview_with_search(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test bulk preview with search filter."""
    # Create test contacts
    create_test_contact(session, superuser["id"], first_name="Alice")
    create_test_contact(session, superuser["id"], first_name="Bob")

    response = client.get(
        "/api/v1/contacts/bulk/preview",
        headers=superuser_token_headers,
        params={"select_all_filtered": True, "search": "Ali"},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["count"] == 1  # Only Alice
    assert len(result["data"]) == 1
    assert result["data"][0]["first_name"] == "Alice"


def test_bulk_no_ids_or_filter(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any]) -> None:
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


def test_bulk_empty_result(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any]) -> None:
    """Test bulk update with no matching contacts."""
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "select_all_filtered": True,
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 0
    assert result["skipped_count"] == 0


def test_bulk_limit_enforced(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test that bulk operations respect the limit."""
    # Create 10 contacts
    for i in range(10):
        create_test_contact(session, superuser["id"], first_name=f"Contact{i}")

    # Set limit to 5
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "select_all_filtered": True,
            "limit": 5,
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 5


def test_bulk_other_user_contacts_not_affected(client: TestClient, superuser_token_headers: dict[str, str], superuser: dict[str, Any], session: Session) -> None:
    """Test that bulk operations only affect contacts owned by the current user."""
    from app.models import User

    # Create another user
    other_user = User(email="other@example.com", hashed_password="fakehash", is_active=True)
    session.add(other_user)
    session.commit()
    session.refresh(other_user)

    # Create contact for other user
    other_contact = create_test_contact(session, other_user.id, first_name="Other")

    # Create contact for superuser
    my_contact = create_test_contact(session, superuser["id"], first_name="Mine")

    # Bulk update all - should only affect my contact
    response = client.patch(
        "/api/v1/contacts/bulk",
        headers=superuser_token_headers,
        json={
            "select_all_filtered": True,
            "operations": {"set_is_favorite": True},
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["updated_count"] == 1

    # Verify other user's contact was not affected
    session.refresh(other_contact)
    assert other_contact.is_favorite is False
