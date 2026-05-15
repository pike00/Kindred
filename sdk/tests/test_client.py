"""Tests for KindredClient using mocked httpx responses."""

import json
import uuid
from datetime import datetime, timezone

import pytest
from pytest_httpx import HTTPXMock

from kindred import KindredClient, KindredAuthError, KindredNotFoundError
from kindred.models import Contact, Note, Relationship

BASE = "https://kindred.example.com"
API_KEY = "test-key"

CONTACT_ID = uuid.uuid4()
REL_ID = uuid.uuid4()
NOTE_ID = uuid.uuid4()

NOW = datetime.now(timezone.utc).isoformat()

CONTACT_FIXTURE = {
    "id": str(CONTACT_ID),
    "first_name": "Alice",
    "last_name": "Smith",
    "source_external_id": "ext-001",
    "is_favorite": False,
    "is_archived": False,
    "is_deceased": False,
    "do_not_contact": False,
    "created_at": NOW,
    "updated_at": NOW,
    "groups": [],
}

REL_FIXTURE = {
    "id": str(REL_ID),
    "relationship_type": "friend",
    "contact_id": str(CONTACT_ID),
    "related_contact_id": str(uuid.uuid4()),
}

NOTE_FIXTURE = {
    "id": str(NOTE_ID),
    "body": "Met at PyCon",
    "contact_id": str(CONTACT_ID),
    "created_at": NOW,
    "updated_at": NOW,
}


@pytest.fixture
def client():
    with KindredClient(base_url=BASE, api_key=API_KEY) as c:
        yield c


# ── contacts.list ──────────────────────────────────────────────────────────────


def test_contacts_list_single_page(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/?skip=0&limit=100",
        json={"data": [CONTACT_FIXTURE], "count": 1},
    )
    contacts = client.contacts.list()
    assert len(contacts) == 1
    assert isinstance(contacts[0], Contact)
    assert contacts[0].first_name == "Alice"


def test_contacts_list_paginates(httpx_mock: HTTPXMock, client):
    # First page returns 1 of 2
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/?skip=0&limit=100",
        json={"data": [CONTACT_FIXTURE], "count": 2},
    )
    second = {**CONTACT_FIXTURE, "id": str(uuid.uuid4()), "first_name": "Bob"}
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/?skip=100&limit=100",
        json={"data": [second], "count": 2},
    )
    contacts = client.contacts.list()
    assert len(contacts) == 2
    assert contacts[1].first_name == "Bob"


def test_contacts_list_auth_error(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/?skip=0&limit=100",
        status_code=401,
        json={"detail": "Unauthorized"},
    )
    with pytest.raises(KindredAuthError):
        client.contacts.list()


def test_contacts_get_not_found(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/{CONTACT_ID}",
        status_code=404,
        json={"detail": "Not found"},
    )
    with pytest.raises(KindredNotFoundError):
        client.contacts.get(CONTACT_ID)


def test_contacts_find_by_external_id(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/?skip=0&limit=100",
        json={"data": [CONTACT_FIXTURE], "count": 1},
    )
    found = client.contacts.find_by_external_id("ext-001")
    assert found is not None
    assert found.source_external_id == "ext-001"


def test_contacts_find_by_external_id_missing(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/contacts/?skip=0&limit=100",
        json={"data": [CONTACT_FIXTURE], "count": 1},
    )
    assert client.contacts.find_by_external_id("nope") is None


# ── relationships.list_for_contact ─────────────────────────────────────────────


def test_relationships_list_for_contact(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/relationships/contact/{CONTACT_ID}",
        json={"data": [REL_FIXTURE], "count": 1},
    )
    rels = client.relationships.list_for_contact(CONTACT_ID)
    assert len(rels) == 1
    assert isinstance(rels[0], Relationship)
    assert rels[0].relationship_type == "friend"


# ── notes.list_for_contact ──────────────────────────────────────────────────────


def test_notes_list_for_contact(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        url=f"{BASE}/api/v1/notes/contact/{CONTACT_ID}?skip=0&limit=1000",
        json={"data": [NOTE_FIXTURE], "count": 1},
    )
    notes = client.notes.list_for_contact(CONTACT_ID)
    assert len(notes) == 1
    assert isinstance(notes[0], Note)
    assert notes[0].body == "Met at PyCon"


# ── write operations ───────────────────────────────────────────────────────────


def test_contacts_create(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/v1/contacts/",
        json=CONTACT_FIXTURE,
    )
    from kindred.models import ContactCreate
    c = client.contacts.create(ContactCreate(first_name="Alice", last_name="Smith"))
    assert c.first_name == "Alice"


def test_notes_create(httpx_mock: HTTPXMock, client):
    httpx_mock.add_response(
        method="POST",
        url=f"{BASE}/api/v1/notes/",
        json=NOTE_FIXTURE,
    )
    from kindred.models import NoteCreate
    n = client.notes.create(NoteCreate(contact_id=CONTACT_ID, body="Met at PyCon"))
    assert n.body == "Met at PyCon"
