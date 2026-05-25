"""Tests for the Tag CRUD routes, including the description field merged in
from the legacy Group model on 2026-05-06.

Description-field cases are flagged inline so the regression intent is obvious
if a future refactor tries to slim Tag back down to just (name, color)."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.user import authentication_token_from_email, create_random_user


def _create_tag(client: TestClient, headers: dict, **fields) -> dict:
    payload = {"name": "default"}
    payload.update(fields)
    r = client.post(f"{settings.API_V1_STR}/tags/", headers=headers, json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def test_create_minimal_tag(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(client, superuser_token_headers, name="Friends")
    assert tag["name"] == "Friends"
    assert tag["color"] is None
    assert tag["description"] is None
    assert "id" in tag
    assert "created_at" in tag


def test_create_tag_with_color(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(client, superuser_token_headers, name="VIP", color="#ff0000")
    assert tag["color"] == "#ff0000"


def test_create_tag_with_description(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Regression: Tag.description was added when Group was merged into Tag."""
    tag = _create_tag(
        client,
        superuser_token_headers,
        name="Family",
        description="Parents, siblings, in-laws",
    )
    assert tag["description"] == "Parents, siblings, in-laws"


def test_create_tag_full_payload(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(
        client,
        superuser_token_headers,
        name="Work Team",
        color="#3b82f6",
        description="Current direct reports + skip-level",
    )
    assert tag["name"] == "Work Team"
    assert tag["color"] == "#3b82f6"
    assert tag["description"] == "Current direct reports + skip-level"


def test_create_tag_rejects_blank_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/tags/",
        headers=superuser_token_headers,
        json={"name": ""},
    )
    assert r.status_code == 422


def test_create_tag_rejects_overlong_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/tags/",
        headers=superuser_token_headers,
        json={"name": "x" * 101},
    )
    assert r.status_code == 422


def test_create_tag_rejects_overlong_description(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Regression: description has the same 1000-char cap the old Group field had."""
    r = client.post(
        f"{settings.API_V1_STR}/tags/",
        headers=superuser_token_headers,
        json={"name": "Long", "description": "x" * 1001},
    )
    assert r.status_code == 422


def test_create_tag_accepts_max_length_description(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(
        client,
        superuser_token_headers,
        name="Boundary",
        description="x" * 1000,
    )
    assert len(tag["description"]) == 1000


def test_list_tags(client: TestClient, superuser_token_headers: dict[str, str]) -> None:
    _create_tag(client, superuser_token_headers, name="ListA")
    _create_tag(client, superuser_token_headers, name="ListB")
    r = client.get(f"{settings.API_V1_STR}/tags/", headers=superuser_token_headers)
    assert r.status_code == 200
    body = r.json()
    names = [t["name"] for t in body["data"]]
    assert "ListA" in names
    assert "ListB" in names
    assert body["count"] >= 2
    # Description must be present in the list response too — frontend renders it.
    for t in body["data"]:
        assert "description" in t


def test_update_tag_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(client, superuser_token_headers, name="Before")
    r = client.patch(
        f"{settings.API_V1_STR}/tags/{tag['id']}",
        headers=superuser_token_headers,
        json={"name": "After"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "After"


def test_update_tag_description_preserves_other_fields(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Regression: a partial PATCH on description must not wipe name or color."""
    tag = _create_tag(
        client,
        superuser_token_headers,
        name="Stable",
        color="#abcdef",
        description="initial",
    )
    r = client.patch(
        f"{settings.API_V1_STR}/tags/{tag['id']}",
        headers=superuser_token_headers,
        json={"description": "updated"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["description"] == "updated"
    assert body["name"] == "Stable"
    assert body["color"] == "#abcdef"


def test_update_tag_clears_description_with_null(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(
        client,
        superuser_token_headers,
        name="Clearable",
        description="will be cleared",
    )
    r = client.patch(
        f"{settings.API_V1_STR}/tags/{tag['id']}",
        headers=superuser_token_headers,
        json={"description": None},
    )
    assert r.status_code == 200
    assert r.json()["description"] is None


def test_update_other_users_tag_forbidden(client: TestClient, db: Session) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)
    tag = _create_tag(client, alice_h, name="Alices")
    r = client.patch(
        f"{settings.API_V1_STR}/tags/{tag['id']}",
        headers=bob_h,
        json={"name": "stolen"},
    )
    assert r.status_code in (403, 404)  # tag is invisible to bob


def test_update_missing_tag_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    fake_id = str(uuid.uuid4())
    r = client.patch(
        f"{settings.API_V1_STR}/tags/{fake_id}",
        headers=superuser_token_headers,
        json={"name": "ghost"},
    )
    assert r.status_code == 404


def test_delete_tag(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    tag = _create_tag(client, superuser_token_headers, name="Delete-me")
    r = client.delete(
        f"{settings.API_V1_STR}/tags/{tag['id']}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    # Subsequent delete is a 404 (tag is gone)
    r = client.delete(
        f"{settings.API_V1_STR}/tags/{tag['id']}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_delete_other_users_tag_forbidden(client: TestClient, db: Session) -> None:
    alice = create_random_user(db)
    bob = create_random_user(db)
    alice_h = authentication_token_from_email(client=client, email=alice.email, db=db)
    bob_h = authentication_token_from_email(client=client, email=bob.email, db=db)
    tag = _create_tag(client, alice_h, name="Alices")
    r = client.delete(f"{settings.API_V1_STR}/tags/{tag['id']}", headers=bob_h)
    assert r.status_code in (403, 404)
