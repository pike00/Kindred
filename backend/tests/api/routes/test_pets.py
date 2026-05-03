"""Tests for pet management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    body: dict[str, object] = {
        "first_name": first_name or f"PetTest-{uuid.uuid4().hex[:6]}"
    }
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json=body,
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_create_pet_minimal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "name": "Rex"},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["name"] == "Rex"
    assert content["contact_id"] == contact_id
    assert "id" in content


def test_create_pet_full(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "name": "Whiskers",
            "species": "cat",
            "breed": "tabby",
            "notes": "Allergic to chicken",
        },
    )
    assert r.status_code == 200
    content = r.json()
    assert content["species"] == "cat"
    assert content["breed"] == "tabby"
    assert content["notes"] == "Allergic to chicken"


def test_create_pet_missing_name_422(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id},
    )
    assert r.status_code == 422


def test_create_pet_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": str(uuid.uuid4()), "name": "Ghost"},
    )
    assert r.status_code == 404


def test_list_pets(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "name": "Fido", "species": "dog"},
    )
    client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "name": "Mittens", "species": "cat"},
    )

    r = client.get(
        f"{settings.API_V1_STR}/pets/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    names = sorted(p["name"] for p in body["data"])
    assert names == ["Fido", "Mittens"]


def test_list_pets_unknown_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/pets/contact/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_update_pet(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "name": "Buddy", "species": "dog"},
    )
    pet_id = r.json()["id"]

    r = client.patch(
        f"{settings.API_V1_STR}/pets/{pet_id}",
        headers=superuser_token_headers,
        json={"name": "Buddy II", "breed": "labrador"},
    )
    assert r.status_code == 200
    content = r.json()
    assert content["name"] == "Buddy II"
    assert content["breed"] == "labrador"
    assert content["species"] == "dog"  # untouched


def test_update_pet_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.patch(
        f"{settings.API_V1_STR}/pets/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json={"name": "Phantom"},
    )
    assert r.status_code == 404


def test_delete_pet(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "name": "Goldie"},
    )
    pet_id = r.json()["id"]

    r = client.delete(
        f"{settings.API_V1_STR}/pets/{pet_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    r = client.get(
        f"{settings.API_V1_STR}/pets/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert pet_id not in [p["id"] for p in r.json()["data"]]


def test_delete_pet_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/pets/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_pet_isolation_between_users(client: TestClient, db: Session) -> None:
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
        f"{settings.API_V1_STR}/pets/",
        headers=alice_h,
        json={"contact_id": contact_id, "name": "Secret"},
    )
    pet_id = r.json()["id"]

    # Bob cannot list pets on Alice's contact
    r = client.get(
        f"{settings.API_V1_STR}/pets/contact/{contact_id}",
        headers=bob_h,
    )
    assert r.status_code in (403, 404)

    # Bob cannot create
    r = client.post(
        f"{settings.API_V1_STR}/pets/",
        headers=bob_h,
        json={"contact_id": contact_id, "name": "Hijack"},
    )
    assert r.status_code in (403, 404)

    # Bob cannot update or delete
    r = client.patch(
        f"{settings.API_V1_STR}/pets/{pet_id}",
        headers=bob_h,
        json={"name": "Hijacked"},
    )
    assert r.status_code in (403, 404)

    r = client.delete(
        f"{settings.API_V1_STR}/pets/{pet_id}",
        headers=bob_h,
    )
    assert r.status_code in (403, 404)
