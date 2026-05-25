"""Tests for the contact interaction-heatmap endpoint."""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_contact_heatmap_returns_52_weeks(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A contact with no interactions yields 52 zero-count week buckets."""
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=superuser_token_headers,
        json={"first_name": "Heat", "last_name": "Map"},
    )
    assert r.status_code == 200
    contact_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/heatmap",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "data" in body
    assert len(body["data"]) == 52
    for bucket in body["data"]:
        assert "week_start" in bucket
        assert "count" in bucket
        assert bucket["count"] == 0


def test_contact_heatmap_missing_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """An unknown contact id returns 404, not a 500."""
    r = client.get(
        f"{settings.API_V1_STR}/contacts/"
        "00000000-0000-0000-0000-000000000000/heatmap",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
