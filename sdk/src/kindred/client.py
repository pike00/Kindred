"""Kindred personal CRM API client — API key auth, synchronous."""

from __future__ import annotations

import time
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

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


def _request_with_retry(
    http: httpx.Client,
    method: str,
    path: str,
    retry: int,
    **kwargs: Any,
) -> httpx.Response:
    """Execute a request, retrying on 5xx up to `retry` additional times with exponential backoff."""
    for attempt in range(retry + 1):
        resp = http.request(method, path, **kwargs)
        if resp.is_server_error and attempt < retry:
            time.sleep(0.5 * (2**attempt))
            continue
        return resp
    return resp  # type: ignore[return-value]  # loop always executes at least once


def _get_all_pages(
    http: httpx.Client,
    path: str,
    retry: int,
    extra_params: dict[str, Any] | None = None,
) -> list[dict]:
    """Fetch all pages from an offset-paginated endpoint."""
    out: list[dict] = []
    skip = 0
    while True:
        params: dict[str, Any] = {"skip": skip, "limit": _DEFAULT_PAGE_SIZE}
        if extra_params:
            params.update(extra_params)
        resp = _request_with_retry(http, "GET", path, retry, params=params)
        _raise_for_status(resp)
        body = resp.json()
        page = body.get("data", [])
        out.extend(page)
        if len(out) >= body.get("count", len(out)):
            break
        skip += _DEFAULT_PAGE_SIZE
    return out


class ContactsResource:
    def __init__(self, http: httpx.Client, retry: int) -> None:
        self._http = http
        self._retry = retry

    def list(self, *, search: str | None = None, stage: str | None = None) -> list[Contact]:
        extra: dict[str, Any] = {}
        if search is not None:
            extra["search"] = search
        if stage is not None:
            extra["stage"] = stage
        rows = _get_all_pages(self._http, "/api/v1/contacts/", self._retry, extra or None)
        return [Contact.model_validate(r) for r in rows]

    def search(self, query: str) -> list[Contact]:
        """Server-side full-text search across name, nickname, and company."""
        return self.list(search=query)

    def get(self, contact_id: uuid.UUID) -> Contact:
        resp = _request_with_retry(self._http, "GET", f"/api/v1/contacts/{contact_id}", self._retry)
        _raise_for_status(resp)
        return Contact.model_validate(resp.json())

    def create(self, data: ContactCreate) -> Contact:
        resp = _request_with_retry(
            self._http, "POST", "/api/v1/contacts/",
            self._retry,
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Contact.model_validate(resp.json())

    def update(self, contact_id: uuid.UUID, data: ContactUpdate) -> Contact:
        resp = _request_with_retry(
            self._http, "PATCH", f"/api/v1/contacts/{contact_id}",
            self._retry,
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

    def losing_touch(self) -> list[Contact]:
        """Return contacts whose contact_frequency_days cadence has elapsed since last_contacted_at."""
        now = datetime.now(timezone.utc)
        out: list[Contact] = []
        for c in self.list():
            if not c.contact_frequency_days or c.is_archived or c.do_not_contact:
                continue
            if c.last_contacted_at is None or (now - c.last_contacted_at).days >= c.contact_frequency_days:
                out.append(c)
        return out


class RelationshipsResource:
    def __init__(self, http: httpx.Client, retry: int) -> None:
        self._http = http
        self._retry = retry

    def list_for_contact(self, contact_id: uuid.UUID) -> list[Relationship]:
        resp = _request_with_retry(
            self._http, "GET", f"/api/v1/relationships/contact/{contact_id}", self._retry
        )
        _raise_for_status(resp)
        body = resp.json()
        return [Relationship.model_validate(r) for r in body.get("data", [])]

    def create(self, data: RelationshipCreate) -> Relationship:
        resp = _request_with_retry(
            self._http, "POST", "/api/v1/relationships/",
            self._retry,
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Relationship.model_validate(resp.json())

    def update(self, rel_id: uuid.UUID, data: RelationshipUpdate) -> Relationship:
        resp = _request_with_retry(
            self._http, "PATCH", f"/api/v1/relationships/{rel_id}",
            self._retry,
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Relationship.model_validate(resp.json())

    def delete(self, rel_id: uuid.UUID) -> None:
        resp = _request_with_retry(
            self._http, "DELETE", f"/api/v1/relationships/{rel_id}", self._retry
        )
        _raise_for_status(resp)


class NotesResource:
    def __init__(self, http: httpx.Client, retry: int) -> None:
        self._http = http
        self._retry = retry

    def list_for_contact(self, contact_id: uuid.UUID) -> list[Note]:
        resp = _request_with_retry(
            self._http, "GET", f"/api/v1/notes/contact/{contact_id}",
            self._retry,
            params={"skip": 0, "limit": 1000},
        )
        _raise_for_status(resp)
        return [Note.model_validate(r) for r in resp.json().get("data", [])]

    def create(self, data: NoteCreate) -> Note:
        resp = _request_with_retry(
            self._http, "POST", "/api/v1/notes/",
            self._retry,
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Note.model_validate(resp.json())

    def update(self, note_id: uuid.UUID, data: NoteUpdate) -> Note:
        resp = _request_with_retry(
            self._http, "PATCH", f"/api/v1/notes/{note_id}",
            self._retry,
            json=data.model_dump(mode="json", exclude_none=True),
        )
        _raise_for_status(resp)
        return Note.model_validate(resp.json())


class GroupsResource:
    def __init__(self, http: httpx.Client, retry: int) -> None:
        self._http = http
        self._retry = retry

    def list(self) -> list[Group]:
        rows = _get_all_pages(self._http, "/api/v1/groups/", self._retry)
        return [Group.model_validate(r) for r in rows]


class KindredClient:
    """Synchronous Kindred CRM client.

    Usage::

        client = KindredClient(base_url="https://kindred.example.com", api_key="...")
        contacts = client.contacts.list()
        overdue = client.contacts.losing_touch()
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 15.0,
        retry: int = 0,
        on_request: Callable[[httpx.Request], None] | None = None,
        on_response: Callable[[httpx.Response], None] | None = None,
    ) -> None:
        event_hooks: dict[str, list] = {}
        if on_request is not None:
            event_hooks["request"] = [on_request]
        if on_response is not None:
            event_hooks["response"] = [on_response]

        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
            event_hooks=event_hooks or None,
        )
        self._retry = retry
        self.contacts = ContactsResource(self._http, retry)
        self.relationships = RelationshipsResource(self._http, retry)
        self.notes = NotesResource(self._http, retry)
        self.groups = GroupsResource(self._http, retry)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> KindredClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
