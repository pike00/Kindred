"""Radicale storage plugin backed by the CRM's PostgreSQL database.

This module exposes a `Storage` class that Radicale loads via config.
It reads/writes contacts from the same database as the FastAPI app.
"""

import contextlib
import uuid as uuid_mod
from collections.abc import Iterable, Iterator, Mapping
from datetime import datetime, timezone
from email.utils import formatdate
from time import mktime

from radicale import item as radicale_item
from radicale import types as radicale_types
from radicale.storage import BaseCollection, BaseStorage
from sqlmodel import Session, create_engine, select

from app.core.config import settings
from app.models import Contact, User, VCardConflict
from app.vcard import compute_vcard_hash, normalize_vcard_for_hash


def _http_datetime(dt: datetime) -> str:
    """Format a datetime as an HTTP-date string."""
    stamp = mktime(dt.timetuple())
    return formatdate(timeval=stamp, localtime=False, usegmt=True)


class Collection(BaseCollection):
    """Represents a single CardDAV address book backed by a user's contacts."""

    def __init__(self, storage_ref: "Storage", path: str, user: str, **kwargs):
        self._storage = storage_ref
        self._path = path
        self._user = user
        self._meta: dict[str, str] = {}

    @property
    def path(self) -> str:
        return self._path

    @property
    def last_modified(self) -> str:
        return _http_datetime(datetime.now(timezone.utc))

    def get_multi(
        self, hrefs: Iterable[str]
    ) -> Iterable[tuple[str, radicale_item.Item | None]]:
        with self._storage.get_session() as session:
            user = session.exec(select(User).where(User.email == self._user)).first()
            if not user:
                return

            for href in hrefs:
                # href format: "{uuid}.vcf"
                uid_str = href.replace(".vcf", "")
                try:
                    uid = uuid_mod.UUID(uid_str)
                except ValueError:
                    yield (href, None)
                    continue

                contact = session.exec(
                    select(Contact).where(
                        Contact.id == uid,
                        Contact.owner_id == user.id,
                    )
                ).first()

                if contact and contact.vcard_raw:
                    item = radicale_item.Item(
                        collection_path=self._path,
                        text=contact.vcard_raw,
                        href=href,
                        uid=str(contact.id),
                    )
                    yield (href, item)
                else:
                    yield (href, None)

    def get_all(self) -> Iterable[radicale_item.Item]:
        with self._storage.get_session() as session:
            user = session.exec(select(User).where(User.email == self._user)).first()
            if not user:
                return

            contacts = session.exec(
                select(Contact).where(
                    Contact.owner_id == user.id,
                    Contact.vcard_raw.is_not(None),
                )
            ).all()

            for contact in contacts:
                yield radicale_item.Item(
                    collection_path=self._path,
                    text=contact.vcard_raw,
                    href=f"{contact.id}.vcf",
                    uid=str(contact.id),
                )

    def upload(
        self, href: str, item: radicale_item.Item
    ) -> tuple[radicale_item.Item, radicale_item.Item | None]:
        """Store or update a vCard from an iOS/macOS client."""
        from app.vcard import vcard_to_contact_data

        vcard_text = item.serialize()
        parsed = vcard_to_contact_data(vcard_text)

        with self._storage.get_session() as session:
            user = session.exec(select(User).where(User.email == self._user)).first()
            if not user:
                raise ValueError(f"User {self._user} not found")

            # Check if contact exists
            uid_str = href.replace(".vcf", "")
            old_item = None
            try:
                uid = uuid_mod.UUID(uid_str)
                existing = session.exec(
                    select(Contact).where(
                        Contact.id == uid,
                        Contact.owner_id == user.id,
                    )
                ).first()
            except ValueError:
                existing = None

            if existing:
                # Update existing contact
                if existing.vcard_raw:
                    old_item = radicale_item.Item(
                        collection_path=self._path,
                        text=existing.vcard_raw,
                        href=href,
                    )
                # Update fields from parsed vCard
                contact_data = parsed["contact"]

                # vCard hash verification for conflict detection
                incoming_hash = compute_vcard_hash(vcard_text)
                if existing.vcard_sha256 and existing.vcard_sha256 != incoming_hash:
                    # Hash mismatch - potential conflict
                    # Check if it's just whitespace/formatting drift
                    if existing.vcard_raw:
                        local_normalized = normalize_vcard_for_hash(existing.vcard_raw)
                        incoming_normalized = normalize_vcard_for_hash(vcard_text)
                        if local_normalized != incoming_normalized:
                            # Real conflict - store for user review
                            conflict = VCardConflict(
                                contact_id=existing.id,
                                incoming_vcard_raw=vcard_text,
                                incoming_hash=incoming_hash,
                                local_hash=existing.vcard_sha256,
                                local_vcard_raw=existing.vcard_raw,
                            )
                            session.add(conflict)

                for key, value in contact_data.items():
                    if hasattr(existing, key):
                        setattr(existing, key, value)
                existing.vcard_raw = vcard_text
                existing.vcard_etag = item.etag
                existing.vcard_sha256 = incoming_hash
            else:
                # Create new contact
                contact_data = parsed["contact"]
                Contact(
                    owner_id=user.id,
                    vcard_raw=vcard_text,
                    vcard_etag=item.etag,
                    vcard_sha256=compute_vcard_hash(vcard_text),
                    **contact_data,
                )

            session.commit()

        new_item = radicale_item.Item(
            collection_path=self._path,
            text=vcard_text,
            href=href,
        )
        return (new_item, old_item)

    def delete(self, href: str | None = None) -> None:
        if href is None:
            return  # Don't allow deleting the entire collection

        with self._storage.get_session() as session:
            user = session.exec(select(User).where(User.email == self._user)).first()
            if not user:
                return

            uid_str = href.replace(".vcf", "")
            try:
                uid = uuid_mod.UUID(uid_str)
            except ValueError:
                return

            contact = session.exec(
                select(Contact).where(
                    Contact.id == uid,
                    Contact.owner_id == user.id,
                )
            ).first()
            if contact:
                session.delete(contact)
                session.commit()

    def get_meta(self, key: str | None = None):
        meta = {
            "tag": "VADDRESSBOOK",
            "D:displayname": "Contacts",
            "CR:addressbook-description": "Personal CRM Contacts",
        }
        meta.update(self._meta)
        if key is None:
            return meta
        return meta.get(key)

    def set_meta(self, props: Mapping[str, str]) -> None:
        self._meta.update(props)


class Storage(BaseStorage):
    """Radicale storage backend using the CRM PostgreSQL database."""

    def __init__(self, configuration):
        super().__init__(configuration)
        self._engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

    @contextlib.contextmanager
    def get_session(self):
        with Session(self._engine) as session:
            yield session

    def discover(
        self,
        path: str,
        depth: str = "0",
        child_context_manager=None,
        user_groups: set[str] = set(),  # noqa: B006 (Radicale parent signature)
    ) -> Iterable[radicale_types.CollectionOrItem]:
        sane_path = path.strip("/")
        parts = sane_path.split("/") if sane_path else []

        if child_context_manager is None:
            child_context_manager = contextlib.contextmanager(lambda p, h: (yield))

        if len(parts) == 0:
            # Root
            yield Collection(self, "", "", tag="")
        elif len(parts) == 1:
            # User principal: e.g., "user@example.com"
            user = parts[0]
            col = Collection(self, sane_path, user)
            yield col
            if depth != "0":
                # Yield the address book
                ab = Collection(self, f"{user}/contacts", user)
                with child_context_manager(f"{user}/contacts", None):
                    yield ab
        elif len(parts) == 2:
            # Address book: e.g., "user@example.com/contacts"
            user = parts[0]
            col = Collection(self, sane_path, user)
            yield col
            if depth != "0":
                # Yield all items
                for item in col.get_all():
                    with child_context_manager(sane_path, item.href):
                        yield item
        elif len(parts) == 3:
            # Single item: e.g., "user@example.com/contacts/uuid.vcf"
            user = parts[0]
            href = parts[2]
            col = Collection(self, f"{parts[0]}/{parts[1]}", user)
            results = list(col.get_multi([href]))
            for _h, item in results:
                if item:
                    yield item

    def move(self, item, to_collection, to_href):
        pass  # Not needed for CardDAV address books

    def create_collection(self, href, items=None, props=None):
        sane_path = href.strip("/")
        parts = sane_path.split("/")
        user = parts[0] if parts else ""
        col = Collection(self, sane_path, user)
        if props:
            col.set_meta(props)
        return (col, {}, [])

    @contextlib.contextmanager
    def acquire_lock(self, mode: str, user: str = "", **kwargs) -> Iterator[None]:
        # PostgreSQL handles concurrency; no explicit locking needed
        yield

    def verify(self) -> bool:
        return True
