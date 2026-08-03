"""Tests for privacy-preserving email ingestion helpers."""

from app.email_service import build_gmail_contact_query, parse_email_addresses


def test_build_gmail_contact_query_matches_all_contact_addresses() -> None:
    query = build_gmail_contact_query({" Brisa@example.com ", "other@example.com"})

    assert query == "{from:brisa@example.com to:brisa@example.com from:other@example.com to:other@example.com}"
    assert "in:inbox" not in query
    assert "in:sent" not in query


def test_parse_email_addresses_handles_multiple_recipients() -> None:
    assert parse_email_addresses(
        "Brisa <brisa@example.com>, Another <another@example.com>"
    ) == ["brisa@example.com", "another@example.com"]
