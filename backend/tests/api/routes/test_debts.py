"""Tests for debt management routes."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import AllContactsShare
from tests.utils.user import authentication_token_from_email, create_random_user


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str | None = None
) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json={"first_name": first_name or f"DebtTest-{uuid.uuid4().hex[:6]}"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def _grant_all_contacts_share(db: Session, *, owner_id: str, grantee_id: str) -> None:
    db.add(AllContactsShare(owner_id=owner_id, grantee_id=grantee_id))
    db.commit()


def _create_debt(
    client: TestClient, headers: dict[str, str], contact_id: str, reason: str = "Lunch"
) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/debts/",
        headers=headers,
        json={
            "contact_id": contact_id,
            "direction": "they_owe",
            "amount": 42.5,
            "reason": reason,
        },
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_shared_grantee_can_update_and_delete_shared_debt(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact_id = _create_contact(client, alice_h)
    debt_id = _create_debt(client, alice_h, contact_id)
    _grant_all_contacts_share(db, owner_id=alice.id, grantee_id=bob.id)

    response = client.patch(
        f"{settings.API_V1_STR}/debts/{debt_id}",
        headers=bob_h,
        json={"reason": "Updated by Bob", "amount": 50},
    )
    assert response.status_code == 200
    assert response.json()["reason"] == "Updated by Bob"
    assert response.json()["amount"] == 50

    response = client.delete(f"{settings.API_V1_STR}/debts/{debt_id}", headers=bob_h)
    assert response.status_code == 200
    assert response.json()["ok"] is True

    response = client.get(
        f"{settings.API_V1_STR}/debts/contact/{contact_id}",
        headers=bob_h,
    )
    assert response.status_code == 200
    assert debt_id not in [debt["id"] for debt in response.json()["data"]]


def test_unshared_user_cannot_update_or_delete_other_users_debt(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    contact_id = _create_contact(client, alice_h)
    debt_id = _create_debt(client, alice_h, contact_id)

    response = client.patch(
        f"{settings.API_V1_STR}/debts/{debt_id}",
        headers=bob_h,
        json={"reason": "Hijacked"},
    )
    assert response.status_code == 404

    response = client.delete(f"{settings.API_V1_STR}/debts/{debt_id}", headers=bob_h)
    assert response.status_code == 404
