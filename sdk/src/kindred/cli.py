"""Kindred CLI — invoke from justfile recipes or directly.

Set ``KINDRED_BASE_URL`` and ``KINDRED_API_KEY`` in the environment, then::

    kindred contacts list --search Alice
    kindred contacts losing-touch
    kindred reminders due
    kindred notes for-contact <uuid>
    kindred health

All output is newline-delimited JSON (one record per line) by default, so it
pipes cleanly into ``jq``. Use ``--pretty`` for indented JSON.
"""

from __future__ import annotations

import json
import sys
from typing import Annotated, Any
from uuid import UUID

import typer

from .client import KindredClient
from ._generated.api.contacts import (
    contacts_get_contact,
    contacts_get_contact_household,
    contacts_list_contacts,
    contacts_list_losing_touch,
    contacts_list_overdue_contacts,
    contacts_skip_contact,
)
from ._generated.api.interactions import interactions_list_interactions
from ._generated.api.journal import journal_list_journal_entries
from ._generated.api.notes import notes_list_notes
from ._generated.api.reminders import (
    reminders_dismiss_reminder,
    reminders_list_due_reminders,
    reminders_list_reminders,
)
from ._generated.api.tags import tags_list_tags
from ._generated.api.users import users_read_user_me
from ._generated.api.utils import utils_health_check
from ._generated.errors import UnexpectedStatus
from ._generated.types import UNSET

app = typer.Typer(
    no_args_is_help=True,
    add_completion=False,
    help="Kindred personal-CRM CLI.",
)
contacts_app = typer.Typer(no_args_is_help=True, help="Contact operations.")
reminders_app = typer.Typer(no_args_is_help=True, help="Reminder operations.")
notes_app = typer.Typer(no_args_is_help=True, help="Note operations.")
tags_app = typer.Typer(no_args_is_help=True, help="Tag operations.")
interactions_app = typer.Typer(no_args_is_help=True, help="Interaction operations.")
journal_app = typer.Typer(no_args_is_help=True, help="Journal operations.")

app.add_typer(contacts_app, name="contacts")
app.add_typer(reminders_app, name="reminders")
app.add_typer(notes_app, name="notes")
app.add_typer(tags_app, name="tags")
app.add_typer(interactions_app, name="interactions")
app.add_typer(journal_app, name="journal")


PrettyOpt = Annotated[bool, typer.Option("--pretty", help="Indent JSON output.")]


def _emit(value: Any, pretty: bool) -> None:
    """Print a model / list-of-models / dict as JSON.

    Generated attrs models expose ``to_dict()``; wrappers like ``ContactsPublic``
    nest the records under a ``data`` key with ``count``.
    """
    if value is None:
        typer.secho("(no response)", err=True, fg=typer.colors.YELLOW)
        return

    if hasattr(value, "to_dict"):
        value = value.to_dict()

    indent = 2 if pretty else None
    if pretty or not isinstance(value, dict) or "data" not in value:
        typer.echo(json.dumps(value, indent=indent, default=str))
        return

    # ndjson for paginated envelopes: one record per line
    for row in value.get("data", []):
        typer.echo(json.dumps(row, default=str))


def _run(fn: Any, **kwargs: Any) -> Any:
    with KindredClient.from_env() as k:
        try:
            return fn.sync(client=k.raw, **kwargs)
        except UnexpectedStatus as exc:
            typer.secho(
                f"API error {exc.status_code}: {exc.content.decode(errors='ignore')}",
                err=True,
                fg=typer.colors.RED,
            )
            raise typer.Exit(code=1) from None


# ── contacts ────────────────────────────────────────────────────────────────


@contacts_app.command("list")
def contacts_list(
    pretty: PrettyOpt = False,
    search: Annotated[str | None, typer.Option(help="Server-side full-text search.")] = None,
    tag_id: Annotated[UUID | None, typer.Option(help="Filter by tag UUID.")] = None,
    stage: Annotated[str | None, typer.Option(help="Filter by relationship stage.")] = None,
    is_favorite: Annotated[bool | None, typer.Option(help="Favorites only.")] = None,
    is_archived: Annotated[bool | None, typer.Option(help="Archived only.")] = None,
    limit: Annotated[int, typer.Option(help="Max records per page.")] = 100,
    skip: Annotated[int, typer.Option(help="Offset for pagination.")] = 0,
) -> None:
    """List contacts (paginated)."""
    result = _run(
        contacts_list_contacts,
        skip=skip,
        limit=limit,
        search=search if search is not None else UNSET,
        tag_id=tag_id if tag_id is not None else UNSET,
        stage=stage if stage is not None else UNSET,
        is_favorite=is_favorite if is_favorite is not None else UNSET,
        is_archived=is_archived if is_archived is not None else UNSET,
    )
    _emit(result, pretty)


@contacts_app.command("get")
def contacts_get(contact_id: UUID, pretty: PrettyOpt = False) -> None:
    """Fetch one contact by UUID."""
    _emit(_run(contacts_get_contact, contact_id=contact_id), pretty)


@contacts_app.command("losing-touch")
def contacts_losing_touch(
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """Contacts whose cadence has elapsed since last_contacted_at."""
    _emit(
        _run(contacts_list_losing_touch, skip=skip, limit=limit),
        pretty,
    )


@contacts_app.command("overdue")
def contacts_overdue(
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """Contacts past their next-contact threshold."""
    _emit(
        _run(contacts_list_overdue_contacts, skip=skip, limit=limit),
        pretty,
    )


@contacts_app.command("household")
def contacts_household(contact_id: UUID, pretty: PrettyOpt = False) -> None:
    """Fetch a contact's household membership."""
    _emit(
        _run(contacts_get_contact_household, contact_id=contact_id),
        pretty,
    )


@contacts_app.command("skip")
def contacts_skip(contact_id: UUID, pretty: PrettyOpt = False) -> None:
    """Mark a losing-touch contact as skipped this cycle."""
    _emit(_run(contacts_skip_contact, contact_id=contact_id), pretty)


# ── reminders ───────────────────────────────────────────────────────────────


@reminders_app.command("list")
def reminders_list(
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """List all reminders."""
    _emit(_run(reminders_list_reminders, skip=skip, limit=limit), pretty)


@reminders_app.command("due")
def reminders_due(
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
) -> None:
    """List reminders due now or earlier."""
    _emit(_run(reminders_list_due_reminders, limit=limit), pretty)


@reminders_app.command("dismiss")
def reminders_dismiss(reminder_id: UUID, pretty: PrettyOpt = False) -> None:
    """Dismiss a reminder."""
    _emit(_run(reminders_dismiss_reminder, reminder_id=reminder_id), pretty)


# ── notes ───────────────────────────────────────────────────────────────────


@notes_app.command("list")
def notes_list(
    contact_id: Annotated[
        UUID | None,
        typer.Option(help="Filter notes to one contact."),
    ] = None,
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """List notes; optionally scope to one contact."""
    _emit(
        _run(
            notes_list_notes,
            contact_id=contact_id if contact_id is not None else UNSET,
            skip=skip,
            limit=limit,
        ),
        pretty,
    )


# ── tags ────────────────────────────────────────────────────────────────────


@tags_app.command("list")
def tags_list(
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """List all tags."""
    _emit(_run(tags_list_tags, skip=skip, limit=limit), pretty)


# ── interactions ────────────────────────────────────────────────────────────


@interactions_app.command("list")
def interactions_list(
    contact_id: Annotated[UUID | None, typer.Option()] = None,
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """List interactions; optionally scope to one contact."""
    _emit(
        _run(
            interactions_list_interactions,
            contact_id=contact_id if contact_id is not None else UNSET,
            skip=skip,
            limit=limit,
        ),
        pretty,
    )


# ── journal ─────────────────────────────────────────────────────────────────


@journal_app.command("list")
def journal_list(
    pretty: PrettyOpt = False,
    limit: Annotated[int, typer.Option()] = 100,
    skip: Annotated[int, typer.Option()] = 0,
) -> None:
    """List journal entries."""
    _emit(_run(journal_list_journal_entries, skip=skip, limit=limit), pretty)


# ── top-level utilities ─────────────────────────────────────────────────────


@app.command()
def health(pretty: PrettyOpt = False) -> None:
    """Hit the unauthenticated /api/v1/utils/health-check endpoint."""
    _emit(_run(utils_health_check), pretty)


@app.command()
def whoami(pretty: PrettyOpt = False) -> None:
    """Return the user behind the current API key (/api/v1/users/me)."""
    _emit(_run(users_read_user_me), pretty)


@app.command()
def env() -> None:
    """Print the resolved base URL and a redacted key prefix."""
    import os

    base = os.environ.get("KINDRED_BASE_URL", "(unset)")
    key = os.environ.get("KINDRED_API_KEY", "")
    redacted = (key[:8] + "…") if key else "(unset)"
    typer.echo(json.dumps({"base_url": base, "api_key": redacted}))


def main() -> None:
    """Console-script entry point."""
    try:
        app()
    except KeyError as exc:
        typer.secho(str(exc), err=True, fg=typer.colors.RED)
        sys.exit(2)


if __name__ == "__main__":
    main()
