"""Edge case tests for relationship management."""

import uuid

from fastapi.testclient import TestClient

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    body: dict[str, object] = {
        "first_name": first_name or f"EdgeTest-{uuid.uuid4().hex[:6]}"
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_self_referential_relationship_rejected(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A contact cannot have a relationship with itself."""
    a_id = _create_contact(client, superuser_token_headers, "Narcissus")
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": a_id,
            "relationship_type": "self",
        },
    )
    # Should be rejected (400 or 422)
    assert r.status_code in (400, 422, 404)


def test_idempotent_relationship_creation(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Creating the same relationship twice returns the same forward row."""
    a_id = _create_contact(client, superuser_token_headers, "IdemA")
    b_id = _create_contact(client, superuser_token_headers, "IdemB")

    payload = {
        "contact_id": a_id,
        "related_contact_id": b_id,
        "relationship_type": "friend",
    }

    r1 = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json=payload,
    )
    assert r1.status_code == 200
    rel_id_1 = r1.json()["id"]

    # Create again with same payload
    r2 = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json=payload,
    )
    assert r2.status_code == 200
    rel_id_2 = r2.json()["id"]

    # Should return the same relationship (idempotent)
    assert rel_id_1 == rel_id_2


def test_update_symmetric_relationship_cascades(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Updating a symmetric relationship type cascades to the inverse."""
    a_id = _create_contact(client, superuser_token_headers, "CasA")
    b_id = _create_contact(client, superuser_token_headers, "CasB")

    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "friend",
        },
    )
    assert r.status_code == 200
    forward = r.json()
    forward_id = forward["id"]

    # Update the forward relationship type
    r = client.patch(
        f"{settings.API_V1_STR}/relationships/{forward_id}",
        headers=superuser_token_headers,
        json={"relationship_type": "sibling"},
    )
    assert r.status_code == 200

    # Check that the inverse was also updated
    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{b_id}",
        headers=superuser_token_headers,
    )
    rels = r.json()["data"]
    assert len(rels) == 1
    assert rels[0]["relationship_type"] == "sibling"


def test_update_asymmetric_relationship_no_cascade(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Updating an asymmetric relationship does NOT cascade to the inverse."""
    parent_id = _create_contact(client, superuser_token_headers, "PCascade")
    kid_id = _create_contact(client, superuser_token_headers, "KCascade")

    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": parent_id,
            "related_contact_id": kid_id,
            "relationship_type": "parent",
        },
    )
    assert r.status_code == 200
    forward_id = r.json()["id"]

    # Update the forward relationship type
    r = client.patch(
        f"{settings.API_V1_STR}/relationships/{forward_id}",
        headers=superuser_token_headers,
        json={"relationship_type": "guardian"},
    )
    assert r.status_code == 200

    # The inverse (child) should remain unchanged since it's asymmetric
    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{kid_id}",
        headers=superuser_token_headers,
    )
    rels = r.json()["data"]
    assert len(rels) == 1
    # Inverse should still be "child" (not cascade to guardian's inverse)
    assert rels[0]["relationship_type"] == "child"


def test_relationship_with_missing_inverse_map(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Relationship type not in map requires explicit inverse_relationship_type."""
    a_id = _create_contact(client, superuser_token_headers, "MapA")
    b_id = _create_contact(client, superuser_token_headers, "MapB")

    # Without inverse_relationship_type should fail
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "custom_type_xyz",
        },
    )
    assert r.status_code == 422

    # With inverse_relationship_type should succeed
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "custom_type_xyz",
            "inverse_relationship_type": "inverse_custom_type_xyz",
        },
    )
    assert r.status_code == 200
    assert r.json()["relationship_type"] == "custom_type_xyz"


def test_relationship_inverse_map_api(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test the inverse relationship map API endpoints."""
    # Test seeding (requires superuser)
    r = client.post(
        f"{settings.API_V1_STR}/relationship-inverse-map/seed",
        headers=superuser_token_headers,
    )
    # Should succeed (superuser can seed)
    assert r.status_code == 200
    assert "inserted" in r.json()

    # Test listing
    r = client.get(
        f"{settings.API_V1_STR}/relationship-inverse-map/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert "count" in data
    assert data["count"] > 0

    # Test lookup
    r = client.get(
        f"{settings.API_V1_STR}/relationship-inverse-map/lookup/spouse",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["inverse_type"] == "spouse"
    assert r.json()["is_symmetric"] is True

    # Test lookup for asymmetric
    r = client.get(
        f"{settings.API_V1_STR}/relationship-inverse-map/lookup/parent",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["inverse_type"] == "child"
    assert r.json()["is_symmetric"] is False
