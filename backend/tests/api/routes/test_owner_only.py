"""Confirm journal/tags remain owner-only (never shared via tag)."""

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.user import authentication_token_from_email, create_random_user


def _two_users(client: TestClient, db: Session) -> tuple[dict, dict]:
    alice = create_random_user(db)
    bob = create_random_user(db)
    return (
        authentication_token_from_email(client=client, email=alice.email, db=db),
        authentication_token_from_email(client=client, email=bob.email, db=db),
    )


def test_journal_isolated_between_users(client: TestClient, db: Session) -> None:
    from datetime import date

    alice_h, bob_h = _two_users(client, db)
    r = client.post(
        f"{settings.API_V1_STR}/journal/",
        headers=alice_h,
        json={"body": "private thoughts", "entry_date": date.today().isoformat()},
    )
    assert r.status_code == 200, r.text
    entry = r.json()
    r = client.get(f"{settings.API_V1_STR}/journal/", headers=bob_h)
    assert r.status_code == 200
    assert entry["id"] not in [x["id"] for x in r.json()["data"]]


def test_tags_isolated_between_users(client: TestClient, db: Session) -> None:
    alice_h, bob_h = _two_users(client, db)
    t = client.post(
        f"{settings.API_V1_STR}/tags/", headers=alice_h, json={"name": "alices-tag"}
    ).json()
    r = client.get(f"{settings.API_V1_STR}/tags/", headers=bob_h)
    assert r.status_code == 200
    assert t["id"] not in [x["id"] for x in r.json()["data"]]
