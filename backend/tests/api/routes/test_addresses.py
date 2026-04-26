"""Tests for address management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    body: dict[str, object] = {
        "first_name": first_name or f"AddrTest-{uuid.uuid4().hex[:6]}"
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_address_minimal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["contact_id"] == contact_id
    assert content["label"] == "home"
    assert "id" in content


def test_create_address_full(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    data = {
        "contact_id": contact_id,
        "label": "work",
        "street": "123 Main St",
        "extended": "Suite 400",
        "city": "Springfield",
        "region": "IL",
        "postal_code": "62701",
        "country": "USA",
        "latitude": 39.7817,
        "longitude": -89.6501,
    }
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    content = r.json()
    assert content["label"] == "work"
    assert content["street"] == "123 Main St"
    assert content["city"] == "Springfield"
    assert content["latitude"] == 39.7817


def test_create_address_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": str(uuid.uuid4())},
    )
    assert r.status_code == 404


def test_list_addresses(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "label": "home", "city": "Boston"},
    )
    client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "label": "work", "city": "NYC"},
    )

    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    cities = sorted(a["city"] for a in body["data"])
    assert cities == ["Boston", "NYC"]


def test_list_addresses_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_update_address(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "city": "Old"},
    )
    address_id = r.json()["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/addresses/{address_id}",
        headers=superuser_token_headers,
        json={"city": "New", "label": "vacation"},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["city"] == "New"
    assert content["label"] == "vacation"


def test_update_address_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.patch(
        f"{settings.API_V1_STR}/addresses/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json={"city": "Ghost"},
    )
    assert r.status_code == 404


def test_delete_address(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id},
    )
    address_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/addresses/{address_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert address_id not in [a["id"] for a in r.json()["data"]]


def test_delete_address_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/addresses/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_address_isolation_between_users(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact_id = _create_contact(client, alice_h, "Private")
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=alice_h,
        json={"contact_id": contact_id, "city": "Alice's"},
    )
    assert r.status_code == 200
    address_id = r.json()["id"]

    # Bob can't list
    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{contact_id}",
        headers=bob_h,
    )
    assert r.status_code == 404

    # Bob can't create on Alice's contact
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=bob_h,
        json={"contact_id": contact_id, "city": "Bob's"},
    )
    assert r.status_code == 404

    # Bob can't update or delete
    r = client.patch(
        f"{settings.API_V1_STR}/addresses/{address_id}",
        headers=bob_h,
        json={"city": "Hijack"},
    )
    assert r.status_code == 404

    r = client.delete(
        f"{settings.API_V1_STR}/addresses/{address_id}",
        headers=bob_h,
    )
    assert r.status_code == 404


def test_address_visible_via_tag_share(client: TestClient, db: Session) -> None:
    from tests.utils.user import (
        authentication_token_from_email,
        create_random_user,
    )

    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    tag = client.post(
        f"{settings.API_V1_STR}/tags/",
        headers=alice_h,
        json={"name": f"shared-{uuid.uuid4().hex[:6]}"},
    ).json()
    contact = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=alice_h,
        json={"first_name": "Shared", "tag_ids": [tag["id"]]},
    ).json()
    client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=alice_h,
        json={"contact_id": contact["id"], "city": "SharedTown"},
    )
    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    assert r.status_code == 200

    # Bob can read addresses on the shared contact
    r = client.get(
        f"{settings.API_V1_STR}/addresses/contact/{contact['id']}",
        headers=bob_h,
    )
    assert r.status_code == 200
    cities = [a["city"] for a in r.json()["data"]]
    assert "SharedTown" in cities

    # Bob can also create one on the shared contact
    r = client.post(
        f"{settings.API_V1_STR}/addresses/",
        headers=bob_h,
        json={"contact_id": contact["id"], "label": "via-share", "city": "BobCity"},
    )
    assert r.status_code == 200
