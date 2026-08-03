from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.crud import create_user
from app.core.config import settings
from app.models import AllContactsShare, UserCreate
from tests.utils.user import authentication_token_from_email, create_random_user
from tests.utils.utils import random_email, random_lower_string

API = settings.API_V1_STR


def _create_inactive_user(db: Session):
    return create_user(
        session=db,
        user_create=UserCreate(
            email=random_email(),
            password=random_lower_string(),
            is_active=False,
        ),
    )


def test_create_contact_share_by_grantee_id(client: TestClient, db: Session) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id)},
    )

    assert r.status_code == 200
    body = r.json()
    assert body["grantee_id"] == str(bob.id)
    assert body["grantee_email"] == bob.email

    share = db.get(AllContactsShare, (alice.id, bob.id))
    assert share is not None


def test_create_contact_share_by_grantee_email(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_email": bob.email},
    )

    assert r.status_code == 200
    assert r.json()["grantee_id"] == str(bob.id)
    assert r.json()["grantee_email"] == bob.email


def test_create_contact_share_rejects_missing_grantee_selector(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={},
    )

    assert r.status_code == 422
    assert "exactly one of grantee_id or grantee_email" in str(r.json()["detail"])


def test_create_contact_share_rejects_both_grantee_id_and_email(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id), "grantee_email": bob.email},
    )

    assert r.status_code == 422
    assert "exactly one of grantee_id or grantee_email" in str(r.json()["detail"])


def test_create_contact_share_rejects_conflicting_grantee_id_and_email(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    charlie = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id), "grantee_email": charlie.email},
    )

    assert r.status_code == 422
    assert "exactly one of grantee_id or grantee_email" in str(r.json()["detail"])


def test_create_contact_share_rejects_unknown_grantee(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_email": "missing@example.com"},
    )

    assert r.status_code == 404
    assert r.json()["detail"] == "Grantee not found"


def test_create_contact_share_rejects_inactive_grantee(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    inactive = _create_inactive_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(inactive.id)},
    )

    assert r.status_code == 404
    assert r.json()["detail"] == "Grantee not found"


def test_create_contact_share_rejects_self_share(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    r = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(alice.id)},
    )

    assert r.status_code == 400
    assert r.json()["detail"] == "Cannot share contacts with yourself"


def test_create_contact_share_is_idempotent(client: TestClient, db: Session) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)

    first = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id)},
    )
    second = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_email": bob.email},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()

    shares = db.exec(
        select(AllContactsShare).where(AllContactsShare.owner_id == alice.id)
    ).all()
    assert len(shares) == 1


def test_list_contact_shares_isolated_to_grantor(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    charlie = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    assert client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id)},
    ).status_code == 200
    assert client.post(
        f"{API}/contact-shares/",
        headers=bob_h,
        json={"grantee_id": str(charlie.id)},
    ).status_code == 200

    alice_list = client.get(f"{API}/contact-shares/", headers=alice_h)
    bob_list = client.get(f"{API}/contact-shares/", headers=bob_h)

    assert alice_list.status_code == 200
    assert bob_list.status_code == 200
    assert alice_list.json()["count"] == 1
    assert bob_list.json()["count"] == 1
    assert alice_list.json()["data"][0]["grantee_id"] == str(bob.id)
    assert bob_list.json()["data"][0]["grantee_id"] == str(charlie.id)


def test_delete_contact_share_restricted_to_grantor(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    charlie = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    assert client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(charlie.id)},
    ).status_code == 200

    forbidden = client.delete(f"{API}/contact-shares/{charlie.id}", headers=bob_h)
    allowed = client.delete(f"{API}/contact-shares/{charlie.id}", headers=alice_h)

    assert forbidden.status_code == 404
    assert allowed.status_code == 200
    assert allowed.json() == {"message": "Share removed"}
    assert db.get(AllContactsShare, (alice.id, charlie.id)) is None


def test_grantee_cannot_revoke_grantors_contact_share(
    client: TestClient, db: Session
) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)

    create_response = client.post(
        f"{API}/contact-shares/",
        headers=alice_h,
        json={"grantee_id": str(bob.id)},
    )
    assert create_response.status_code == 200

    revoke_response = client.delete(f"{API}/contact-shares/{bob.id}", headers=bob_h)

    assert revoke_response.status_code == 404
    assert db.get(AllContactsShare, (alice.id, bob.id)) is not None
