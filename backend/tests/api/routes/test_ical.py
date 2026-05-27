"""Tests for iCal importer endpoints (upload + confirm)."""

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Contact, IcalImportLog


def _create_contact(
    db: Session,
    owner_id: uuid.UUID,
    first_name: str,
    last_name: str | None = None,
    email: str | None = None,
) -> Contact:
    """Helper to create a contact with optional email field."""
    from app.models import ContactField, ContactFieldType

    contact = Contact(first_name=first_name, last_name=last_name, owner_id=owner_id)
    db.add(contact)
    db.commit()
    db.refresh(contact)

    if email:
        field = ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.EMAIL,
            label="home",
            value=email,
            is_primary=True,
        )
        db.add(field)
        db.commit()

    return contact


def _make_ics_content(events: list[dict]) -> bytes:
    """Generate a minimal .ics file content from event dicts."""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Test//EN",
    ]
    for ev in events:
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{ev.get('uid', 'test-uid-123')}")
        lines.append(f"SUMMARY:{ev.get('summary', 'Test Event')}")
        if ev.get("description"):
            lines.append(f"DESCRIPTION:{ev['description']}")
        dtstart = ev.get("dtstart", "20240101T100000Z")
        lines.append(f"DTSTART:{dtstart}")
        if ev.get("attendees"):
            for att in ev["attendees"]:
                att_line = f"ATTENDEE;CN={att.get('cn', '')}"
                if att.get("email"):
                    att_line += f";EMAIL={att['email']}"
                att_line += f":mailto:{att.get('email', 'unknown@example.com')}"
                lines.append(att_line)
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines).encode()


class TestUploadIcal:
    """Tests for POST /api/v1/ical/upload."""

    def test_upload_valid_ics(
        self, client: TestClient, db: Session, user_headers: dict, user: Contact
    ):
        """Upload a valid .ics file and get proposals."""
        events = [
            {
                "uid": "meeting-1@example.com",
                "summary": "Team Meeting",
                "dtstart": "20240115T100000Z",
                "attendees": [
                    {"cn": "John Doe", "email": "john@example.com"},
                ],
            }
        ]
        content = _make_ics_content(events)

        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", content, "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["proposals"]) == 1
        assert data["proposals"][0]["summary"] == "Team Meeting"
        assert data["skipped_future"] == 0

    def test_upload_future_events_skipped(self, client: TestClient, user_headers: dict):
        """Future events should be skipped."""
        events = [
            {
                "uid": "future-1",
                "summary": "Future Meeting",
                "dtstart": "20990101T100000Z",
            }
        ]
        content = _make_ics_content(events)

        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", content, "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["proposals"]) == 0
        assert data["skipped_future"] == 1

    def test_upload_with_contact_matching(
        self, client: TestClient, db: Session, user_headers: dict, user: Contact
    ):
        """Attendees should be matched to existing contacts."""
        # Create a contact with matching email
        contact = _create_contact(db, user.id, "John", "Doe", "john@example.com")

        events = [
            {
                "uid": "meeting-2",
                "summary": "1:1 with John",
                "dtstart": "20240115T100000Z",
                "attendees": [
                    {"cn": "John Doe", "email": "john@example.com"},
                ],
            }
        ]
        content = _make_ics_content(events)

        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", content, "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["proposals"]) == 1
        prop = data["proposals"][0]
        assert len(prop["attendees"]) == 1
        assert len(prop["attendees"][0]["matches"]) >= 1
        assert prop["attendees"][0]["matches"][0]["contact_id"] == str(contact.id)

    def test_upload_invalid_file(self, client: TestClient, user_headers: dict):
        """Non-.ics files should be rejected."""
        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.txt", b"not ical", "text/plain")},
            headers=user_headers,
        )

        assert response.status_code == 422

    def test_upload_malformed_ics(self, client: TestClient, user_headers: dict):
        """Malformed .ics files should return 422."""
        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", b"NOT AN ICS FILE", "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 422

    def test_upload_classifies_meeting(self, client: TestClient, user_headers: dict):
        """Events with meeting keywords should be classified as interactions."""
        events = [
            {
                "uid": "meeting-3",
                "summary": "Weekly Sync Call",
                "dtstart": "20240115T100000Z",
            }
        ]
        content = _make_ics_content(events)

        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", content, "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        prop = data["proposals"][0]
        assert prop["classification"] == "interaction"
        assert prop["event_type"] == "meeting"

    def test_upload_classifies_birthday(self, client: TestClient, user_headers: dict):
        """Events with birthday keywords should be classified as life events."""
        events = [
            {
                "uid": "bday-1",
                "summary": "John's Birthday",
                "dtstart": "20240115T100000Z",
            }
        ]
        content = _make_ics_content(events)

        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", content, "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        prop = data["proposals"][0]
        assert prop["classification"] == "life_event"

    def test_upload_detects_already_imported(
        self, client: TestClient, db: Session, user_headers: dict, user: Contact
    ):
        """Events with UIDs already in IcalImportLog should be marked as already_imported."""
        # Pre-populate the import log
        log = IcalImportLog(
            owner_id=user.id,
            uid="already-imported-uid",
            event_type="interaction",
        )
        db.add(log)
        db.commit()

        events = [
            {
                "uid": "already-imported-uid",
                "summary": "Old Meeting",
                "dtstart": "20240115T100000Z",
            }
        ]
        content = _make_ics_content(events)

        response = client.post(
            "/api/v1/ical/upload",
            files={"file": ("test.ics", content, "text/calendar")},
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["proposals"]) == 1
        assert data["proposals"][0]["already_imported"] is True


class TestConfirmIcalImport:
    """Tests for POST /api/v1/ical/confirm."""

    def test_confirm_interaction(
        self, client: TestClient, db: Session, user_headers: dict, user: Contact
    ):
        """Confirm an interaction proposal."""
        contact = _create_contact(db, user.id, "Jane", "Doe", "jane@example.com")

        proposal = {
            "uid": "confirm-test-1",
            "summary": "Team Meeting",
            "description": "Weekly sync",
            "occurred_at": "2024-01-15T10:00:00+00:00",
            "attendees": [
                {
                    "attendee": {
                        "email": "jane@example.com",
                        "cn": "Jane Doe",
                        "role": None,
                    },
                    "matches": [
                        {
                            "contact_id": str(contact.id),
                            "contact_name": "Jane Doe",
                            "confidence": 100.0,
                            "match_method": "email_exact",
                        }
                    ],
                }
            ],
            "classification": "interaction",
            "event_type": "meeting",
            "channel": "video",
            "skipped": False,
            "already_imported": False,
        }

        response = client.post(
            "/api/v1/ical/confirm",
            json=[proposal],
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_interactions"] == 1
        assert data["created_life_events"] == 0

        # Verify the import was logged
        log = db.exec(
            select(IcalImportLog).where(IcalImportLog.uid == "confirm-test-1")
        ).first()
        assert log is not None
        assert log.owner_id == user.id

    def test_confirm_life_event(
        self, client: TestClient, db: Session, user_headers: dict, user: Contact
    ):
        """Confirm a life event proposal."""
        contact = _create_contact(db, user.id, "Bob", "Smith")

        proposal = {
            "uid": "confirm-test-2",
            "summary": "Bob's Birthday",
            "description": None,
            "occurred_at": "2024-01-15T10:00:00+00:00",
            "attendees": [
                {
                    "attendee": {"email": None, "cn": "Bob Smith", "role": None},
                    "matches": [
                        {
                            "contact_id": str(contact.id),
                            "contact_name": "Bob Smith",
                            "confidence": 100.0,
                            "match_method": "name_fuzzy",
                        }
                    ],
                }
            ],
            "classification": "life_event",
            "event_type": "birthday",
            "channel": None,
            "skipped": False,
            "already_imported": False,
        }

        response = client.post(
            "/api/v1/ical/confirm",
            json=[proposal],
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["created_life_events"] == 1
        assert data["created_interactions"] == 0

    def test_confirm_skips_duplicates(
        self, client: TestClient, db: Session, user_headers: dict, user: Contact
    ):
        """Confirm should skip proposals with already-imported UIDs."""
        contact = _create_contact(db, user.id, "Alice", "Wonder")

        # First confirmation
        proposal = {
            "uid": "dup-test-1",
            "summary": "Meeting 1",
            "occurred_at": "2024-01-15T10:00:00+00:00",
            "attendees": [
                {
                    "attendee": {"email": None, "cn": "Alice Wonder", "role": None},
                    "matches": [
                        {
                            "contact_id": str(contact.id),
                            "contact_name": "Alice Wonder",
                            "confidence": 100.0,
                            "match_method": "name_fuzzy",
                        }
                    ],
                }
            ],
            "classification": "interaction",
            "event_type": "meeting",
            "channel": "call",
            "skipped": False,
            "already_imported": False,
        }

        response1 = client.post(
            "/api/v1/ical/confirm",
            json=[proposal],
            headers=user_headers,
        )
        assert response1.status_code == 200
        assert response1.json()["created_interactions"] == 1

        # Second confirmation with same UID should skip
        response2 = client.post(
            "/api/v1/ical/confirm",
            json=[proposal],
            headers=user_headers,
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["skipped_duplicates"] == 1
        assert data2["created_interactions"] == 0

    def test_confirm_no_contacts_matched(self, client: TestClient, user_headers: dict):
        """Proposals with no matched contacts should return an error."""
        proposal = {
            "uid": "no-match-1",
            "summary": "Unknown Meeting",
            "occurred_at": "2024-01-15T10:00:00+00:00",
            "attendees": [
                {
                    "attendee": {
                        "email": "unknown@example.com",
                        "cn": "Unknown Person",
                        "role": None,
                    },
                    "matches": [],
                }
            ],
            "classification": "interaction",
            "event_type": "meeting",
            "channel": "other",
            "skipped": False,
            "already_imported": False,
        }

        response = client.post(
            "/api/v1/ical/confirm",
            json=[proposal],
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["errors"]) > 0
        assert "No contacts matched" in data["errors"][0]

    def test_confirm_missing_occurred_at(self, client: TestClient, user_headers: dict):
        """Proposals with missing occurred_at should return an error."""
        proposal = {
            "uid": "no-date-1",
            "summary": "Meeting without date",
            "occurred_at": None,
            "attendees": [],
            "classification": "interaction",
            "event_type": "meeting",
            "channel": "other",
            "skipped": False,
            "already_imported": False,
        }

        response = client.post(
            "/api/v1/ical/confirm",
            json=[proposal],
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["errors"]) > 0
        assert "Missing occurred_at" in data["errors"][0]
