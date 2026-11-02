"""Regression tests for webhook replay safety and signature handling."""

from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.routes.webhooks import _compute_twilio_signature
from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    Interaction,
    WebhookDelivery,
)


def _create_webhook(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str,
    secret: str | None = "test-secret",
) -> dict:
    response = client.post(
        "/api/v1/webhooks/",
        headers=headers,
        json={
            "name": name,
            "direction": "inbound",
            "secret": secret,
            "is_active": True,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _add_phone_contact(session: Session, owner_id: str, phone: str) -> Contact:
    contact = Contact(owner_id=owner_id, first_name="Webhook Contact")
    session.add(contact)
    session.commit()
    session.refresh(contact)
    session.add(
        ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.PHONE,
            label="mobile",
            value=phone,
        )
    )
    session.commit()
    return contact


def _twilio_post(
    client: TestClient,
    api_key: str,
    payload: dict[str, str],
    secret: str = "test-secret",
):
    url = f"http://testserver/api/v1/webhooks/twilio/{api_key}"
    signature = _compute_twilio_signature(url, payload, secret)
    return client.post(
        f"/api/v1/webhooks/twilio/{api_key}",
        data=payload,
        headers={"X-Twilio-Signature": signature},
    )


def test_twilio_sms_replay_is_idempotent(
    client: TestClient,
    session: Session,
    api_key_headers: dict[str, str],
) -> None:
    webhook = _create_webhook(client, api_key_headers, name="Replay SMS")
    _add_phone_contact(session, webhook["owner_id"], "+14155559001")
    payload = {
        "MessageSid": f"SM-{uuid.uuid4().hex}",
        "From": "+14155559001",
        "To": "+18005551234",
        "Body": "replay-safe message",
    }

    first = _twilio_post(client, webhook["api_key"], payload)
    second = _twilio_post(client, webhook["api_key"], payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["interaction_id"] == first.json()["interaction_id"]
    interactions = session.exec(
        select(Interaction).where(Interaction.notes == "SMS: replay-safe message")
    ).all()
    assert len(interactions) == 1


def test_twilio_call_status_updates_initial_interaction(
    client: TestClient,
    session: Session,
    api_key_headers: dict[str, str],
) -> None:
    webhook = _create_webhook(client, api_key_headers, name="Call lifecycle")
    _add_phone_contact(session, webhook["owner_id"], "+14155559002")
    call_sid = f"CA-{uuid.uuid4().hex}"
    initial = {
        "CallSid": call_sid,
        "From": "+14155559002",
        "To": "+18005551234",
        "CallStatus": "in-progress",
    }
    completed = {
        **initial,
        "CallStatus": "completed",
        "CallDuration": "120",
        "CallbackSource": "call-progress-events",
    }

    first = _twilio_post(client, webhook["api_key"], initial)
    second = _twilio_post(client, webhook["api_key"], completed)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["interaction_id"] == first.json()["interaction_id"]
    interaction = session.get(Interaction, uuid.UUID(first.json()["interaction_id"]))
    assert interaction is not None
    assert interaction.duration_minutes == 2
    assert "completed" in (interaction.notes or "")


def _inbound_signature(secret: str, body: str) -> str:
    return hmac.new(
        secret.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()


def test_generic_inbound_requires_signature_and_deduplicates(
    client: TestClient,
    session: Session,
    api_key_headers: dict[str, str],
) -> None:
    webhook = _create_webhook(client, api_key_headers, name="Signed inbound")
    contact = Contact(
        owner_id=webhook["owner_id"],
        first_name="Inbound",
        auto_log_email=True,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    session.add(
        ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.EMAIL,
            label="home",
            value="inbound@example.com",
        )
    )
    session.commit()
    payload = {
        "event_id": f"event-{uuid.uuid4().hex}",
        "contact_email": "inbound@example.com",
        "channel": "call",
        "notes": "signed replay-safe event",
        "occurred_at": "2026-01-15T10:00:00Z",
    }
    body = json.dumps(payload, separators=(",", ":"))
    url = f"/api/v1/webhooks/inbound/{webhook['api_key']}"

    unsigned = client.post(
        url,
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert unsigned.status_code == 401

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": _inbound_signature("test-secret", body),
    }
    first = client.post(url, content=body, headers=headers)
    second = client.post(url, content=body, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["interaction_id"] == first.json()["interaction_id"]


def test_stale_incomplete_delivery_claim_can_retry(
    client: TestClient,
    session: Session,
    api_key_headers: dict[str, str],
) -> None:
    webhook = _create_webhook(client, api_key_headers, name="Lease recovery")
    contact = Contact(owner_id=webhook["owner_id"], first_name="Lease")
    session.add(contact)
    session.commit()
    session.refresh(contact)
    session.add(
        ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.EMAIL,
            label="home",
            value="lease-recovery@example.com",
        )
    )
    session.commit()

    payload = {
        "event_id": f"event-{uuid.uuid4().hex}",
        "contact_email": "lease-recovery@example.com",
        "channel": "call",
        "notes": "recovered after a failed attempt",
    }
    body = json.dumps(payload, separators=(",", ":"))
    delivery = WebhookDelivery(
        webhook_id=uuid.UUID(webhook["id"]),
        delivery_id=payload["event_id"],
        claimed_at=datetime.now(timezone.utc) - timedelta(minutes=10),
    )
    session.add(delivery)
    session.commit()

    response = client.post(
        f"/api/v1/webhooks/inbound/{webhook['api_key']}",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": _inbound_signature("test-secret", body),
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["matched"] is True
    session.refresh(delivery)
    assert delivery.interaction_id is not None


def test_active_incomplete_delivery_returns_retryable_status(
    client: TestClient,
    session: Session,
    api_key_headers: dict[str, str],
) -> None:
    webhook = _create_webhook(client, api_key_headers, name="Active lease")
    contact = Contact(owner_id=webhook["owner_id"], first_name="Active")
    session.add(contact)
    session.commit()
    session.refresh(contact)
    session.add(
        ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.EMAIL,
            label="home",
            value="active-lease@example.com",
        )
    )
    session.commit()
    payload = {
        "event_id": f"event-{uuid.uuid4().hex}",
        "contact_email": "active-lease@example.com",
        "notes": "provider should retry",
    }
    session.add(
        WebhookDelivery(
            webhook_id=uuid.UUID(webhook["id"]),
            delivery_id=payload["event_id"],
            claimed_at=datetime.now(timezone.utc),
        )
    )
    session.commit()
    body = json.dumps(payload, separators=(",", ":"))

    response = client.post(
        f"/api/v1/webhooks/inbound/{webhook['api_key']}",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": _inbound_signature("test-secret", body),
        },
    )

    assert response.status_code == 503
    assert "already being processed" in response.json()["detail"]


def test_webhook_update_does_not_clear_existing_secret(
    client: TestClient,
    api_key_headers: dict[str, str],
) -> None:
    webhook = _create_webhook(client, api_key_headers, name="Secret preservation")

    updated = client.patch(
        f"/api/v1/webhooks/{webhook['id']}",
        headers=api_key_headers,
        json={
            "name": "Secret preservation updated",
            "direction": "inbound",
            "url": None,
            "event_types": None,
            "secret": None,
            "is_active": True,
        },
    )

    assert updated.status_code == 200
    assert updated.json()["secret"] == "test-secret"
