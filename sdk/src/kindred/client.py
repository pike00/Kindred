"""Kindred personal CRM API client — API key auth, synchronous."""

from __future__ import annotations

import uuid

import httpx

from .exceptions import KindredAPIError, KindredAuthError, KindredNotFoundError
from .models import (
    Contact,
    ContactCreate,
    ContactUpdate,
    Group,
    Note,
    NoteCreate,
    NoteUpdate,
    Relationship,
    RelationshipCreate,
    RelationshipUpdate,
)

_DEFAULT_PAGE_SIZE = 100


def _raise_for_status(resp: httpx.Response) -> None:
    if resp.status_code == 401:
        raise KindredAuthError("Invalid or missing API key")
    if resp.status_code == 404:
        raise KindredNotFoundError(resp.url.path)
    if not resp.is_success:
        try:
            detail = resp.json().get("detail", resp.text)
        except Exception:
            detail = resp.text
        raise KindredAPIError(resp.status_code, detail)


def _get_all_pages(client: httpx.Client, path: str) -> list[dict]:
    """Fetch all pages from an offset-paginated endpoint."""
    out: list[dict] = []
    skip = 0
    while True:
        resp = client.get(path, params={"skip": skip, "limit": _DEFAULT_PAGE_SIZE})
        _raise_for_status(resp)
        body = resp.json()
        page = body.get("data", [])
        out.extend(page)
        if len(out) >= body.get("count", len(out)):
            break
        skip += _DEFAULT_PAGE_SIZE
    return out


class ContactsResource:
    def __init__(self, http: httpx.Client) -> None:
        self._http = http

    def list(self) -> list[Contact]:
        rows = _get_all_pages(self._http, "/api/v1/contacts/")
        return [Contact.model_validate(r) for r in rows]

    def get(self, contact_id: uuid.UUID) -> Contact:
        resp = self._http.get(f"/api/v1/contacts/{contact_id}")
        _raise_for_status(resp)
        return Contact.model_validate(resp.json())

    def create(self, data: ContactCreate) -> Contact:
        resp = self._http.post("/api/v1/contacts/", json=data.model_dump(mode="json", exclude_none=True))
        _raise_for_status(resp)
        return Contact.model_validate(resp.json())

    def update(self, contact_id: uuid.UUID, data: ContactUpdate) -> Contact:
        resp = self._http.patch(
            f"/api/v1/contacts/{contact_id}",
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Contact.model_validate(resp.json())

    def find_by_external_id(self, external_id: str) -> Contact | None:
        """Return the contact whose source_external_id matches, or None."""
        contacts = self.list()
        for c in contacts:
            if c.source_external_id == external_id:
                return c
        return None


class RelationshipsResource:
    def __init__(self, http: httpx.Client) -> None:
        self._http = http

    def list_for_contact(self, contact_id: uuid.UUID) -> list[Relationship]:
        resp = self._http.get(f"/api/v1/relationships/contact/{contact_id}")
        _raise_for_status(resp)
        body = resp.json()
        return [Relationship.model_validate(r) for r in body.get("data", [])]

    def create(self, data: RelationshipCreate) -> Relationship:
        resp = self._http.post("/api/v1/relationships/", json=data.model_dump(mode="json", exclude_none=True))
        _raise_for_status(resp)
        return Relationship.model_validate(resp.json())

    def update(self, rel_id: uuid.UUID, data: RelationshipUpdate) -> Relationship:
        resp = self._http.patch(
            f"/api/v1/relationships/{rel_id}",
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Relationship.model_validate(resp.json())

    def delete(self, rel_id: uuid.UUID) -> None:
        resp = self._http.delete(f"/api/v1/relationships/{rel_id}")
        _raise_for_status(resp)


class NotesResource:
    def __init__(self, http: httpx.Client) -> None:
        self._http = http

    def list_for_contact(self, contact_id: uuid.UUID) -> list[Note]:
        # Notes are contact-scoped; API returns all without cursor
        resp = self._http.get(
            f"/api/v1/notes/contact/{contact_id}",
            params={"skip": 0, "limit": 1000},
        )
        _raise_for_status(resp)
        return [Note.model_validate(r) for r in resp.json().get("data", [])]

    def create(self, data: NoteCreate) -> Note:
        resp = self._http.post("/api/v1/notes/", json=data.model_dump(mode="json", exclude_none=True))
        _raise_for_status(resp)
        return Note.model_validate(resp.json())

    def update(self, note_id: uuid.UUID, data: NoteUpdate) -> Note:
        resp = self._http.patch(
            f"/api/v1/notes/{note_id}",
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Note.model_validate(resp.json())


class GroupsResource:
    def __init__(self, http: httpx.Client) -> None:
        self._http = http

    def list(self) -> list[Group]:
        rows = _get_all_pages(self._http, "/api/v1/groups/")
        return [Group.model_validate(r) for r in rows]


class KindredClient:
    """Synchronous Kindred CRM client.

    Usage::

        client = KindredClient(base_url="https://kindred.example.com", api_key="...")
        contacts = client.contacts.list()
    """

    def __init__(self, base_url: str, api_key: str, timeout: float = 15.0) -> None:
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )
        self.contacts = ContactsResource(self._http)
        self.relationships = RelationshipsResource(self._http)
        self.notes = NotesResource(self._http)
        self.groups = GroupsResource(self._http)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> KindredClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
