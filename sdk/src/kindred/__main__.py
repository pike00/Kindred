"""CLI entry point: python -m kindred  or  kindred (via console_scripts)."""

from __future__ import annotations

import json
import os
import sys
import uuid

from .client import KindredClient
from .exceptions import KindredAPIError, KindredAuthError, KindredNotFoundError
from .models import ContactCreate, ContactUpdate, NoteCreate, NoteUpdate, RelationshipCreate, RelationshipUpdate

_URL = os.environ.get("KINDRED_URL", "https://kindred.example.com")
_KEY = os.environ.get("KINDRED_API_KEY") or os.environ.get("CRM_API_KEY", "")

USAGE = """\
Usage: kindred <resource> <subcommand> [args...]

Resources / subcommands:
  contacts list [--search QUERY] [--stage STAGE]
  contacts get <uuid>
  contacts find-external <external_id>
  contacts losing-touch
  contacts create '<json>'
  contacts update <uuid> '<json>'

  notes list <contact_uuid>
  notes create <contact_uuid> <body>
  notes update <note_uuid> <body>

  relationships list <contact_uuid>
  relationships create '<json>'
  relationships update <rel_uuid> '<json>'
  relationships delete <rel_uuid>

  groups list

  auth check

Environment:
  KINDRED_URL      Base URL (default: https://kindred.example.com)
  KINDRED_API_KEY  API key
"""


def _die(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)


def _dump(obj: object) -> None:
    if isinstance(obj, list):
        print(json.dumps([o.model_dump(mode="json") if hasattr(o, "model_dump") else o for o in obj], indent=2))
    elif hasattr(obj, "model_dump"):
        print(json.dumps(obj.model_dump(mode="json"), indent=2))
    else:
        print(json.dumps(obj, indent=2))


def _client() -> KindredClient:
    if not _KEY:
        _die("KINDRED_API_KEY is not set")
    return KindredClient(base_url=_URL, api_key=_KEY, retry=2)


def _cmd_contacts(args: list[str]) -> None:
    if not args:
        _die("contacts: missing subcommand")
    sub, rest = args[0], args[1:]
    c = _client()

    if sub == "list":
        search = None
        stage = None
        i = 0
        while i < len(rest):
            if rest[i] == "--search" and i + 1 < len(rest):
                search = rest[i + 1]
                i += 2
            elif rest[i] == "--stage" and i + 1 < len(rest):
                stage = rest[i + 1]
                i += 2
            else:
                i += 1
        _dump(c.contacts.list(search=search, stage=stage))

    elif sub == "get":
        if not rest:
            _die("contacts get <uuid>")
        _dump(c.contacts.get(uuid.UUID(rest[0])))

    elif sub == "find-external":
        if not rest:
            _die("contacts find-external <external_id>")
        result = c.contacts.find_by_external_id(rest[0])
        _dump(result.model_dump(mode="json") if result else None)

    elif sub == "losing-touch":
        _dump(c.contacts.losing_touch())

    elif sub == "create":
        if not rest:
            _die("contacts create '<json>'")
        _dump(c.contacts.create(ContactCreate(**json.loads(rest[0]))))

    elif sub == "update":
        if len(rest) < 2:
            _die("contacts update <uuid> '<json>'")
        _dump(c.contacts.update(uuid.UUID(rest[0]), ContactUpdate(**json.loads(rest[1]))))

    else:
        _die(f"contacts: unknown subcommand: {sub}")


def _cmd_notes(args: list[str]) -> None:
    if not args:
        _die("notes: missing subcommand")
    sub, rest = args[0], args[1:]
    c = _client()

    if sub == "list":
        if not rest:
            _die("notes list <contact_uuid>")
        _dump(c.notes.list_for_contact(uuid.UUID(rest[0])))

    elif sub == "create":
        if len(rest) < 2:
            _die("notes create <contact_uuid> <body>")
        _dump(c.notes.create(NoteCreate(contact_id=uuid.UUID(rest[0]), body=rest[1])))

    elif sub == "update":
        if len(rest) < 2:
            _die("notes update <note_uuid> <body>")
        _dump(c.notes.update(uuid.UUID(rest[0]), NoteUpdate(body=rest[1])))

    else:
        _die(f"notes: unknown subcommand: {sub}")


def _cmd_relationships(args: list[str]) -> None:
    if not args:
        _die("relationships: missing subcommand")
    sub, rest = args[0], args[1:]
    c = _client()

    if sub == "list":
        if not rest:
            _die("relationships list <contact_uuid>")
        _dump(c.relationships.list_for_contact(uuid.UUID(rest[0])))

    elif sub == "create":
        if not rest:
            _die("relationships create '<json>'")
        _dump(c.relationships.create(RelationshipCreate(**json.loads(rest[0]))))

    elif sub == "update":
        if len(rest) < 2:
            _die("relationships update <rel_uuid> '<json>'")
        _dump(c.relationships.update(uuid.UUID(rest[0]), RelationshipUpdate(**json.loads(rest[1]))))

    elif sub == "delete":
        if not rest:
            _die("relationships delete <rel_uuid>")
        c.relationships.delete(uuid.UUID(rest[0]))

    else:
        _die(f"relationships: unknown subcommand: {sub}")


def _cmd_groups(args: list[str]) -> None:
    if not args:
        _die("groups: missing subcommand")
    sub = args[0]
    c = _client()
    if sub == "list":
        _dump(c.groups.list())
    else:
        _die(f"groups: unknown subcommand: {sub}")


def _cmd_auth(args: list[str]) -> None:
    sub = args[0] if args else "check"
    if sub != "check":
        _die(f"auth: unknown subcommand: {sub}")
    c = _client()
    # A successful contacts list (even empty) confirms auth
    c.contacts.list(stage="__auth_probe_nonexistent__")
    print(json.dumps({"ok": True, "url": _URL}))


def main() -> None:
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(USAGE)
        sys.exit(0)

    resource, rest = argv[0], argv[1:]
    try:
        if resource == "contacts":
            _cmd_contacts(rest)
        elif resource == "notes":
            _cmd_notes(rest)
        elif resource == "relationships":
            _cmd_relationships(rest)
        elif resource == "groups":
            _cmd_groups(rest)
        elif resource == "auth":
            _cmd_auth(rest)
        else:
            _die(f"Unknown resource: {resource}\n\n{USAGE}")
    except KindredAuthError as e:
        _die(f"auth error: {e}")
    except KindredNotFoundError as e:
        _die(f"not found: {e}")
    except KindredAPIError as e:
        _die(f"API error {e.status_code}: {e}")
    except Exception as e:
        _die(f"error: {e}")


if __name__ == "__main__":
    main()
