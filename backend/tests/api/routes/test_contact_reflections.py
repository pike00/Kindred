"""Tests for the contact reflections endpoint (journal entries referencing a contact)."""

import uuid

from fastapi.testclient import TestClient

from app.core.config import settings


def _create_contact(client: TestClient, headers: dict[str, str]) -> str:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json={"first_name": "Reflect"},
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_reflections_returns_linked_journal_entry(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A journal entry created with contact_ids shows up in /reflections.

    Regression: the endpoint previously assigned contact_ids onto the
    JournalEntry table instance, which SQLModel rejects, 500-ing the route.
    """
    contact_id = _create_contact(client, superuser_token_headers)

    r = client.post(
        f"{settings.API_V1_STR}/journal/",
        headers=superuser_token_headers,
        json={
            "body": "Had coffee and a good chat.",
            "entry_date": "2026-05-01",
            "contact_ids": [contact_id],
        },
    )
    assert r.status_code == 200, r.text
    entry_id = r.json()["id"]

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/reflections",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    entries = r.json()
    assert isinstance(entries, list)
    assert len(entries) == 1
    assert entries[0]["id"] == entry_id
    assert contact_id in entries[0]["contact_ids"]


def test_reflections_empty_when_no_entries(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A contact with no linked journal entries returns an empty list."""
    contact_id = _create_contact(client, superuser_token_headers)
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{contact_id}/reflections",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json() == []


def test_reflections_missing_contact_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """An unknown contact id returns 404, not a 500."""
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{uuid.uuid4()}/reflections",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
