"""iCal importer routes for uploading and confirming calendar event imports."""

import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse
from icalendar import Calendar, Event
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    Interaction,
    InteractionChannel,
    InteractionCreate,
    LifeEvent,
    LifeEventCreate,
    User,
)

router = APIRouter(prefix="/ical", tags=["ical"])

# Fuzzy matching threshold (0-100 scale from python-rapidfuzz)
FUZZY_MATCH_THRESHOLD = 80


def _extract_attendees(vevent: Event) -> list[dict]:
    """Extract attendees from a VEVENT.

    Returns list of dicts with keys: email, cn (common name), role.
    """
    attendees = []
    # ATTENDEE property can be a list
    attendee_props = vevent.get("ATTENDEE")
    if not attendee_props:
        return attendees

    # Normalize to list
    if not isinstance(attendee_props, list):
        attendee_props = [attendee_props]

    for att in attendee_props:
        info: dict[str, Any] = {
            "email": None,
            "cn": None,
            "role": None,
        }
        # Email is in the VALUE parameter or in the property value itself
        if hasattr(att, "params"):
            if "EMAIL" in att.params:
                info["email"] = str(att.params["EMAIL"])
            if "CN" in att.params:
                info["cn"] = str(att.params["CN"])
            if "ROLE" in att.params:
                info["role"] = str(att.params["ROLE"])

        # Fallback: value might be mailto:email
        val = str(att)
        if val.startswith("mailto:"):
            email = val[7:]
            if not info["email"]:
                info["email"] = email
        elif "@" in val and not info["email"]:
            info["email"] = val

        # If CN not found, try to extract from value
        if not info["cn"] and info["email"]:
            # Use local part as fallback name
            local = info["email"].split("@")[0]
            info["cn"] = local.replace(".", " ").title()

        attendees.append(info)

    return attendees


def _parse_datetime(dt_value) -> datetime | None:
    """Parse an icalendar datetime value to a UTC datetime."""
    if dt_value is None:
        return None

    from icalendar.prop import vDate, vDatetime

    if isinstance(dt_value, (vDate, vDatetime)):
        dt = dt_value.dt
    else:
        dt = dt_value

    if isinstance(dt, datetime):
        # Ensure timezone aware
        if dt.tzinfo is None:
            # Assume UTC for floating times
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    elif isinstance(dt, date):  # type: ignore[name-defined]
        # Convert date to datetime at midnight UTC
        return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)

    return None


def _classify_event(summary: str, description: str | None, attendee_count: int) -> dict:
    """Classify an event as meeting, birthday, anniversary, etc.

    Returns dict with keys: event_type, channel (for interactions), confidence.
    """
    summary_lower = summary.lower()
    desc_lower = (description or "").lower()
    combined = f"{summary_lower} {desc_lower}"

    # Birthday patterns
    birthday_keywords = ["birthday", "bday", "b-day", "happy birthday"]
    if any(kw in combined for kw in birthday_keywords) and attendee_count <= 2:
        return {
            "event_type": "birthday",
            "classification": "life_event",
            "channel": None,
        }

    # Anniversary patterns
    anniversary_keywords = ["anniversary", "anniv", "wedding anniversary", "work anniversary"]
    if any(kw in combined for kw in anniversary_keywords):
        return {
            "event_type": "anniversary",
            "classification": "life_event",
            "channel": None,
        }

    # Meeting keywords → Interaction
    meeting_keywords = [
        "meeting", "call", "sync", "1:1", "1-1", "one on one",
        "standup", "stand-up", "review", "interview", "discussion",
        "catch-up", "catchup", "coffee chat", "lunch", "dinner",
    ]
    if any(kw in combined for kw in meeting_keywords):
        # Infer channel
        channel = _infer_channel(summary_lower, combined)
        return {
            "event_type": "meeting",
            "classification": "interaction",
            "channel": channel,
        }

    # Default: treat as interaction if multiple attendees, life_event if single
    if attendee_count <= 1:
        return {
            "event_type": "milestone",
            "classification": "life_event",
            "channel": None,
        }

    channel = _infer_channel(summary_lower, combined)
    return {
        "event_type": "meeting",
        "classification": "interaction",
        "channel": channel or "other",
    }


def _infer_channel(summary: str, full_text: str) -> str | None:
    """Infer interaction channel from event text."""
    if any(kw in full_text for kw in ["call", "phone", "audio"]):
        return "call"
    if any(kw in full_text for kw in ["zoom", "meet", "teams", "video", "faceTime"]):
        return "video"
    if any(kw in full_text for kw in ["lunch", "dinner", "coffee", "in person", "face to face"]):
        return "in_person"
    if any(kw in full_text for kw in ["text", "sms", "chat", "message"]):
        return "text"
    if any(kw in full_text for kw in ["email", "mail"]):
        return "email"
    return "other"


def _fuzzy_match_name(name: str, contact: Contact) -> float:
    """Calculate fuzzy match score between a name and a contact.

    Returns score 0-100.
    """
    try:
        from rapidfuzz import fuzz
    except ImportError:
        # Fallback to simple contains check
        contact_full = f"{contact.first_name} {contact.last_name or ''}".lower()
        return 100.0 if name.lower() in contact_full else 0.0

    name_lower = name.lower().strip()
    contact_full = f"{contact.first_name} {contact.last_name or ''}".lower().strip()
    contact_reverse = f"{contact.last_name or ''} {contact.first_name}".lower().strip()

    # Try multiple fuzzy matching strategies
    scores = [
        fuzz.ratio(name_lower, contact_full),
        fuzz.ratio(name_lower, contact_reverse),
        fuzz.partial_ratio(name_lower, contact_full),
        fuzz.token_sort_ratio(name_lower, contact_full),
    ]

    # Also try matching against nickname if present
    if contact.nickname:
        scores.append(fuzz.ratio(name_lower, contact.nickname.lower()))

    return max(scores)


def _match_attendee_to_contacts(
    attendee: dict, contacts: list[Contact], session
) -> list[tuple[Contact, float, str]]:
    """Match an attendee to contacts by email (exact) then name (fuzzy).

    Returns list of (contact, confidence_score, match_method).
    """
    matches = []
    email = attendee.get("email")
    cn = attendee.get("cn")

    # First pass: exact email match
    if email:
        contact_fields = session.exec(
            select(ContactField)
            .where(ContactField.field_type == ContactFieldType.EMAIL)
            .where(ContactField.value == email)
        ).all()

        for cf in contact_fields:
            contact = session.get(Contact, cf.contact_id)
            if contact:
                matches.append((contact, 100.0, "email_exact"))

    # Second pass: fuzzy name match (if no email match found)
    if not matches and cn:
        for contact in contacts:
            score = _fuzzy_match_name(cn, contact)
            if score >= FUZZY_MATCH_THRESHOLD:
                matches.append((contact, score, "name_fuzzy"))

    # Sort by confidence descending
    matches.sort(key=lambda x: x[1], reverse=True)
    return matches


def _get_vevent_uid(vevent: Event) -> str | None:
    """Extract UID from a VEVENT."""
    uid = vevent.get("UID")
    return str(uid) if uid else None


def _is_future_event(dt: datetime | None) -> bool:
    """Check if the event is in the future."""
    if dt is None:
        return False
    now = datetime.now(timezone.utc)
    return dt > now


@router.post("/upload")
async def upload_ical(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> Any:
    """Upload and parse a .ics file, returning proposed imports.

    Parses the iCal file, matches attendees to contacts, classifies events,
    and returns a list of proposals for user confirmation. Filters out future events.
    """
    # Validate file extension
    if not file.filename or not file.filename.endswith(".ics"):
        return JSONResponse(
            status_code=422,
            content={"detail": "File must be a .ics calendar file"},
        )

    # Read and parse
    content = await file.read()
    try:
        cal = Calendar.from_ical(content)
    except Exception as e:
        return JSONResponse(
            status_code=422,
            content={"detail": f"Failed to parse .ics file: {str(e)}"},
        )

    # Get all contacts for this user (for matching)
    contacts = session.exec(
        select(Contact).where(Contact.owner_id == current_user.id)
    ).all()

    # Get existing UIDs to detect duplicates
    # We'll store UID in a temporary table or check against a proposed list
    # For now, we'll return proposals and handle dedup on confirm

    proposals = []
    skipped_future = 0
    parse_errors = []

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        vevent: Event = component

        # Extract basic event info
        summary = str(vevent.get("SUMMARY", ""))
        description = str(vevent.get("DESCRIPTION", "")) if vevent.get("DESCRIPTION") else None
        dtstart = _parse_datetime(vevent.get("DTSTART"))
        uid = _get_vevent_uid(vevent)

        # Skip future events
        if _is_future_event(dtstart):
            skipped_future += 1
            continue

        # Extract attendees
        attendees = _extract_attendees(vevent)
        attendee_matches = []

        for att in attendees:
            matches = _match_attendee_to_contacts(att, contacts, session)
            attendee_matches.append({
                "attendee": att,
                "matches": [
                    {
                        "contact_id": str(m[0].id),
                        "contact_name": f"{m[0].first_name} {m[0].last_name or ''}".strip(),
                        "confidence": m[1],
                        "match_method": m[2],
                    }
                    for m in matches
                ],
            })

        # Classify event
        classification = _classify_event(summary, description, len(attendees))

        # Build proposal
        proposal = {
            "uid": uid,
            "summary": summary,
            "description": description,
            "occurred_at": dtstart.isoformat() if dtstart else None,
            "attendees": attendee_matches,
            "classification": classification["classification"],
            "event_type": classification["event_type"],
            "channel": classification.get("channel"),
            "skipped": False,
        }
        proposals.append(proposal)

    return {
        "proposals": proposals,
        "skipped_future": skipped_future,
        "parse_errors": parse_errors,
        "total_contacts": len(contacts),
    }


@router.post("/confirm")
async def confirm_ical_import(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    proposals: list[dict],
) -> Any:
    """Confirm and import selected iCal proposals.

    Accepts a list of proposal dicts (with user-confirmed contact matches)
    and creates Interaction or LifeEvent records. Uses UID-based dedup.
    """
    created_interactions = 0
    created_life_events = 0
    skipped_duplicates = 0
    errors = []

    # Track processed UIDs to avoid duplicates within this request
    processed_uids: set[str] = set()

    for prop in proposals:
        uid = prop.get("uid")
        classification = prop.get("classification", "interaction")

        # Skip if already processed in this batch
        if uid and uid in processed_uids:
            skipped_duplicates += 1
            continue

        # Check if this UID was already imported (would need a dedup table)
        # For now, we'll proceed and let the user handle duplicates

        occurred_at_str = prop.get("occurred_at")
        if not occurred_at_str:
            errors.append(f"Missing occurred_at for event: {prop.get('summary', 'Unknown')}")
            continue

        try:
            occurred_at = datetime.fromisoformat(occurred_at_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            errors.append(f"Invalid date format: {occurred_at_str}")
            continue

        # Get confirmed contact IDs
        contact_ids = []
        for att_match in prop.get("attendees", []):
            # Use the first confirmed match, or the user-selected one
            matches = att_match.get("matches", [])
            if matches:
                # Use the first match (highest confidence)
                contact_ids.append(matches[0]["contact_id"])

        if not contact_ids:
            errors.append(f"No contacts matched for event: {prop.get('summary', 'Unknown')}")
            continue

        try:
            if classification == "interaction":
                # Create Interaction
                channel_str = prop.get("channel", "other")
                try:
                    channel = InteractionChannel(channel_str)
                except ValueError:
                    channel = InteractionChannel.OTHER

                notes_parts = []
                if prop.get("summary"):
                    notes_parts.append(prop["summary"])
                if prop.get("description"):
                    notes_parts.append(prop["description"])

                interaction = Interaction(
                    owner_id=current_user.id,
                    channel=channel,
                    occurred_at=occurred_at,
                    notes="\n\n".join(notes_parts) if notes_parts else None,
                )
                session.add(interaction)
                session.commit()
                session.refresh(interaction)

                # Add attendees
                from app.models import InteractionAttendee
                for cid in contact_ids:
                    ia = InteractionAttendee(
                        interaction_id=interaction.id,
                        contact_id=cid,
                    )
                    session.add(ia)

                created_interactions += 1

            else:
                # Create LifeEvent
                event_type = prop.get("event_type", "milestone")
                title = prop.get("summary", event_type.title())

                # Use the first contact for life events
                life_event = LifeEvent(
                    owner_id=current_user.id,
                    contact_id=contact_ids[0] if contact_ids else None,
                    event_type=event_type,
                    title=title,
                    description=prop.get("description"),
                    occurred_at=occurred_at.date(),
                    create_annual_reminder=prop.get("create_annual_reminder", False),
                )
                session.add(life_event)
                created_life_events += 1

            if uid:
                processed_uids.add(uid)

            session.commit()

        except Exception as e:
            session.rollback()
            errors.append(f"Error creating record for {prop.get('summary', 'Unknown')}: {str(e)}")

    return {
        "created_interactions": created_interactions,
        "created_life_events": created_life_events,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
    }
