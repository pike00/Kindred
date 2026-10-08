import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from threading import Barrier
from uuid import uuid4

import httpx
import pytest
from pydantic import ValidationError
from sqlmodel import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.models import (
    CommunicationPreference,
    Contact,
    Note,
    Relationship,
    Reminder,
)
from app.voice_capture.analysis import ProposalError, validate_proposal
from app.voice_capture.context import candidate_context
from app.voice_capture.schemas import (
    ContactUpdateAction,
    InteractionAction,
    ReminderAction,
    ReviewCapture,
)
from app.voice_capture.service import commit_review, create_capture


def test_voice_action_forbids_fields_outside_contact_update_allowlist():
    with pytest.raises(ValidationError):
        ContactUpdateAction.model_validate(
            {
                "id": str(uuid4()),
                "kind": "contact_update",
                "enabled": True,
                "evidence": "Nora changed jobs",
                "review_warning": None,
                "contact_id": str(uuid4()),
                "fields": {"owner_id": str(uuid4())},
            }
        )


def test_contact_snooze_openapi_operation_ids_are_unique():
    from app.main import app

    schema = app.openapi()
    paths = schema["paths"]
    ids = {
        paths["/api/v1/contacts/{contact_id}/snooze"]["post"]["operationId"],
        paths["/api/v1/contacts/{contact_id}/snooze"]["patch"]["operationId"],
        paths["/api/v1/contacts/{contact_id}/skip"]["patch"]["operationId"],
    }
    assert len(ids) == 3
    assert "contacts-snooze_contact" in ids


def test_action_discriminators_and_aware_datetime_validation():
    valid = InteractionAction.model_validate(
        {
            "id": str(uuid4()),
            "kind": "interaction",
            "enabled": True,
            "evidence": "We had lunch",
            "review_warning": None,
            "attendee_ids": [str(uuid4())],
            "channel": None,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "notes": "Lunch",
            "duration_minutes": None,
            "location_label": None,
        }
    )
    assert isinstance(valid, InteractionAction)
    with pytest.raises(ValidationError):
        InteractionAction.model_validate(
            {
                "id": str(uuid4()),
                "kind": "interaction",
                "enabled": True,
                "evidence": "We had lunch",
                "review_warning": None,
                "attendee_ids": [str(uuid4())],
                "channel": None,
                "occurred_at": "2026-10-07T12:00:00",
                "notes": "Lunch",
                "duration_minutes": None,
                "location_label": None,
            }
        )


def test_reminder_can_be_incomplete_for_review():
    reminder = ReminderAction.model_validate(
        {
            "id": str(uuid4()),
            "kind": "reminder",
            "enabled": True,
            "evidence": "Need to call Nora tomorrow",
            "review_warning": "Choose a reminder time",
            "contact_id": None,
            "title": "Call Nora",
            "description": None,
            "remind_at": None,
            "frequency": "once",
            "is_active": True,
        }
    )
    assert reminder.remind_at is None


def test_capture_source_survives_review_and_commit(client, user_headers):
    created = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Nora prefers tea", "timezone": "America/Chicago"},
    )
    assert created.status_code == 201
    capture = created.json()
    assert capture["raw_text"] == "Nora prefers tea"
    assert capture["corrected_text"] == capture["raw_text"]

    review = {
        "revision": capture["revision"],
        "corrected_text": "Nora prefers tea.",
        "actions": [],
    }
    saved = client.put(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}",
        headers=user_headers,
        json=review,
    )
    assert saved.status_code == 200
    receipt = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={**review, "revision": saved.json()["revision"]},
    )
    assert receipt.status_code == 200
    reopened = client.get(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}", headers=user_headers
    )
    assert reopened.json()["raw_text"] == "Nora prefers tea"
    assert reopened.json()["status"] == "committed"


def test_capture_is_owner_scoped(client, user_headers, normal_user_token_headers):
    created = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Private transcript", "timezone": "UTC"},
    )
    assert created.status_code == 201
    hidden = client.get(
        f"{settings.API_V1_STR}/voice-captures/{created.json()['id']}",
        headers=normal_user_token_headers,
    )
    assert hidden.status_code == 404


def test_commit_is_owner_scoped(client, user_headers, normal_user_token_headers):
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Owner only", "timezone": "UTC"},
    ).json()
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=normal_user_token_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": capture["raw_text"],
            "actions": [],
        },
    )
    assert response.status_code == 404


def test_analyze_rejects_stale_revision(client, user_headers):
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Stale analysis", "timezone": "UTC"},
    ).json()
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/analyze",
        headers=user_headers,
        json={"revision": capture["revision"] + 1},
    )
    assert response.status_code == 409


def test_exact_commit_replay_returns_same_receipt_and_changed_replay_conflicts(
    client, user_headers
):
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Remember the project plan", "timezone": "UTC"},
    ).json()
    review = {
        "revision": capture["revision"],
        "corrected_text": capture["raw_text"],
        "actions": [],
    }
    path = f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit"
    first = client.post(path, headers=user_headers, json=review)
    replay = client.post(path, headers=user_headers, json=review)
    assert first.status_code == replay.status_code == 200
    assert first.json()["results"] == replay.json()["results"]

    changed = client.post(
        path,
        headers=user_headers,
        json={**review, "corrected_text": "Remember the revised plan"},
    )
    assert changed.status_code == 409


def test_commit_persists_all_five_reviewed_action_types_atomically(
    client, user_headers
):
    contact_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=user_headers,
        json={"first_name": "Nora", "company": "OldCo"},
    ).json()["id"]
    source = (
        "I called Nora. Nora prefers tea. Nora became director. "
        "Nora moved. Call Nora tomorrow."
    )
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": source, "timezone": "America/Chicago"},
    ).json()
    actions = [
        {
            "id": str(uuid4()),
            "kind": "interaction",
            "enabled": True,
            "evidence": "I called Nora",
            "review_warning": None,
            "attendee_ids": [contact_id],
            "channel": "call",
            "occurred_at": "2026-10-06T12:00:00Z",
            "notes": "Discussed plans",
            "duration_minutes": 10,
            "location_label": None,
        },
        {
            "id": str(uuid4()),
            "kind": "note",
            "enabled": True,
            "evidence": "Nora prefers tea",
            "review_warning": None,
            "contact_id": contact_id,
            "body": "Nora prefers tea.",
        },
        {
            "id": str(uuid4()),
            "kind": "contact_update",
            "enabled": True,
            "evidence": "Nora became director",
            "review_warning": None,
            "contact_id": contact_id,
            "fields": {"title": "Director"},
        },
        {
            "id": str(uuid4()),
            "kind": "life_event",
            "enabled": True,
            "evidence": "Nora moved",
            "review_warning": None,
            "contact_id": contact_id,
            "event_type": "move",
            "title": "Moved home",
            "description": None,
            "occurred_at": "2026-10-05",
            "create_annual_reminder": False,
        },
        {
            "id": str(uuid4()),
            "kind": "reminder",
            "enabled": True,
            "evidence": "Call Nora tomorrow",
            "review_warning": None,
            "contact_id": contact_id,
            "title": "Call Nora",
            "description": None,
            "remind_at": "2026-10-08T14:00:00Z",
            "frequency": "once",
            "is_active": True,
        },
    ]
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": source,
            "actions": actions,
        },
    )
    assert response.status_code == 200, response.text
    assert {item["kind"] for item in response.json()["results"]["items"]} == {
        "interaction",
        "note",
        "contact_update",
        "life_event",
        "reminder",
    }
    assert response.json()["raw_text"] == source


def test_contact_update_search_index_failure_does_not_undo_commit(
    client, user_headers, monkeypatch
):
    from app import search

    def fail_index(*_args, **_kwargs):
        raise RuntimeError("synthetic search outage")

    monkeypatch.setattr(search, "index_contact", fail_index)
    contact_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=user_headers,
        json={"first_name": "Nora"},
    ).json()["id"]
    source = "Nora became director"
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": source, "timezone": "UTC"},
    ).json()
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": source,
            "actions": [
                {
                    "id": str(uuid4()),
                    "kind": "contact_update",
                    "enabled": True,
                    "evidence": source,
                    "review_warning": None,
                    "contact_id": contact_id,
                    "fields": {"title": "Director"},
                }
            ],
        },
    )
    assert response.status_code == 200


def test_provider_proposal_uses_closed_schema_and_stores_valid_suggestions(
    client, user_headers, monkeypatch
):
    from unittest.mock import AsyncMock, patch

    from pydantic import SecretStr

    from app.api.routes import voice_captures
    from app.voice_capture.analysis import LLMConfig

    contact_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=user_headers,
        json={"first_name": "Nora"},
    ).json()["id"]
    monkeypatch.setattr(
        voice_captures,
        "_llm_config",
        lambda: LLMConfig("http://llm.test/v1", "model", SecretStr("test-only"), 3),
    )
    content = {
        "corrected_text": "Nora prefers tea.",
        "warnings": [],
        "actions": [
            {
                "id": str(uuid4()),
                "kind": "note",
                "enabled": True,
                "evidence": "Nora prefers tea",
                "review_warning": None,
                "contact_id": contact_id,
                "body": "Nora prefers tea.",
            }
        ],
    }
    fake_response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": json.dumps(content)}}]},
        request=httpx.Request("POST", "http://llm.test/v1/chat/completions"),
    )
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Nora prefers tea", "timezone": "UTC"},
    ).json()
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as post:
        post.return_value = fake_response
        response = client.post(
            f"{settings.API_V1_STR}/voice-captures/{capture['id']}/analyze",
            headers=user_headers,
            json={"revision": capture["revision"]},
        )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "ready"
    assert response.json()["actions"][0]["contact_id"] == contact_id
    sent = post.await_args.kwargs["json"]
    assert sent["response_format"]["type"] == "json_schema"
    strict_schema = sent["response_format"]["json_schema"]["schema"]
    assert strict_schema["additionalProperties"] is False
    assert set(strict_schema["required"]) == set(strict_schema["properties"])


def test_stale_revision_is_rejected(client, user_headers):
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "A recoverable fact", "timezone": "UTC"},
    ).json()
    path = f"{settings.API_V1_STR}/voice-captures/{capture['id']}"
    first = client.put(
        path,
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": "A fact",
            "actions": [],
        },
    )
    assert first.status_code == 200
    stale = client.put(
        path,
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": "Other",
            "actions": [],
        },
    )
    assert stale.status_code == 409


def test_inaccessible_second_action_leaves_first_note_unwritten(
    client, user_headers, db, normal_user_token_headers
):
    contact_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=user_headers,
        json={"first_name": "OwnedTarget"},
    ).json()["id"]
    foreign_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=normal_user_token_headers,
        json={"first_name": "ForeignTarget"},
    ).json()["id"]
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "OwnedTarget met ForeignTarget", "timezone": "UTC"},
    ).json()
    actions = [
        {
            "id": str(uuid4()),
            "kind": "note",
            "enabled": True,
            "evidence": "OwnedTarget",
            "review_warning": None,
            "contact_id": contact_id,
            "body": "First action should roll back",
        },
        {
            "id": str(uuid4()),
            "kind": "note",
            "enabled": True,
            "evidence": "ForeignTarget",
            "review_warning": None,
            "contact_id": foreign_id,
            "body": "Unauthorized target",
        },
    ]
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": capture["raw_text"],
            "actions": actions,
        },
    )
    assert response.status_code == 404
    notes = client.get(
        f"{settings.API_V1_STR}/notes/contact/{contact_id}", headers=user_headers
    )
    assert notes.status_code == 200
    assert notes.json()["count"] == 0
    assert db.exec(select(Note).where(Note.contact_id == contact_id)).first() is None


def test_contact_context_includes_matching_contacts_beyond_first_200(db, user):
    contacts = [
        Contact(first_name=f"Person{i:03d}", owner_id=user.id) for i in range(205)
    ]
    db.add_all(contacts)
    db.commit()
    target = contacts[-1]
    groups, ids = candidate_context(db, user, "Person204 called")
    assert target.id in ids
    assert len(groups[0]["contacts"]) <= 20


def test_contact_context_retains_shared_first_name_and_relationship_edge(db, user):
    first = Contact(first_name="Jordan", last_name="Lee", owner_id=user.id)
    second = Contact(first_name="Jordan", last_name="Kim", owner_id=user.id)
    db.add_all([first, second])
    db.flush()
    db.add(
        Relationship(
            contact_id=first.id,
            related_contact_id=second.id,
            relationship_type="colleague",
        )
    )
    db.commit()
    groups, ids = candidate_context(db, user, "Jordan said hello")
    assert {first.id, second.id} <= ids
    assert groups[0]["relationships"] == [
        {"from": str(first.id), "to": str(second.id), "type": "colleague"}
    ]


def test_contact_context_uses_nickname_and_skips_nonmatching_names(db, user):
    contact = Contact(
        first_name="",
        nickname="Sparrow",
        birthday=date(1990, 3, 4),
        owner_id=user.id,
    )
    db.add(contact)
    db.commit()
    groups, ids = candidate_context(db, user, "Sparrow likes tea")
    assert contact.id in ids
    assert groups[0]["contacts"][0]["current_fields"]["birthday"] == "1990-03-04"
    no_matches, no_ids = candidate_context(db, user, "completely unrelated phrase")
    assert no_matches[0]["contacts"] == []
    assert no_ids == set()


@pytest.mark.parametrize("content", [None, "", "not-json", '{"actions": []}'])
def test_provider_content_must_be_valid_json_proposal(content):
    with pytest.raises(ProposalError):
        validate_proposal(content, allowed_contact_ids=set(), source="Original source")


def test_provider_rejects_unknown_contact_and_non_source_evidence():
    invalid_target = {
        "corrected_text": "A fact",
        "warnings": [],
        "actions": [
            {
                "id": str(uuid4()),
                "kind": "note",
                "enabled": True,
                "evidence": "A fact",
                "review_warning": None,
                "contact_id": str(uuid4()),
                "body": "A fact",
            }
        ],
    }
    with pytest.raises(ProposalError, match="outside"):
        validate_proposal(
            json.dumps(invalid_target), allowed_contact_ids=set(), source="A fact"
        )
    invalid_evidence = {
        "corrected_text": "A fact",
        "warnings": [],
        "actions": [
            {
                "id": str(uuid4()),
                "kind": "note",
                "enabled": True,
                "evidence": "A different fact",
                "review_warning": None,
                "contact_id": None,
                "body": "A fact",
            }
        ],
    }
    with pytest.raises(ProposalError, match="exact quote"):
        validate_proposal(
            json.dumps(invalid_evidence), allowed_contact_ids=set(), source="A fact"
        )


def test_capture_delete_rules(client, user_headers):
    base = f"{settings.API_V1_STR}/voice-captures/"
    draft = client.post(
        base,
        headers=user_headers,
        json={"raw_text": "Draft text", "timezone": "UTC"},
    ).json()
    assert (
        client.delete(f"{base}{draft['id']}", headers=user_headers).status_code == 204
    )
    committed = client.post(
        base,
        headers=user_headers,
        json={"raw_text": "Committed text", "timezone": "UTC"},
    ).json()
    commit = client.post(
        f"{base}{committed['id']}/commit",
        headers=user_headers,
        json={
            "revision": committed["revision"],
            "corrected_text": "Committed text",
            "actions": [],
        },
    )
    assert commit.status_code == 200
    edit = client.put(
        f"{base}{committed['id']}",
        headers=user_headers,
        json={
            "revision": commit.json()["revision"],
            "corrected_text": "Committed text",
            "actions": [],
        },
    )
    assert edit.status_code == 409
    assert (
        client.delete(f"{base}{committed['id']}", headers=user_headers).status_code
        == 409
    )


@pytest.mark.parametrize(
    "action",
    [
        {
            "kind": "interaction",
            "attendee_ids": [],
            "channel": None,
            "occurred_at": None,
            "notes": None,
            "duration_minutes": None,
            "location_label": None,
        },
        {
            "kind": "life_event",
            "contact_id": None,
            "event_type": "move",
            "title": "Moved",
            "description": None,
            "occurred_at": None,
            "create_annual_reminder": False,
        },
        {
            "kind": "reminder",
            "contact_id": None,
            "title": "Call",
            "description": None,
            "remind_at": None,
            "frequency": "once",
            "is_active": True,
        },
    ],
)
def test_enabled_actions_require_targets_and_dates(client, user_headers, action):
    source = "Need to call Nora tomorrow"
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": source, "timezone": "UTC"},
    ).json()
    payload_action = {
        "id": str(uuid4()),
        "enabled": True,
        "evidence": source,
        "review_warning": None,
        **action,
    }
    if payload_action["kind"] == "life_event":
        payload_action["contact_id"] = client.post(
            f"{settings.API_V1_STR}/contacts/",
            headers=user_headers,
            json={"first_name": "EventTarget"},
        ).json()["id"]
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": source,
            "actions": [payload_action],
        },
    )
    assert response.status_code == 422


def test_future_interaction_is_not_saved_as_completed(client, user_headers):
    contact_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=user_headers,
        json={"first_name": "Nora"},
    ).json()["id"]
    source = "Nora and I will meet next week"
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": source, "timezone": "UTC"},
    ).json()
    action = {
        "id": str(uuid4()),
        "kind": "interaction",
        "enabled": True,
        "evidence": source,
        "review_warning": None,
        "attendee_ids": [contact_id],
        "channel": "other",
        "occurred_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "notes": None,
        "duration_minutes": None,
        "location_label": None,
    }
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": source,
            "actions": [action],
        },
    )
    assert response.status_code == 422


def test_contact_reminder_respects_communication_preference_dnc(
    client, user_headers, db
):
    contact_id = client.post(
        f"{settings.API_V1_STR}/contacts/",
        headers=user_headers,
        json={"first_name": "NoReminder", "do_not_contact": False},
    ).json()["id"]
    db.add(CommunicationPreference(contact_id=contact_id, do_not_contact=True))
    db.commit()
    source = "Call NoReminder tomorrow"
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": source, "timezone": "UTC"},
    ).json()
    action = {
        "id": str(uuid4()),
        "kind": "reminder",
        "enabled": True,
        "evidence": source,
        "review_warning": None,
        "contact_id": contact_id,
        "title": "Call NoReminder",
        "description": None,
        "remind_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "frequency": "once",
        "is_active": True,
    }
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/commit",
        headers=user_headers,
        json={
            "revision": capture["revision"],
            "corrected_text": source,
            "actions": [action],
        },
    )
    assert response.status_code == 422
    assert (
        db.exec(select(Reminder).where(Reminder.contact_id == contact_id)).first()
        is None
    )


def test_real_concurrent_identical_commits_return_same_receipt(db, user):
    capture = create_capture(db, user.id, "Concurrent capture", "UTC")
    barrier = Barrier(2)
    review = ReviewCapture(
        revision=capture.revision, corrected_text=capture.raw_text, actions=[]
    )

    def commit_once():
        with SessionLocal() as session:
            barrier.wait()
            row = commit_review(session, capture.id, user.id, review)
            return row.results

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: commit_once(), range(2)))
    assert results[0] == results[1]
    db.refresh(capture)
    assert capture.status == "committed"


def test_unconfigured_analysis_saves_recoverable_error(client, user_headers):
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Nora prefers tea", "timezone": "America/Chicago"},
    ).json()
    response = client.post(
        f"{settings.API_V1_STR}/voice-captures/{capture['id']}/analyze",
        headers=user_headers,
        json={"revision": capture["revision"]},
    )
    assert response.status_code == 200
    assert response.json()["raw_text"] == "Nora prefers tea"
    assert response.json()["status"] == "draft"
    assert "not configured" in response.json()["analysis_error"]


def test_malformed_provider_response_saves_recoverable_error(
    client, user_headers, monkeypatch
):
    from unittest.mock import AsyncMock, patch

    from pydantic import SecretStr

    from app.api.routes import voice_captures
    from app.voice_capture.analysis import LLMConfig

    monkeypatch.setattr(
        voice_captures,
        "_llm_config",
        lambda: LLMConfig("http://llm.test/v1", "model", SecretStr("test-only"), 3),
    )
    fake_response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": None}}]},
        request=httpx.Request("POST", "http://llm.test/v1/chat/completions"),
    )
    capture = client.post(
        f"{settings.API_V1_STR}/voice-captures/",
        headers=user_headers,
        json={"raw_text": "Need to call Nora tomorrow", "timezone": "UTC"},
    ).json()
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as post:
        post.return_value = fake_response
        response = client.post(
            f"{settings.API_V1_STR}/voice-captures/{capture['id']}/analyze",
            headers=user_headers,
            json={"revision": capture["revision"]},
        )
    assert response.status_code == 200
    assert response.json()["raw_text"] == "Need to call Nora tomorrow"
    assert response.json()["analysis_error"]
