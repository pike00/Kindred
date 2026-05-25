"""Webhook management routes."""

import hashlib
import hmac
import uuid
from datetime import datetime, timezone
from typing import Any

import phonenumbers
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from redis import Redis
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Contact,
    ContactCreate,
    ContactField,
    ContactFieldType,
    Interaction,
    InteractionAttendee,
    InteractionChannel,
    Ok,
    WebhookEndpoint,
    WebhookEndpointBase,
    WebhookEndpointCreated,
    WebhookEndpointPublic,
    WebhookEndpointsPublic,
    WebhookEventResponse,
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

RedisDep = Depends(lambda: Redis.from_url("redis://redis:6379/0"))


# ─── Twilio Helpers ────────────────────────────────────────────────────


def _compute_twilio_signature(url: str, params: dict[str, str], auth_token: str) -> str:
    """Compute the X-Twilio-Signature as Twilio does.

    Twilio v1: HMAC-SHA1 of (url + sorted params) using auth_token as key.
    """
    # Build the signature base string: URL + sorted key-value pairs
    sorted_params = sorted(params.items())
    signature_base = url + "".join(f"{k}{v}" for k, v in sorted_params)

    # Compute HMAC-SHA1
    mac = hmac.new(
        auth_token.encode("utf-8"),
        signature_base.encode("utf-8"),
        hashlib.sha1,
    )
    return mac.hexdigest()


def _verify_twilio_signature(
    request_url: str, params: dict[str, str], expected_sig: str, auth_token: str
) -> bool:
    """Verify X-Twilio-Signature header."""
    computed = _compute_twilio_signature(request_url, params, auth_token)
    return hmac.compare_digest(computed, expected_sig)


def _normalize_phone(raw: str, region: str = "US") -> str | None:
    """Normalize a raw phone number to E.164 format.

    Returns None if the number cannot be parsed.
    """
    try:
        parsed = phonenumbers.parse(raw, region=region)
        if not phonenumbers.is_valid_number(parsed):
            return None
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        return None


def _find_contact_by_phone(
    session: SessionDep, owner_id: uuid.UUID, e164_phone: str
) -> Contact | None:
    """Find a contact by E.164-normalized phone number."""
    # Look up contact by phone field with E.164 value
    field = session.exec(
        select(ContactField).where(
            ContactField.field_type == ContactFieldType.PHONE,
            ContactField.value == e164_phone,
        )
    ).first()

    if field:
        contact = session.get(Contact, field.contact_id)
        if contact and contact.owner_id == owner_id:
            return contact

    # Also try to find by matching with non-normalized numbers
    # (in case existing numbers aren't stored in E.164)
    all_phone_fields = session.exec(
        select(ContactField).where(
            ContactField.field_type == ContactFieldType.PHONE,
        )
    ).all()

    for pf in all_phone_fields:
        normalized = _normalize_phone(pf.value)
        if normalized == e164_phone:
            contact = session.get(Contact, pf.contact_id)
            if contact and contact.owner_id == owner_id:
                return contact

    return None


def _create_unknown_contact(
    session: SessionDep, owner_id: uuid.UUID, e164_phone: str
) -> Contact:
    """Create a minimal placeholder contact for an unknown phone number."""
    from app.crud import create_contact

    # Format display name as "Unknown (+1-415-555-2671)"
    display_phone = e164_phone.lstrip("+")
    display_phone = "-".join(
        [display_phone[:1], display_phone[1:4], display_phone[4:7], display_phone[7:]]
    )

    contact_in = ContactCreate(
        first_name=f"Unknown ({display_phone})",
        last_name="",
    )

    contact = create_contact(session=session, contact_in=contact_in, owner_id=owner_id)

    # Add the phone field
    phone_field = ContactField(
        contact_id=contact.id,
        field_type=ContactFieldType.PHONE,
        label="mobile",
        value=e164_phone,
        is_primary=True,
    )
    session.add(phone_field)
    session.commit()
    session.refresh(contact)

    return contact


def _check_rate_limit(
    redis: Redis, key: str, limit: int = 10, window: int = 60
) -> bool:
    """Check if rate limit is exceeded. Returns True if allowed.

    Args:
        redis: Redis client
        key: Rate limit key (e.g., "rate_limit:twilio:+14155552671")
        limit: Max requests per window
        window: Window in seconds

    Returns:
        True if request is allowed, False if rate limited
    """
    pipe = redis.pipeline()
    now = datetime.now(timezone.utc).timestamp()

    # Use sliding window with sorted set
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zcard(key)
    pipe.zadd(key, {str(now): now})
    pipe.expire(key, window)
    results = pipe.execute()

    count = results[1]  # Count after removing old entries
    return count < limit


@router.post("/twilio/{api_key}")
async def twilio_webhook(
    request: Request,
    session: SessionDep,
    redis: Redis = RedisDep,
    api_key: str = "",
) -> Any:
    """Twilio SMS and Call webhook handler.

    Verifies X-Twilio-Signature, normalizes phone numbers to E.164,
    matches to contacts, and creates Interaction records.

    For calls, this endpoint handles both initial webhook (CallSid + caller)
    and StatusCallback (call completion with duration).
    """
    # Find webhook by API key
    statement = select(WebhookEndpoint).where(WebhookEndpoint.api_key == api_key)
    webhook = session.exec(statement).first()

    if not webhook:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not webhook.is_active:
        raise HTTPException(status_code=410, detail="Webhook is inactive")

    # Get the request body for signature verification
    # Twilio sends form-encoded data, not JSON
    form_data = await request.form()
    params = dict(form_data)

    # Verify Twilio signature if secret is configured
    if webhook.secret:
        twilio_sig = request.headers.get("X-Twilio-Signature", "")
        if not twilio_sig:
            raise HTTPException(status_code=401, detail="Missing X-Twilio-Signature")

        # Get the full URL for signature verification
        # Use the original URL as Twilio signed it
        url = str(request.url)

        if not _verify_twilio_signature(url, params, twilio_sig, webhook.secret):
            raise HTTPException(status_code=401, detail="Invalid Twilio signature")

    owner_id = webhook.owner_id

    # Determine if this is SMS or Call
    message_sid = params.get("MessageSid")
    call_sid = params.get("CallSid")

    # Get phone numbers
    from_number = params.get("From", "")
    # to_number is not used currently but kept for future use if needed

    # Normalize phone numbers to E.164
    from_e164 = _normalize_phone(from_number) if from_number else None
    # to_number is not used currently but kept for future use if needed
    # to_e164 is not used currently but kept for future use if needed

    if not from_e164:
        return {"received": True, "error": "Could not parse From number"}

    # Rate limiting per sender number
    rate_key = f"rate_limit:twilio:{from_e164}"
    if not _check_rate_limit(redis, rate_key, limit=10, window=60):
        return Response(status_code=429, content="Rate limited")

    # Find or create contact
    contact = _find_contact_by_phone(session, owner_id, from_e164)

    if not contact:
        # Create unknown contact
        contact = _create_unknown_contact(session, owner_id, from_e164)

    # Handle SMS
    if message_sid:
        body = params.get("Body", "")

        interaction = Interaction(
            owner_id=owner_id,
            channel=InteractionChannel.TEXT,
            occurred_at=datetime.now(timezone.utc),
            notes=f"SMS: {body}" if body else "SMS received",
        )
        session.add(interaction)
        session.flush()
        session.add(
            InteractionAttendee(interaction_id=interaction.id, contact_id=contact.id)
        )

        # Update last_contacted_at
        if (
            contact.last_contacted_at is None
            or interaction.occurred_at > contact.last_contacted_at
        ):
            contact.last_contacted_at = interaction.occurred_at
            session.add(contact)

        session.commit()

        return {
            "received": True,
            "matched": True,
            "channel": "text",
            "contact_id": str(contact.id),
            "interaction_id": str(interaction.id),
        }

    # Handle Call
    if call_sid:
        call_status = params.get("CallStatus", "")

        # Check if this is a StatusCallback (call completed)
        is_status_callback = params.get("CallbackSource") == "call-progress-events" or call_status in (
            "completed",
            "busy",
            "no-answer",
            "failed",
            "canceled",
        )

        # Get call duration if available (from StatusCallback)
        duration_seconds = params.get("CallDuration", "")
        duration_minutes = None
        if duration_seconds:
            try:
                duration_minutes = max(1, round(int(duration_seconds) / 60))
            except (ValueError, TypeError):
                pass

        # For initial call webhook (not StatusCallback), just log the call
        # For StatusCallback, update the existing interaction with duration
        if is_status_callback and duration_minutes:
            # Try to find existing call interaction by looking for recent calls with same CallSid
            # For simplicity, create a new interaction for the completed call
            notes = f"Call from {from_number}"
            if call_status:
                notes += f" (status: {call_status})"

            interaction = Interaction(
                owner_id=owner_id,
                channel=InteractionChannel.CALL,
                occurred_at=datetime.now(timezone.utc),
                notes=notes,
                duration_minutes=duration_minutes,
            )
        else:
            # Initial call webhook
            notes = f"Call from {from_number}"
            if call_status:
                notes += f" (status: {call_status})"

            interaction = Interaction(
                owner_id=owner_id,
                channel=InteractionChannel.CALL,
                occurred_at=datetime.now(timezone.utc),
                notes=notes,
            )

        session.add(interaction)
        session.flush()
        session.add(
            InteractionAttendee(interaction_id=interaction.id, contact_id=contact.id)
        )

        # Update last_contacted_at
        if (
            contact.last_contacted_at is None
            or interaction.occurred_at > contact.last_contacted_at
        ):
            contact.last_contacted_at = interaction.occurred_at
            session.add(contact)

        session.commit()

        return {
            "received": True,
            "matched": True,
            "channel": "call",
            "call_status": call_status,
            "contact_id": str(contact.id),
            "interaction_id": str(interaction.id),
        }

    return {"received": True, "error": "Unknown Twilio event type"}



# ─── Twilio Helpers ────────────────────────────────────────────────────


def _compute_twilio_signature(url: str, params: dict[str, str], auth_token: str) -> str:
    """Compute the X-Twilio-Signature as Twilio does.

    Twilio v1: HMAC-SHA1 of (url + sorted params) using auth_token as key.
    """
    # Build the signature base string: URL + sorted key-value pairs
    sorted_params = sorted(params.items())
    signature_base = url + "".join(f"{k}{v}" for k, v in sorted_params)

    # Compute HMAC-SHA1
    mac = hmac.new(
        auth_token.encode("utf-8"),
        signature_base.encode("utf-8"),
        hashlib.sha1,
    )
    return mac.hexdigest()


def _verify_twilio_signature(
    request_url: str, params: dict[str, str], expected_sig: str, auth_token: str
) -> bool:
    """Verify X-Twilio-Signature header."""
    computed = _compute_twilio_signature(request_url, params, auth_token)
    return hmac.compare_digest(computed, expected_sig)


def _normalize_phone(raw: str, region: str = "US") -> str | None:
    """Normalize a raw phone number to E.164 format.

    Returns None if the number cannot be parsed.
    """
    try:
        parsed = phonenumbers.parse(raw, region=region)
        if not phonenumbers.is_valid_number(parsed):
            return None
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        return None


def _find_contact_by_phone(
    session: SessionDep, owner_id: uuid.UUID, e164_phone: str
) -> Contact | None:
    """Find a contact by E.164-normalized phone number."""
    # Look up contact by phone field with E.164 value
    field = session.exec(
        select(ContactField).where(
            ContactField.field_type == ContactFieldType.PHONE,
            ContactField.value == e164_phone,
        )
    ).first()

    if field:
        contact = session.get(Contact, field.contact_id)
        if contact and contact.owner_id == owner_id:
            return contact

    # Also try to find by matching with non-normalized numbers
    # (in case existing numbers aren't stored in E.164)
    all_phone_fields = session.exec(
        select(ContactField).where(
            ContactField.field_type == ContactFieldType.PHONE,
        )
    ).all()

    for pf in all_phone_fields:
        normalized = _normalize_phone(pf.value)
        if normalized == e164_phone:
            contact = session.get(Contact, pf.contact_id)
            if contact and contact.owner_id == owner_id:
                return contact

    return None


def _create_unknown_contact(
    session: SessionDep, owner_id: uuid.UUID, e164_phone: str
) -> Contact:
    """Create a minimal placeholder contact for an unknown phone number."""
    from app.crud import create_contact

    # Format display name as "Unknown (+1-415-555-2671)"
    display_phone = e164_phone.lstrip("+")
    display_phone = "-".join(
        [display_phone[:1], display_phone[1:4], display_phone[4:7], display_phone[7:]]
    )

    contact_in = ContactCreate(
        first_name=f"Unknown ({display_phone})",
        last_name="",
    )

    contact = create_contact(session=session, contact_in=contact_in, owner_id=owner_id)

    # Add the phone field
    phone_field = ContactField(
        contact_id=contact.id,
        field_type=ContactFieldType.PHONE,
        label="mobile",
        value=e164_phone,
        is_primary=True,
    )
    session.add(phone_field)
    session.commit()
    session.refresh(contact)

    return contact


def _check_rate_limit(
    redis: Redis, key: str, limit: int = 10, window: int = 60
) -> bool:
    """Check if rate limit is exceeded. Returns True if allowed.

    Args:
        redis: Redis client
        key: Rate limit key (e.g., "rate_limit:twilio:+14155552671")
        limit: Max requests per window
        window: Window in seconds

    Returns:
        True if request is allowed, False if rate limited
    """
    pipe = redis.pipeline()
    now = datetime.now(timezone.utc).timestamp()

    # Use sliding window with sorted set
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zcard(key)
    pipe.zadd(key, {str(now): now})
    pipe.expire(key, window)
    results = pipe.execute()

    count = results[1]  # Count after removing old entries
    return count < limit


@router.post("/twilio/{api_key}", response_model=WebhookEventResponse)
async def twilio_webhook(
    request: Request,
    session: SessionDep,
    redis: Redis = RedisDep,
    api_key: str = "",
) -> WebhookEventResponse | Response:
    """Twilio SMS and Call webhook handler.

    Verifies X-Twilio-Signature, normalizes phone numbers to E.164,
    matches to contacts, and creates Interaction records.

    For calls, this endpoint handles both initial webhook (CallSid + caller)
    and StatusCallback (call completion with duration).
    """
    # Find webhook by API key
    statement = select(WebhookEndpoint).where(WebhookEndpoint.api_key == api_key)
    webhook = session.exec(statement).first()

    if not webhook:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not webhook.is_active:
        raise HTTPException(status_code=410, detail="Webhook is inactive")

    # Get the request body for signature verification
    # Twilio sends form-encoded data, not JSON
    form_data = await request.form()
    params = dict(form_data)

    # Verify Twilio signature if secret is configured
    if webhook.secret:
        twilio_sig = request.headers.get("X-Twilio-Signature", "")
        if not twilio_sig:
            raise HTTPException(status_code=401, detail="Missing X-Twilio-Signature")

        # Get the full URL for signature verification
        # Use the original URL as Twilio signed it
        url = str(request.url)

        if not _verify_twilio_signature(url, params, twilio_sig, webhook.secret):
            raise HTTPException(status_code=401, detail="Invalid Twilio signature")

    owner_id = webhook.owner_id

    # Determine if this is SMS or Call
    message_sid = params.get("MessageSid")
    call_sid = params.get("CallSid")

    # Get phone numbers
    from_number = params.get("From", "")
    # to_number is not used currently but kept for future use if needed

    # Normalize phone numbers to E.164
    from_e164 = _normalize_phone(from_number) if from_number else None
    # to_number is not used currently but kept for future use if needed
    # to_e164 is not used currently but kept for future use if needed

    if not from_e164:
        return WebhookEventResponse(received=True, error="Could not parse From number")

    # Rate limiting per sender number
    rate_key = f"rate_limit:twilio:{from_e164}"
    if not _check_rate_limit(redis, rate_key, limit=10, window=60):
        return Response(status_code=429, content="Rate limited")

    # Find or create contact
    contact = _find_contact_by_phone(session, owner_id, from_e164)

    if not contact:
        # Create unknown contact
        contact = _create_unknown_contact(session, owner_id, from_e164)

    # Handle SMS
    if message_sid:
        body = params.get("Body", "")

        interaction = Interaction(
            owner_id=owner_id,
            channel=InteractionChannel.TEXT,
            occurred_at=datetime.now(timezone.utc),
            notes=f"SMS: {body}" if body else "SMS received",
        )
        session.add(interaction)
        session.flush()
        session.add(
            InteractionAttendee(interaction_id=interaction.id, contact_id=contact.id)
        )

        # Update last_contacted_at
        if (
            contact.last_contacted_at is None
            or interaction.occurred_at > contact.last_contacted_at
        ):
            contact.last_contacted_at = interaction.occurred_at
            session.add(contact)

        session.commit()

        return WebhookEventResponse(
            received=True,
            matched=True,
            channel="text",
            contact_id=str(contact.id),
            interaction_id=str(interaction.id),
        )

    # Handle Call
    if call_sid:
        call_status = params.get("CallStatus", "")

        # Check if this is a StatusCallback (call completed)
        is_status_callback = params.get(
            "CallbackSource"
        ) == "call-progress-events" or call_status in (
            "completed",
            "busy",
            "no-answer",
            "failed",
            "canceled",
        )

        # Get call duration if available (from StatusCallback)
        duration_seconds = params.get("CallDuration", "")
        duration_minutes = None
        if duration_seconds:
            try:
                duration_minutes = max(1, round(int(duration_seconds) / 60))
            except (ValueError, TypeError):
                pass

        # For initial call webhook (not StatusCallback), just log the call
        # For StatusCallback, update the existing interaction with duration
        if is_status_callback and duration_minutes:
            # Try to find existing call interaction by looking for recent calls with same CallSid
            # For simplicity, create a new interaction for the completed call
            notes = f"Call from {from_number}"
            if call_status:
                notes += f" (status: {call_status})"

            interaction = Interaction(
                owner_id=owner_id,
                channel=InteractionChannel.CALL,
                occurred_at=datetime.now(timezone.utc),
                notes=notes,
                duration_minutes=duration_minutes,
            )
        else:
            # Initial call webhook
            notes = f"Call from {from_number}"
            if call_status:
                notes += f" (status: {call_status})"

            interaction = Interaction(
                owner_id=owner_id,
                channel=InteractionChannel.CALL,
                occurred_at=datetime.now(timezone.utc),
                notes=notes,
            )

        session.add(interaction)
        session.flush()
        session.add(
            InteractionAttendee(interaction_id=interaction.id, contact_id=contact.id)
        )

        # Update last_contacted_at
        if (
            contact.last_contacted_at is None
            or interaction.occurred_at > contact.last_contacted_at
        ):
            contact.last_contacted_at = interaction.occurred_at
            session.add(contact)

        session.commit()

        return WebhookEventResponse(
            received=True,
            matched=True,
            channel="call",
            call_status=call_status,
            contact_id=str(contact.id),
            interaction_id=str(interaction.id),
        )

    return WebhookEventResponse(received=True, error="Unknown Twilio event type")


@router.get("/", response_model=WebhookEndpointsPublic)
def list_webhooks(
    session: SessionDep,
    current_user: CurrentUser,
) -> WebhookEndpointsPublic:
    """List all webhook endpoints for the user."""
    statement = select(WebhookEndpoint).where(
        WebhookEndpoint.owner_id == current_user.id
    )
    webhooks = session.exec(statement).all()

    return WebhookEndpointsPublic(
        data=[
            WebhookEndpointPublic(
                id=str(w.id),
                name=w.name,
                url=w.url,
                direction=w.direction,
                event_types=w.event_types,
                is_active=w.is_active,
                created_at=w.created_at.isoformat(),
            )
            for w in webhooks
        ],
        count=len(webhooks),
    )


@router.post("/", response_model=WebhookEndpointCreated)
def create_webhook(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    webhook_in: WebhookEndpointBase,
) -> WebhookEndpointCreated:
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

    return WebhookEndpointCreated(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        direction=webhook.direction,
        event_types=webhook.event_types,
        api_key=api_key,
        is_active=webhook.is_active,
        created_at=webhook.created_at.isoformat(),
    )


@router.patch("/{webhook_id}", response_model=WebhookEndpointPublic)
def update_webhook(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    webhook_id: uuid.UUID,
    webhook_in: WebhookEndpointBase,
) -> WebhookEndpointPublic:
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

    return WebhookEndpointPublic(
        id=str(webhook.id),
        name=webhook.name,
        url=webhook.url,
        direction=webhook.direction,
        event_types=webhook.event_types,
        is_active=webhook.is_active,
        created_at=webhook.created_at.isoformat(),
    )


@router.delete("/{webhook_id}", response_model=Ok)
def delete_webhook(
    session: SessionDep,
    current_user: CurrentUser,
    webhook_id: uuid.UUID,
) -> Ok:
    """Delete a webhook endpoint."""
    webhook = session.get(WebhookEndpoint, webhook_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    if webhook.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(webhook)
    session.commit()
    return Ok()


@router.post("/inbound/{api_key}", response_model=WebhookEventResponse)
async def inbound_webhook(
    session: SessionDep,
    api_key: str,
    payload: dict[str, Any],
) -> WebhookEventResponse:
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
        return WebhookEventResponse(
            received=True,
            matched=False,
            error="No matching contact found",
        )

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
        owner_id=owner_id,
        channel=channel_enum,
        occurred_at=occurred_at,
        notes=payload.get("notes"),
    )
    session.add(interaction)
    session.flush()
    session.add(
        InteractionAttendee(interaction_id=interaction.id, contact_id=contact.id)
    )

    # Update last_contacted_at
    if (
        contact.last_contacted_at is None
        or occurred_at > contact.last_contacted_at
    ):
        contact.last_contacted_at = occurred_at
        session.add(contact)

    session.commit()

    return WebhookEventResponse(
        received=True,
        matched=True,
        contact_id=str(contact.id),
        interaction_id=str(interaction.id),
    )
