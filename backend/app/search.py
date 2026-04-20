"""Meilisearch integration for full-text contact search."""

import logging
import socket
import threading
import time
from typing import Any
from urllib.parse import urlparse

import meilisearch

from app.core.config import settings

logger = logging.getLogger(__name__)

_meili_available: bool = False
_meili_checked_at: float = 0
_meili_lock = threading.Lock()
_CHECK_INTERVAL = 60


def _check_meili_sync() -> bool:
    """Check connectivity (blocking). Called from background thread."""
    try:
        parsed = urlparse(settings.MEILI_URL)
        host = parsed.hostname or "meilisearch"
        port = parsed.port or 7700
        sock = socket.create_connection((host, port), timeout=2)
        sock.close()
        return True
    except (socket.timeout, socket.gaierror, OSError):
        return False


def _refresh_availability() -> None:
    """Background thread target to refresh availability cache."""
    global _meili_available, _meili_checked_at
    result = _check_meili_sync()
    with _meili_lock:
        _meili_available = result
        _meili_checked_at = time.monotonic()


def _is_meili_available() -> bool:
    """Non-blocking availability check. Returns cached result, refreshes in background."""
    global _meili_available, _meili_checked_at
    with _meili_lock:
        now = time.monotonic()
        if (now - _meili_checked_at) >= _CHECK_INTERVAL:
            _meili_checked_at = now  # prevent multiple concurrent checks
            t = threading.Thread(target=_refresh_availability, daemon=True)
            t.start()
        return _meili_available


# Kick off initial check in background
threading.Thread(target=_refresh_availability, daemon=True).start()


def get_meili_client() -> meilisearch.Client:
    """Get a Meilisearch client instance."""
    return meilisearch.Client(settings.MEILI_URL, settings.MEILI_MASTER_KEY, timeout=2)


def index_contact(contact_id: str, data: dict[str, Any]) -> None:
    """Index a contact document in Meilisearch."""
    if not _is_meili_available():
        logger.info(f"Meilisearch unavailable, skipping index for contact {contact_id}")
        return
    client = get_meili_client()
    index = client.index("contacts")
    index.add_documents([{"id": contact_id, **data}])


def remove_contact(contact_id: str) -> None:
    """Remove a contact from the search index."""
    if not _is_meili_available():
        logger.info(f"Meilisearch unavailable, skipping removal for contact {contact_id}")
        return
    client = get_meili_client()
    index = client.index("contacts")
    index.delete_document(contact_id)


def search_contacts(query: str, owner_id: str, limit: int = 20) -> dict[str, Any] | None:
    """Search contacts using full-text search, filtered by owner.

    Returns None if Meilisearch is unavailable (caller should fall back to SQL).
    """
    if not _is_meili_available():
        return None
    try:
        client = get_meili_client()
        index = client.index("contacts")
        return index.search(
            query,
            {
                "limit": limit,
                "filter": f"owner_id = '{owner_id}'",
            },
        )
    except Exception as e:
        logger.warning(f"Meilisearch search failed, falling back to SQL: {e}")
        return None


def setup_index() -> None:
    """Configure the contacts search index with proper settings."""
    client = get_meili_client()
    index = client.index("contacts")

    index.update_searchable_attributes([
        "first_name",
        "last_name",
        "nickname",
        "company",
        "title",
        "how_we_met",
    ])

    index.update_filterable_attributes([
        "owner_id",
        "is_favorite",
        "is_archived",
    ])

    index.update_sortable_attributes([
        "first_name",
        "last_name",
        "created_at",
        "last_contacted_at",
    ])
