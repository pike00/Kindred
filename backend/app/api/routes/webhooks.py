"""Webhook management routes."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    WebhookEndpoint,
    WebhookEndpointBase,
    Contact,
    Interaction,
    InteractionChannel,
    ContactField,
    ContactFieldType,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("/")
def list_webhooks(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """List all webhook endpoints for the user."""
    statement = select(WebhookEndpoint).where(WebhookEndpoint.owner_id == current_user.id)
    webhooks = session.exec(statement).all()

    return {
        "data": [
            {
                "id": str(w.id),
                "name": w.name,
                "url": w.url,
                "direction": w.direction,
                "event_types": w.event_types,
                "is_active": w.is_active,
                "created_at": w.created_at.isoformat(),
            }
            for w in webhooks
        ],
        "count": len(webhooks),
    }


@router.post("/")
def create_webhook(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    webhook_in: WebhookEndpointBase,
) -> Any:
    """Create a new webhook endpoint."""
    import secrets

    api_key = secrets.token_urlsafe(32)
    webhook = WebhookEndpoint(
        owner_id=current_user.id,
        api_key=api_key,
        **webhook_in.model_dump(),
    )
    session.add(webhook)
    session.commit()
    session.refresh(webhook)

    return {
        "id": str(webhook.id),
        "name": webhook.name,
        "url": webhook.url,
        "direction": webhook.direction,
        "api_key": api_key,
        "is_active": webhook.is_active,
        "created_at": webhook.created_at.isoformat(),
    }


@router.patch("/{webhook_id}")
def update_webhook(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    webhook_id: uuid.UUID,
    webhook_in: WebhookEndpointBase,
) -> Any:
    """Update a webhook endpoint."""
    webhook = session.get(WebhookEndpoint, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if webhook.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = webhook_in.model_dump(exclude_unset=True)
    webhook.sqlmodel_update(update_data)
    session.add(webhook)
    session.commit()
    session.refresh(webhook)

    return {
        "id": str(webhook.id),
        "name": webhook.name,
        "url": webhook.url,
        "direction": webhook.direction,
        "is_active": webhook.is_active,
        "created_at": webhook.created_at.isoformat(),
    }


@router.delete("/{webhook_id}")
def delete_webhook(
    session: SessionDep,
    current_user: CurrentUser,
    webhook_id: uuid.UUID,
) -> Any:
    """Delete a webhook endpoint."""
    webhook = session.get(WebhookEndpoint, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if webhook.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(webhook)
    session.commit()
    return {"ok": True}


@router.post("/inbound/{api_key}")
async def inbound_webhook(
    session: SessionDep,
    api_key: str,
    payload: dict[str, Any],
) -> Any:
    """Inbound webhook receiver for external integrations (n8n, Aqara, etc.).

    Payload format:
    {
        "contact_email": "user@example.com",  // OR
        "contact_name": "John Doe",           // lookup by name
        "channel": "call",                     // InteractionChannel value
        "notes": "Called about project X",     // optional
        "occurred_at": "2024-01-15T10:00:00Z"  // optional, defaults to now
    }
    """
    # Find webhook by API key
    statement = select(WebhookEndpoint).where(WebhookEndpoint.api_key == api_key)
    webhook = session.exec(statement).first()
    if not webhook:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not webhook.is_active:
        raise HTTPException(status_code=410, detail="Webhook is inactive")

    # Find the contact
    contact = None
    owner_id = webhook.owner_id

    if "contact_email" in payload:
        # Look up contact by email field
        field = session.exec(
            select(ContactField).where(
                ContactField.field_type == ContactFieldType.EMAIL,
                ContactField.value == payload["contact_email"],
            )
        ).first()
        if field:
            contact = session.get(Contact, field.contact_id)
            if contact and contact.owner_id != owner_id:
                contact = None

    if not contact and "contact_name" in payload:
        parts = payload["contact_name"].strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else None

        statement = select(Contact).where(
            Contact.owner_id == owner_id,
            col(Contact.first_name).ilike(first_name),
        )
        if last_name:
            statement = statement.where(col(Contact.last_name).ilike(last_name))
        contact = session.exec(statement).first()

    if not contact:
        return {
            "received": True,
            "matched": False,
            "error": "No matching contact found",
        }

    # Create interaction
    channel = payload.get("channel", "other")
    try:
        channel_enum = InteractionChannel(channel)
    except ValueError:
        channel_enum = InteractionChannel.OTHER

    occurred_at = payload.get("occurred_at")
    if occurred_at:
        try:
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            occurred_at = datetime.now(timezone.utc)
    else:
        occurred_at = datetime.now(timezone.utc)

    interaction = Interaction(
        contact_id=contact.id,
        owner_id=owner_id,
        channel=channel_enum,
        occurred_at=occurred_at,
        notes=payload.get("notes"),
    )
    session.add(interaction)

    # Update last_contacted_at
    if contact.last_contacted_at is None or occurred_at > contact.last_contacted_at:
        contact.last_contacted_at = occurred_at
        session.add(contact)

    session.commit()

    return {
        "received": True,
        "matched": True,
        "contact_id": str(contact.id),
        "interaction_id": str(interaction.id),
    }
