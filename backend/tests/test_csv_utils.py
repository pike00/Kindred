"""Tests for CSV import/export utilities."""

import csv
import io
from datetime import date

import pytest
from sqlmodel import Session

from app.csv_utils import (
    detect_column_mapping,
    export_contacts_to_csv,
    parse_date_flexible,
)
from app.models import Contact, Tag, User


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (
            "1815-12-10",
            date(1815, 12, 10),
        ),  # %Y-%m-%d (the format vCard/CSV exports use)
        ("12/10/1815", date(1815, 12, 10)),  # %m/%d/%Y
        ("18151210", date(1815, 12, 10)),  # %Y%m%d
        ("Dec 10, 1815", date(1815, 12, 10)),  # %b %d, %Y
        ("December 10, 1815", date(1815, 12, 10)),  # %B %d, %Y
        ("10 Dec 1815", date(1815, 12, 10)),  # %d %b %Y
    ],
)
def test_parse_date_flexible_supported_formats(raw: str, expected: date) -> None:
    """Every advertised format parses to a date.

    Regression: parse_date_flexible previously called date.strptime, which does
    not exist, so every row carrying a birthday raised AttributeError and the
    whole CSV import returned imported=0.
    """
    assert parse_date_flexible(raw) == expected


def test_parse_date_flexible_returns_none_on_junk() -> None:
    assert parse_date_flexible("") is None
    assert parse_date_flexible("not a date") is None


def test_detect_column_mapping_common_aliases() -> None:
    """A typical export header row auto-maps to canonical fields."""
    headers = ["first_name", "last_name", "email", "state", "tags", "birthday"]
    mapping = detect_column_mapping(headers)
    assert mapping["first_name"] == "first_name"
    assert mapping["last_name"] == "last_name"
    assert mapping["email"] == "email"
    assert mapping["state"] == "region"
    assert mapping["tags"] == "tag_names"
    assert mapping["birthday"] == "birthday"


def test_csv_export_escapes_spreadsheet_formulas(
    db: Session,
    user: User,
) -> None:
    contact = Contact(
        first_name='=HYPERLINK("https://example.com")',
        last_name="+SUM(1,1)",
        company="-2+3",
        how_we_met="@SUM(1,1)",
        owner_id=user.id,
    )
    contact.tags.append(Tag(name="=private-tag", owner_id=user.id))
    db.add(contact)
    db.commit()

    _, csv_bytes = export_contacts_to_csv(
        session=db,
        owner_id=str(user.id),
        include_fields=False,
        include_tags=True,
    )
    rows = list(
        csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig"))),
    )

    assert rows[0]["first_name"].startswith("'=")
    assert rows[0]["last_name"].startswith("'+")
    assert rows[0]["company"].startswith("'-")
    assert rows[0]["how_we_met"].startswith("'@")
    assert rows[0]["tag_names"].startswith("'=")
