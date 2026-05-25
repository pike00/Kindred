"""Kindred personal-CRM Python client + CLI.

The bulk of the SDK is generated from ``frontend/openapi.json`` into
``kindred._generated`` by ``scripts/regen.sh``. This top-level module exposes:

- :class:`KindredClient` — env-driven wrapper around the generated client
- :mod:`kindred.api` — one submodule per service (re-export of ``_generated.api``)
- :mod:`kindred.models` — generated request/response models
- :data:`UnexpectedStatus` — raised on undocumented HTTP responses
- :data:`UNSET` — sentinel for optional parameters
"""

from ._generated import api, models
from ._generated.client import AuthenticatedClient, Client
from ._generated.errors import UnexpectedStatus
from ._generated.types import UNSET, Unset
from .client import KindredClient

__all__ = [
    "AuthenticatedClient",
    "Client",
    "KindredClient",
    "UNSET",
    "Unset",
    "UnexpectedStatus",
    "api",
    "models",
]
