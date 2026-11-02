"""Thin ergonomic wrapper around the generated AuthenticatedClient.

The generated client lives at ``kindred._generated`` and exposes one module
per API operation (e.g. ``kindred.api.contacts.get_api_v1_contacts.sync``).
This module provides the env-driven construction and context-manager ergonomics
that the generator output doesn't ship with.
"""

from __future__ import annotations

import os
from typing import Self
from uuid import UUID

from ._generated.client import AuthenticatedClient


def _default_timeout() -> float:
    raw = os.environ.get("KINDRED_TIMEOUT")
    return float(raw) if raw else 15.0


class KindredClient:
    """Connects to a Kindred backend with an API key.

    Usage::

        from kindred import KindredClient
        from kindred.api.contacts import get_api_v1_contacts

        with KindredClient.from_env() as k:
            page = get_api_v1_contacts.sync(client=k.raw, limit=50)

    Construct explicitly with ``KindredClient(base_url=..., api_key=...)`` when
    not relying on environment variables.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float | None = None,
        verify_ssl: bool = True,
        raise_on_unexpected_status: bool = True,
        on_behalf_of: str | UUID | None = None,
    ) -> None:
        """Construct a client.

        ``on_behalf_of`` enables multi-account impersonation: when set, every
        request carries the ``X-On-Behalf-Of: <user_uuid>`` header so the API
        key acts as that user. The user must be whitelisted on the key or the
        backend returns 403. The CLI populates this from ``--on-behalf-of`` /
        the ``KINDRED_ON_BEHALF_OF`` env var (see ``cli.py``).
        """
        if on_behalf_of is None:
            headers: dict[str, str] = {}
        else:
            try:
                impersonated_user_id = UUID(str(on_behalf_of))
            except ValueError as exc:
                raise ValueError("on_behalf_of must be a UUID") from exc
            headers = {"X-On-Behalf-Of": str(impersonated_user_id)}

        self.raw = AuthenticatedClient(
            base_url=base_url.rstrip("/"),
            token=api_key,
            timeout=timeout if timeout is not None else _default_timeout(),
            verify_ssl=verify_ssl,
            raise_on_unexpected_status=raise_on_unexpected_status,
            headers=headers,
        )

    @classmethod
    def from_env(cls, **overrides: object) -> Self:
        """Build a client from ``KINDRED_BASE_URL`` and ``KINDRED_API_KEY``.

        Raises ``KeyError`` if either env var is missing. Any keyword in
        ``overrides`` is passed straight through to ``__init__`` — including
        ``on_behalf_of`` for impersonation. When ``on_behalf_of`` is omitted (or
        passed as ``None``), ``__init__`` falls back to the
        ``KINDRED_ON_BEHALF_OF`` env var.
        """
        try:
            base_url = os.environ["KINDRED_BASE_URL"]
            api_key = os.environ["KINDRED_API_KEY"]
        except KeyError as exc:
            raise KeyError(
                f"Missing required env var: {exc.args[0]}. "
                "Set KINDRED_BASE_URL and KINDRED_API_KEY."
            ) from None
        options = dict(overrides)
        if options.get("on_behalf_of") is None:
            on_behalf_of = os.environ.get("KINDRED_ON_BEHALF_OF")
            if on_behalf_of:
                options["on_behalf_of"] = on_behalf_of
        return cls(base_url=base_url, api_key=api_key, **options)  # type: ignore[arg-type]

    def close(self) -> None:
        self.raw.get_httpx_client().close()

    def __enter__(self) -> Self:
        self.raw.__enter__()
        return self

    def __exit__(self, *exc: object) -> None:
        self.raw.__exit__(*exc)
