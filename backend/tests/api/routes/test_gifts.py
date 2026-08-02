"""Tests for gift management routes."""

import uuid

from fastapi.testclient import TestClient

from app.core.config import settings


def _create_contact(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json={"first_name": f"GiftTest-{uuid.uuid4().hex[:6]}"},
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_deleted_gift_is_omitted_from_contact_list(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_id = _create_contact(client, superuser_token_headers)
    response = client.post(
        f"{settings.API_V1_STR}/gifts/",
        headers=superuser_token_headers,
        json={"contact_id": contact_id, "name": "Hidden gift"},
    )
    assert response.status_code == 200
    gift_id = response.json()["id"]

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
