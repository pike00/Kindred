"""Tests for @-mention backlinks in notes."""

import uuid

from fastapi.testclient import TestClient

from app.core.config import settings


def _create_contact(
    client: TestClient, headers: dict[str, str], first_name: str
) -> str:
    r = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=headers,
        json={"first_name": first_name},
    )
    assert r.status_code == 200
    return r.json()["id"]


def _create_note(
    client: TestClient, headers: dict[str, str], contact_id: str, body: str
) -> dict:
    r = client.post(
        f"{settings.API_V1_STR}/notes/",
        headers=headers,
        json={"contact_id": contact_id, "body": body},
    )
    assert r.status_code == 200
    return r.json()


# ─── Mention parsing ──────────────────────────────────────────────────────────


def test_creating_note_with_mention_populates_note_mention_table(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A note body with @[Name](uuid) token creates a note_mention row for the mentioned contact."""
    alice_id = _create_contact(client, superuser_token_headers, "Alice")
    bob_id = _create_contact(client, superuser_token_headers, "Bob")

    note = _create_note(
        client,
        superuser_token_headers,
        alice_id,
        "Had lunch with @[Bob]({bob_id}) today.".replace("{bob_id}", bob_id),
    )

    # Bob should appear in his own mentions list
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{bob_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    mentions = r.json()
    assert len(mentions) == 1
    assert mentions[0]["note_id"] == note["id"]
    assert mentions[0]["source_contact"]["id"] == alice_id


def test_mention_does_not_appear_in_subject_contacts_mentions(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Alice's own mentions endpoint should not list notes from Alice's page (those are direct notes, not backlinks)."""
    alice_id = _create_contact(client, superuser_token_headers, "Alice2")
    bob_id = _create_contact(client, superuser_token_headers, "Bob2")

    _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"Called @[Bob2]({bob_id}).",
    )

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{alice_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    # Alice's mentions endpoint shows notes that mention Alice, not notes authored on Alice's page
    assert all(m["source_contact"]["id"] != alice_id for m in r.json())


def test_multiple_mentions_in_one_note(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A note mentioning two contacts creates one note_mention row per mentioned contact."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceM")
    bob_id = _create_contact(client, superuser_token_headers, "BobM")
    charlie_id = _create_contact(client, superuser_token_headers, "CharlieM")

    note = _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"Dinner with @[BobM]({bob_id}) and @[CharlieM]({charlie_id}).",
    )

    for cid in (bob_id, charlie_id):
        r = client.get(
            f"{settings.API_V1_STR}/contacts/{cid}/mentions",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        note_ids = [m["note_id"] for m in r.json()]
        assert note["id"] in note_ids


def test_updating_note_body_updates_mentions(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Editing a note replaces the old mention rows with fresh ones from the new body."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceU")
    bob_id = _create_contact(client, superuser_token_headers, "BobU")
    charlie_id = _create_contact(client, superuser_token_headers, "CharlieU")

    note = _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"Saw @[BobU]({bob_id}) today.",
    )

    # Update: remove Bob, add Charlie
    r = client.patch(
        f"{settings.API_V1_STR}/notes/{note['id']}",
        headers=superuser_token_headers,
        json={"body": f"Saw @[CharlieU]({charlie_id}) today."},
    )
    assert r.status_code == 200

    # Charlie now mentioned
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{charlie_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert any(m["note_id"] == note["id"] for m in r.json())

    # Bob no longer mentioned
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{bob_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert all(m["note_id"] != note["id"] for m in r.json())


def test_deleting_note_removes_mention_rows(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Deleting a note cascades to note_mention rows."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceDel")
    bob_id = _create_contact(client, superuser_token_headers, "BobDel")

    note = _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"With @[BobDel]({bob_id}).",
    )

    client.delete(
        f"{settings.API_V1_STR}/notes/{note['id']}",
        headers=superuser_token_headers,
    )

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{bob_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert all(m["note_id"] != note["id"] for m in r.json())


# ─── Backlink timeline (notes list includes mentions) ─────────────────────────


def test_notes_list_for_contact_includes_notes_where_they_are_mentioned(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """GET /notes/contact/{bob_id} returns notes authored on Alice's page that @-mention Bob."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceBL")
    bob_id = _create_contact(client, superuser_token_headers, "BobBL")

    note = _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"Coffee with @[BobBL]({bob_id}).",
    )

    r = client.get(
        f"{settings.API_V1_STR}/notes/contact/{bob_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    note_ids = [n["id"] for n in r.json()["data"]]
    assert note["id"] in note_ids


def test_notes_list_does_not_duplicate_self_authored_notes(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """A note on Alice's page that also @-mentions Alice should appear exactly once in Alice's notes list."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceSelf")

    note = _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"Reminder to myself @[AliceSelf]({alice_id}) to call dentist.",
    )

    r = client.get(
        f"{settings.API_V1_STR}/notes/contact/{alice_id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    note_ids = [n["id"] for n in r.json()["data"]]
    assert note_ids.count(note["id"]) == 1


# ─── Mentions endpoint response shape ────────────────────────────────────────


def test_mentions_endpoint_returns_source_contact_info(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Each mention entry includes the source contact's id, first_name, and last_name."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceInfo")
    bob_id = _create_contact(client, superuser_token_headers, "BobInfo")

    _create_note(
        client,
        superuser_token_headers,
        alice_id,
        f"With @[BobInfo]({bob_id}).",
    )

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{bob_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    mention = r.json()[0]
    assert "note_id" in mention
    assert "note_body" in mention
    assert "note_created_at" in mention
    assert mention["source_contact"]["id"] == alice_id
    assert mention["source_contact"]["first_name"] == "AliceInfo"


def test_mentions_endpoint_404_for_unknown_contact(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/contacts/{uuid.uuid4()}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_note_without_mentions_produces_no_mention_rows(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Plain notes with no @-tokens create no note_mention rows."""
    alice_id = _create_contact(client, superuser_token_headers, "AliceNoMention")
    bob_id = _create_contact(client, superuser_token_headers, "BobNoMention")

    _create_note(client, superuser_token_headers, alice_id, "Just a plain note.")

    r = client.get(
        f"{settings.API_V1_STR}/contacts/{bob_id}/mentions",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json() == []
