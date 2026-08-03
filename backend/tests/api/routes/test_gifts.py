"""Tests for gift management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import AllContactsShare
from tests.utils.user import authentication_token_from_email, create_random_user


def _create_contact(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json={"first_name": f"GiftTest-{uuid.uuid4().hex[:6]}"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def _grant_all_contacts_share(db: Session, *, owner_id: str, grantee_id: str) -> None:
    db.add(AllContactsShare(owner_id=owner_id, grantee_id=grantee_id))
    db.commit()


def _create_gift(
    client: TestClient, headers: dict[str, str], contact_id: str, name: str = "Gift idea"
) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/gifts/",
        headers=headers,
        json={"contact_id": contact_id, "name": name},
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_deleted_gift_is_omitted_from_contact_list(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    gift_id = _create_gift(
        client, superuser_token_headers, contact_id, name="Hidden gift"
    )

    response = client.get(
        f"{settings.API_V1_STR}/gifts/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert gift_id in [gift["id"] for gift in response.json()["data"]]

    response = client.delete(
        f"{settings.API_V1_STR}/gifts/{gift_id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200

    response = client.get(
        f"{settings.API_V1_STR}/gifts/contact/{contact_id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert gift_id not in [gift["id"] for gift in response.json()["data"]]


def test_shared_grantee_can_update_and_delete_shared_gift(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact_id = _create_contact(client, alice_h)
    gift_id = _create_gift(client, alice_h, contact_id, name="Original gift")
    _grant_all_contacts_share(db, owner_id=alice.id, grantee_id=bob.id)

    response = client.patch(
        f"{settings.API_V1_STR}/gifts/{gift_id}",
        headers=bob_h,
        json={"name": "Updated by Bob"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated by Bob"

    response = client.delete(f"{settings.API_V1_STR}/gifts/{gift_id}", headers=bob_h)
    assert response.status_code == 200
    assert response.json()["ok"] is True

    response = client.get(
        f"{settings.API_V1_STR}/gifts/contact/{contact_id}",
        headers=bob_h,
    )
    assert response.status_code == 200
    assert gift_id not in [gift["id"] for gift in response.json()["data"]]


def test_unshared_user_cannot_update_or_delete_other_users_gift(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact_id = _create_contact(client, alice_h)
    gift_id = _create_gift(client, alice_h, contact_id, name="Private gift")

    response = client.patch(
        f"{settings.API_V1_STR}/gifts/{gift_id}",
        headers=bob_h,
        json={"name": "Hijacked"},
    )
    assert response.status_code == 404

    response = client.delete(f"{settings.API_V1_STR}/gifts/{gift_id}", headers=bob_h)
    assert response.status_code == 404
