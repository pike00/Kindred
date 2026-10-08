from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from app.crud import _sync_note_mentions, contact_visible
from app.models import (
    CommunicationPreference,
    Contact,
    Interaction,
    InteractionAttendee,
    LifeEvent,
    Note,
    Reminder,
    VoiceCapture,
    get_datetime_utc,
)
from app.voice_capture.analysis import LLMConfig, ProposalError, analyze_text
from app.voice_capture.context import candidate_context
from app.voice_capture.schemas import (
    ContactUpdateAction,
    InteractionAction,
    LifeEventAction,
    NoteAction,
    ReminderAction,
    ReviewCapture,
    VoiceAction,
    VoiceCapturePublic,
)


def _dump_actions(actions: list[VoiceAction]) -> list[dict[str, Any]]:
    return [action.model_dump(mode="json") for action in actions]


def public_capture(capture: VoiceCapture) -> VoiceCapturePublic:
    return VoiceCapturePublic(
        id=capture.id,
        raw_text=capture.raw_text,
        corrected_text=capture.corrected_text,
        timezone=capture.timezone,
        recorded_at=capture.recorded_at,
        created_at=capture.created_at,
        updated_at=capture.updated_at,
        status=capture.status,
        revision=capture.revision,
        actions=capture.actions.get("items", []),
        warnings=capture.warnings or [],
        analysis_error=capture.analysis_error,
        committed_at=capture.committed_at,
        results=capture.results,
    )


def create_capture(
    session: Session, owner_id: uuid.UUID, raw_text: str, timezone_name: str
) -> VoiceCapture:
    capture = VoiceCapture(
        owner_id=owner_id,
        raw_text=raw_text,
        corrected_text=raw_text,
        timezone=timezone_name,
        recorded_at=datetime.now(timezone.utc),
        actions={"items": []},
        warnings=[],
    )
    session.add(capture)
    session.commit()
    session.refresh(capture)
    return capture


async def analyze_capture(
    session: Session,
    capture: VoiceCapture,
    owner: Any,
    revision: int,
    text: str | None,
    config: LLMConfig,
) -> VoiceCapture:
    if revision != capture.revision:
        raise HTTPException(409, "Capture revision is stale")
    source = text or capture.raw_text
    contact_groups, ids = candidate_context(session, owner, source)
    # The provider request happens before any write transaction or row lock.
    try:
        proposal = await analyze_text(
            config=config,
            raw_text=source,
            timezone_name=capture.timezone,
            recorded_at=capture.recorded_at,
            contacts=contact_groups,
        )
        proposal = proposal.model_copy(
            update={
                "actions": [
                    action
                    for action in proposal.actions
                    if _targets_allowed(action, ids)
                ],
            }
        )
        error = None
        status = "ready"
        actions = _dump_actions(proposal.actions)
        corrected = proposal.corrected_text
        warnings = proposal.warnings
    except ProposalError as exc:
        error = str(exc)
        status = "draft"
        actions = capture.actions.get("items", [])
        corrected = capture.corrected_text
        warnings = capture.warnings or []
    session.refresh(capture)
    if capture.revision != revision:
        raise HTTPException(409, "Capture changed while analysis was running")
    capture.corrected_text = corrected
    capture.actions = {"items": actions}
    capture.warnings = warnings
    capture.analysis_error = error
    capture.status = status
    capture.revision += 1
    capture.updated_at = get_datetime_utc()
    session.add(capture)
    session.commit()
    session.refresh(capture)
    return capture


def _targets_allowed(action: VoiceAction, ids: set[uuid.UUID]) -> bool:
    targets = []
    if getattr(action, "contact_id", None) is not None:
        targets.append(action.contact_id)
    if isinstance(action, InteractionAction):
        targets.extend(action.attendee_ids)
    return all(target in ids for target in targets)


def save_review(
    session: Session, capture: VoiceCapture, owner_id: uuid.UUID, review: ReviewCapture
) -> VoiceCapture:
    locked = _lock_capture(session, capture.id, owner_id)
    if locked.status == "committed":
        raise HTTPException(409, "Committed capture cannot be edited")
    _require_revision(locked, review.revision)
    locked.corrected_text = review.corrected_text
    locked.actions = {"items": _dump_actions(review.actions)}
    locked.status = "ready"
    locked.analysis_error = None
    locked.revision += 1
    locked.updated_at = get_datetime_utc()
    session.add(locked)
    session.commit()
    session.refresh(locked)
    return locked


def commit_review(
    session: Session, capture_id: uuid.UUID, owner_id: uuid.UUID, review: ReviewCapture
) -> VoiceCapture:
    locked = _lock_capture(session, capture_id, owner_id)
    payload = {
        "corrected_text": review.corrected_text,
        "actions": _dump_actions(review.actions),
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    if locked.status == "committed":
        if locked.commit_hash == digest:
            return locked
        raise HTTPException(
            409, "Capture was already committed with a different payload"
        )
    _require_revision(locked, review.revision)
    try:
        actions = [a for a in review.actions if a.enabled]
        _validate_actions(session, owner_id, locked.raw_text, actions)
        results: list[dict[str, str]] = []
        indexed_contacts: set[uuid.UUID] = set()
        for action in actions:
            row = _persist_action(session, owner_id, action)
            if isinstance(action, ContactUpdateAction):
                indexed_contacts.add(action.contact_id)  # type: ignore[arg-type]
            results.append({"kind": action.kind, "id": str(row.id)})
        locked.corrected_text = review.corrected_text
        locked.actions = {"items": _dump_actions(review.actions)}
        locked.status = "committed"
        locked.committed_at = get_datetime_utc()
        locked.commit_hash = digest
        locked.results = {"items": results}
        locked.revision += 1
        locked.updated_at = get_datetime_utc()
        session.add(locked)
        session.commit()
    except HTTPException:
        session.rollback()
        raise
    except Exception as exc:
        session.rollback()
        raise HTTPException(
            422, "Unable to save all reviewed actions; no changes were committed"
        ) from exc
    session.refresh(locked)
    for contact_id in indexed_contacts:
        try:
            from app.search import index_contact

            contact = session.get(Contact, contact_id)
            if contact:
                index_contact(
                    str(contact.id),
                    {
                        "id": str(contact.id),
                        "owner_id": str(contact.owner_id),
                        "first_name": contact.first_name,
                        "last_name": contact.last_name,
                        "nickname": contact.nickname,
                        "company": contact.company,
                        "title": contact.title,
                    },
                )
        except Exception:
            pass
    return locked


def _lock_capture(
    session: Session, capture_id: uuid.UUID, owner_id: uuid.UUID
) -> VoiceCapture:
    capture = session.exec(
        select(VoiceCapture)
        .where(VoiceCapture.id == capture_id, VoiceCapture.owner_id == owner_id)
        .with_for_update()
    ).first()
    if capture is None:
        raise HTTPException(404, "Voice capture not found")
    return capture


def _require_revision(capture: VoiceCapture, revision: int) -> None:
    if capture.revision != revision:
        raise HTTPException(409, "Capture revision is stale")


def _validate_actions(
    session: Session, owner_id: uuid.UUID, source: str, actions: list[VoiceAction]
) -> None:
    for action in actions:
        if action.evidence not in source:
            raise HTTPException(
                422, "Action evidence must quote the original transcript"
            )
        if isinstance(action, InteractionAction):
            if (
                not action.attendee_ids
                or action.channel is None
                or action.occurred_at is None
            ):
                raise HTTPException(
                    422,
                    "Enabled interactions need attendees, channel, and occurrence time",
                )
            if action.occurred_at.astimezone(timezone.utc) > datetime.now(timezone.utc):
                raise HTTPException(
                    422, "Future plans cannot be saved as completed interactions"
                )
            for cid in action.attendee_ids:
                if not contact_visible(
                    session=session, user=SimpleNamespace(id=owner_id), contact_id=cid
                ):
                    raise HTTPException(404, "Contact not found")
        elif isinstance(action, (NoteAction, ContactUpdateAction)):
            if action.contact_id is None or not _owned_contact(
                session, owner_id, action.contact_id
            ):
                raise HTTPException(404, "Owned contact not found")
        elif isinstance(action, LifeEventAction):
            if action.contact_id is None or not contact_visible(
                session=session,
                user=SimpleNamespace(id=owner_id),
                contact_id=action.contact_id,
            ):
                raise HTTPException(404, "Contact not found")
            if action.occurred_at is None:
                raise HTTPException(422, "Enabled life events need a date")
        elif isinstance(action, ReminderAction):
            if action.remind_at is None:
                raise HTTPException(422, "Enabled reminders need a date and time")
            if action.contact_id is not None:
                contact = session.get(Contact, action.contact_id)
                if not contact or not contact_visible(
                    session=session,
                    user=SimpleNamespace(id=owner_id),
                    contact_id=action.contact_id,
                ):
                    raise HTTPException(404, "Contact not found")
                if contact.do_not_contact:
                    raise HTTPException(
                        422, "Cannot create a reminder for a do-not-contact contact"
                    )
                preference = session.exec(
                    select(CommunicationPreference).where(
                        CommunicationPreference.contact_id == contact.id
                    )
                ).first()
                if preference and preference.do_not_contact:
                    raise HTTPException(
                        422, "Cannot create a reminder for a do-not-contact contact"
                    )


def _owned_contact(
    session: Session, owner_id: uuid.UUID, contact_id: uuid.UUID
) -> Contact | None:
    contact = session.get(Contact, contact_id)
    return contact if contact and contact.owner_id == owner_id else None


def _persist_action(session: Session, owner_id: uuid.UUID, action: VoiceAction):
    if isinstance(action, InteractionAction):
        row = Interaction(
            owner_id=owner_id,
            channel=action.channel.value,
            occurred_at=action.occurred_at,
            notes=action.notes,
            duration_minutes=action.duration_minutes,
            location_label=action.location_label,
            is_draft=False,
        )
        session.add(row)
        session.flush()
        for contact_id in sorted(set(action.attendee_ids), key=str):
            session.add(
                InteractionAttendee(interaction_id=row.id, contact_id=contact_id)
            )
            contact = session.get(Contact, contact_id)
            if contact and (
                contact.last_contacted_at is None
                or contact.last_contacted_at < action.occurred_at
            ):
                contact.last_contacted_at = action.occurred_at
        return row
    if isinstance(action, NoteAction):
        row = Note(contact_id=action.contact_id, owner_id=owner_id, body=action.body)
        session.add(row)
        session.flush()
        _sync_note_mentions(session=session, note=row)
        return row
    if isinstance(action, ContactUpdateAction):
        row = _owned_contact(session, owner_id, action.contact_id)  # type: ignore[arg-type]
        assert row is not None
        for key, value in action.fields.items():
            setattr(row, key, value)
        row.updated_at = get_datetime_utc()
        session.add(row)
        session.flush()
        return row
    if isinstance(action, LifeEventAction):
        row = LifeEvent(
            contact_id=action.contact_id,
            owner_id=owner_id,
            event_type=action.event_type,
            title=action.title,
            description=action.description,
            occurred_at=action.occurred_at,
            create_annual_reminder=False,
        )
        session.add(row)
        session.flush()
        return row
    if isinstance(action, ReminderAction):
        row = Reminder(
            contact_id=action.contact_id,
            owner_id=owner_id,
            title=action.title,
            description=action.description,
            remind_at=action.remind_at,
            frequency=action.frequency.value,
            is_active=True,
        )
        session.add(row)
        session.flush()
        return row
    raise HTTPException(422, "Unsupported action")
