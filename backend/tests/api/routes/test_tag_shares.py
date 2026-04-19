from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.user import authentication_token_from_email, create_random_user


def _make_tag(client, headers, name="t"):
    r = client.post(
        f"{settings.API_V1_STR}/tags/", headers=headers, json={"name": name}
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_share_and_unshare(client: TestClient, db: Session):
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    tag = _make_tag(client, alice_h, "shared-tag")

    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=alice_h,
        json={"tag_id": tag["id"], "grantee_id": str(bob.id)},
    )
    assert r.status_code == 200, r.text

    r = client.get(
        f"{settings.API_V1_STR}/tag-shares/?tag_id={tag['id']}",
        headers=alice_h,
    )
    assert r.status_code == 200
    assert r.json()["count"] == 1

    r = client.delete(
        f"{settings.API_V1_STR}/tag-shares/{tag['id']}/{bob.id}",
        headers=alice_h,
    )
    assert r.status_code == 200
    r = client.get(
        f"{settings.API_V1_STR}/tag-shares/?tag_id={tag['id']}",
        headers=alice_h,
    )
    assert r.json()["count"] == 0


def test_cannot_share_unowned_tag(client: TestClient, db: Session):
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(
        client=client, email=alice.email, db=db
    )
    bob_h = authentication_token_from_email(
        client=client, email=bob.email, db=db
    )
    tag = _make_tag(client, alice_h, "alices")
    r = client.post(
        f"{settings.API_V1_STR}/tag-shares/",
        headers=bob_h,
        json={"tag_id": tag["id"], "grantee_id": str(alice.id)},
    )
    assert r.status_code == 404
