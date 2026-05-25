"""Tests for Twilio SMS/Call webhook endpoint."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select


@pytest.fixture
def api_key_headers(superuser_token_headers: dict[str, str]) -> dict[str, str]:
    return superuser_token_headers


@pytest.fixture
def twilio_webhook_data_sms():
    """Sample Twilio SMS webhook payload."""
    return {
        "MessageSid": "SM1234567890",
        "From": "+14155552671",
        "To": "+18005551234",
        "Body": "Hello, this is a test message",
        "AccountSid": "AC1234567890",
    }


@pytest.fixture
def twilio_webhook_data_call():
    """Sample Twilio Call webhook payload."""
    return {
        "CallSid": "CA1234567890",
        "From": "+14155552671",
        "To": "+18005551234",
        "CallStatus": "in-progress",
        "AccountSid": "AC1234567890",
    }


@pytest.fixture
def twilio_webhook_data_call_completed():
    """Sample Twilio Call StatusCallback payload."""
    return {
        "CallSid": "CA1234567890",
        "From": "+14155552671",
        "To": "+18005551234",
        "CallStatus": "completed",
        "CallDuration": "120",
        "CallbackSource": "call-progress-events",
        "AccountSid": "AC1234567890",
    }


class TestTwilioWebhook:
    """Test Twilio webhook endpoint."""

    def test_sms_webhook_creates_interaction(
        self, client: TestClient, db: Session, api_key_headers
    ):
        """Test that SMS webhook creates an Interaction with TEXT channel."""
        # First, create a webhook endpoint
        webhook_data = {
            "name": "Twilio Test",
            "direction": "inbound",
            "secret": "test_auth_token",
        }
        response = client.post(
            "/api/v1/webhooks/",
            json=webhook_data,
            headers=api_key_headers,
        )
        assert response.status_code == 200
        webhook_data = response.json()
        api_key = webhook_data["api_key"]

        # Create a contact with the phone number
        from app.models import Contact, ContactField, ContactFieldType, WebhookEndpoint

        webhook_obj = db.get(WebhookEndpoint, webhook_data["id"])
        user_id = webhook_obj.owner_id
        contact = Contact(first_name="John", last_name="Doe", owner_id=user_id)
        db.add(contact)
        db.commit()
        db.refresh(contact)

        phone_field = ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.PHONE,
            label="mobile",
            value="+14155552671",
            is_primary=True,
        )
        db.add(phone_field)
        db.commit()

        # Now send SMS webhook
        sms_data = {
            "MessageSid": "SM1234567890",
            "From": "+14155552671",
            "To": "+18005551234",
            "Body": "Hello, this is a test message",
        }

        # Calculate Twilio signature
        from app.api.routes.webhooks import _compute_twilio_signature

        url = f"http://testserver/api/v1/webhooks/twilio/{api_key}"
        signature = _compute_twilio_signature(url, sms_data, "test_auth_token")

        response = client.post(
            f"/api/v1/webhooks/twilio/{api_key}",
            data=sms_data,
            headers={"X-Twilio-Signature": signature},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["received"] is True
        assert data["matched"] is True
        assert data["channel"] == "text"

    def test_call_webhook_creates_interaction(
        self, client: TestClient, db: Session, api_key_headers
    ):
        """Test that Call webhook creates an Interaction with CALL channel."""
        # Create webhook endpoint
        webhook_data = {
            "name": "Twilio Call Test",
            "direction": "inbound",
            "secret": "test_auth_token",
        }
        response = client.post(
            "/api/v1/webhooks/",
            json=webhook_data,
            headers=api_key_headers,
        )
        assert response.status_code == 200
        webhook_data = response.json()
        api_key = webhook_data["api_key"]

        # Create a contact with the phone number
        from app.models import Contact, ContactField, ContactFieldType, WebhookEndpoint

        webhook_obj = db.get(WebhookEndpoint, webhook_data["id"])
        user_id = webhook_obj.owner_id
        contact = Contact(first_name="Jane", last_name="Doe", owner_id=user_id)
        db.add(contact)
        db.commit()
        db.refresh(contact)

        phone_field = ContactField(
            contact_id=contact.id,
            field_type=ContactFieldType.PHONE,
            label="mobile",
            value="+14155552671",
            is_primary=True,
        )
        db.add(phone_field)
        db.commit()

        # Send Call webhook
        call_data = {
            "CallSid": "CA1234567890",
            "From": "+14155552671",
            "To": "+18005551234",
            "CallStatus": "in-progress",
        }

        from app.api.routes.webhooks import _compute_twilio_signature

        url = f"http://testserver/api/v1/webhooks/twilio/{api_key}"
        signature = _compute_twilio_signature(url, call_data, "test_auth_token")

        response = client.post(
            f"/api/v1/webhooks/twilio/{api_key}",
            data=call_data,
            headers={"X-Twilio-Signature": signature},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["received"] is True
        assert data["matched"] is True
        assert data["channel"] == "call"

    def test_invalid_signature_rejected(
        self, client: TestClient, db: Session, api_key_headers
    ):
        """Test that invalid Twilio signature is rejected."""
        # Create webhook endpoint
        webhook_data = {
            "name": "Twilio Signature Test",
            "direction": "inbound",
            "secret": "test_auth_token",
        }
        response = client.post(
            "/api/v1/webhooks/",
            json=webhook_data,
            headers=api_key_headers,
        )
        assert response.status_code == 200
        webhook_data = response.json()
        api_key = webhook_data["api_key"]

        # Send webhook with invalid signature
        sms_data = {
            "MessageSid": "SM1234567890",
            "From": "+14155552671",
            "Body": "Test",
        }

        response = client.post(
            f"/api/v1/webhooks/twilio/{api_key}",
            data=sms_data,
            headers={"X-Twilio-Signature": "invalid_signature"},
        )

        assert response.status_code == 401
        assert "Invalid Twilio signature" in response.json()["detail"]

    def test_unknown_number_creates_placeholder_contact(
        self, client: TestClient, db: Session, api_key_headers
    ):
        """Test that unknown phone number creates a placeholder contact."""
        # Create webhook endpoint
        webhook_data = {
            "name": "Twilio Unknown Test",
            "direction": "inbound",
            "secret": "test_auth_token",
        }
        response = client.post(
            "/api/v1/webhooks/",
            json=webhook_data,
            headers=api_key_headers,
        )
        assert response.status_code == 200
        webhook_data = response.json()
        api_key = webhook_data["api_key"]

        # Send SMS from unknown number
        sms_data = {
            "MessageSid": "SM1234567890",
            "From": "+12025550123",  # Unknown number (valid NANP format)
            "To": "+18005551234",
            "Body": "Hello from unknown",
        }

        from app.api.routes.webhooks import _compute_twilio_signature

        url = f"http://testserver/api/v1/webhooks/twilio/{api_key}"
        signature = _compute_twilio_signature(url, sms_data, "test_auth_token")

        response = client.post(
            f"/api/v1/webhooks/twilio/{api_key}",
            data=sms_data,
            headers={"X-Twilio-Signature": signature},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["received"] is True
        assert data["matched"] is True

        # Verify a contact was created
        from app.models import Contact

        contacts = db.exec(select(Contact)).all()
        assert len(contacts) > 0

    def test_phone_normalization(
        self, client: TestClient, db: Session, api_key_headers
    ):
        """Test that phone numbers are normalized to E.164 format."""
        from app.api.routes.webhooks import _normalize_phone

        # Test various formats
        assert _normalize_phone("(415) 555-2671") == "+14155552671"
        assert _normalize_phone("415-555-2671") == "+14155552671"
        assert _normalize_phone("+1-415-555-2671") == "+14155552671"
        assert _normalize_phone("+14155552671") == "+14155552671"
        assert _normalize_phone("invalid") is None

    def test_rate_limiting(self, client: TestClient, db: Session, api_key_headers):
        """Test that rate limiting works for webhook endpoint."""
        # Create webhook endpoint
        webhook_data = {
            "name": "Twilio Rate Limit Test",
            "direction": "inbound",
            "secret": "test_auth_token",
        }
        response = client.post(
            "/api/v1/webhooks/",
            json=webhook_data,
            headers=api_key_headers,
        )
        assert response.status_code == 200
        webhook_data = response.json()
        api_key = webhook_data["api_key"]

        # Mock Redis to simulate rate limit exceeded
        with patch("app.api.routes.webhooks.Redis") as mock_redis_class:
            mock_redis = MagicMock()
            mock_redis_class.from_url.return_value = mock_redis
            # Simulate rate limit exceeded (count >= limit)
            mock_redis.pipeline.return_value.execute.return_value = [
                None,
                10,
                None,
                None,
            ]

            sms_data = {
                "MessageSid": "SM1234567890",
                "From": "+14155552671",
                "Body": "Test",
            }

            from app.api.routes.webhooks import _compute_twilio_signature

            url = f"http://testserver/api/v1/webhooks/twilio/{api_key}"
            signature = _compute_twilio_signature(url, sms_data, "test_auth_token")

            response = client.post(
                f"/api/v1/webhooks/twilio/{api_key}",
                data=sms_data,
                headers={"X-Twilio-Signature": signature},
            )

            assert response.status_code == 429
