"""Tests for relationship management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    body: dict[str, object] = {
        "first_name": first_name or f"RelTest-{uuid.uuid4().hex[:6]}"
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_relationship(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers, "Alice")
    b_id = _create_contact(client, superuser_token_headers, "Bob")

    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "spouse",
            "notes": "Married 2020",
        },
    )
    assert r.status_code == 200
    content = r.json()
    assert content["contact_id"] == a_id
    assert content["related_contact_id"] == b_id
    assert content["relationship_type"] == "spouse"
    assert content["notes"] == "Married 2020"
    assert "id" in content


def test_create_relationship_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    b_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": str(uuid.uuid4()),
            "related_contact_id": b_id,
            "relationship_type": "friend",
        },
    )
    assert r.status_code == 404


def test_create_relationship_unknown_related_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": str(uuid.uuid4()),
            "relationship_type": "friend",
        },
    )
    assert r.status_code == 404


def test_list_relationships(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers, "Hub")
    b_id = _create_contact(client, superuser_token_headers, "Spouse")
    c_id = _create_contact(client, superuser_token_headers, "Sibling")

    client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "spouse",
        },
    )
    client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": c_id,
            "relationship_type": "sibling",
        },
    )

    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{a_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    types = sorted(rel["relationship_type"] for rel in body["data"])
    assert types == ["sibling", "spouse"]


def test_list_relationships_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_update_relationship(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers)
    b_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "friend",
        },
    )
    rel_id = r.json()["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/relationships/{rel_id}",
        headers=superuser_token_headers,
        json={"relationship_type": "colleague", "notes": "Worked together"},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["relationship_type"] == "colleague"
    assert content["notes"] == "Worked together"


def test_update_relationship_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.patch(
        f"{settings.API_V1_STR}/relationships/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json={"relationship_type": "ghost"},
    )
    assert r.status_code == 404


def test_delete_relationship(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers)
    b_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "friend",
        },
    )
    rel_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/relationships/{rel_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{a_id}",
        headers=superuser_token_headers,
    )
    assert rel_id not in [rel["id"] for rel in r.json()["data"]]


def test_delete_relationship_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/relationships/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_create_relationship_pairs_symmetric(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Symmetric type ('friend') auto-creates the inverse with same type."""
    a_id = _create_contact(client, superuser_token_headers, "PairA")
    b_id = _create_contact(client, superuser_token_headers, "PairB")

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
    assert forward["inverse_id"]

    # B's profile shows A as a friend.
    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{b_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    rels = r.json()["data"]
    assert len(rels) == 1
    inv = rels[0]
    assert inv["relationship_type"] == "friend"
    assert inv["related_contact_id"] == a_id
    assert inv["inverse_id"] == forward["id"]


def test_create_relationship_pairs_asymmetric(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Asymmetric type ('parent') auto-creates 'child' on the other side."""
    parent_id = _create_contact(client, superuser_token_headers, "Parent")
    kid_id = _create_contact(client, superuser_token_headers, "Kid")

    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": parent_id,
            "related_contact_id": kid_id,
            "relationship_type": "child",
        },
    )
    assert r.status_code == 200

    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{kid_id}",
        headers=superuser_token_headers,
    )
    rels = r.json()["data"]
    assert len(rels) == 1
    assert rels[0]["relationship_type"] == "parent"


def test_create_relationship_unknown_type_requires_inverse(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers)
    b_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "guildmate",
        },
    )
    assert r.status_code == 422

    # Same call but with inverse provided should succeed.
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "guildmate",
            "inverse_relationship_type": "guildmate",
        },
    )
    assert r.status_code == 200


def test_delete_relationship_cascades_inverse(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    a_id = _create_contact(client, superuser_token_headers)
    b_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=superuser_token_headers,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "spouse",
        },
    )
    rel_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/relationships/{rel_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200

    # Both contacts now show no relationships.
    for cid in (a_id, b_id):
        r = client.get(
            f"{settings.API_V1_STR}/relationships/contact/{cid}",
            headers=superuser_token_headers,
        )
        assert r.json()["count"] == 0


def test_lookup_inverse(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    cases = {
        "spouse": "spouse",
        "Friend": "friend",
        "parent": "child",
        "child": "parent",
        "mentor": "mentee",
        "guildmate": None,
    }
    for input_type, expected in cases.items():
        r = client.get(
            f"{settings.API_V1_STR}/relationships/inverse",
            headers=superuser_token_headers,
            params={"type": input_type},
        )
        assert r.status_code == 200, input_type
        assert r.json()["inverse"] == expected, input_type


def test_relationship_isolation_between_users(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    a_id = _create_contact(client, alice_h, "AliceA")
    b_id = _create_contact(client, alice_h, "AliceB")
    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=alice_h,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "friend",
        },
    )
    rel_id = r.json()["id"]

    # Bob cannot list, create, update, or delete on Alice's contact
    r = client.get(
        f"{settings.API_V1_STR}/relationships/contact/{a_id}",
        headers=bob_h,
    )
    assert r.status_code in (403, 404)

    r = client.post(
        f"{settings.API_V1_STR}/relationships/",
        headers=bob_h,
        json={
            "contact_id": a_id,
            "related_contact_id": b_id,
            "relationship_type": "intruder",
        },
    )
    assert r.status_code in (403, 404)

    r = client.patch(
        f"{settings.API_V1_STR}/relationships/{rel_id}",
        headers=bob_h,
        json={"relationship_type": "hijacked"},
    )
    assert r.status_code in (403, 404)

    r = client.delete(
        f"{settings.API_V1_STR}/relationships/{rel_id}",
        headers=bob_h,
    )
    assert r.status_code in (403, 404)
