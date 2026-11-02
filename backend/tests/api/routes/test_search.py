"""Tests for global full-text search results."""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_note_search_result_exposes_contact_id(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    contact_response = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Search Contact"},
    )
    assert contact_response.status_code == 200
    contact_id = contact_response.json()["id"]

    note_response = client.post(
        f"{settings.API_V1_STR}/notes/",
        headers=superuser_token_headers,
        json={
            "contact_id": contact_id,
            "body": "Unique zephyrquartz marker for note navigation.",
        },
    )
    assert note_response.status_code == 200

    response = client.get(
        f"{settings.API_V1_STR}/search",
        headers=superuser_token_headers,
        params={"q": "zephyrquartz"},
    )
    assert response.status_code == 200
    note_results = [
        result for result in response.json()["results"] if result["type"] == "note"
    ]
    assert len(note_results) == 1
    assert note_results[0]["contact_id"] == contact_id
