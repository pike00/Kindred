"""Email ingestion service supporting Gmail API (OAuth) and IMAP fallback.

Privacy-first: Only stores Message-ID, From, To, Date, Subject headers.
Never stores email body or attachments.
"""

import email
import imaplib
import logging
import ssl
from datetime import datetime, timezone
from email.header import decode_header
from typing import Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from sqlalchemy import func, select
from sqlmodel import Session

from app.core.config import settings
from app.core.encryption import decrypt_token
from app.models import (
    Contact,
    ContactField,
    ContactFieldType,
    EmailOAuthToken,
    Interaction,
    InteractionChannel,
)

logger = logging.getLogger(__name__)

# Gmail API scopes
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# OAuth2 redirect URI
OAUTH_REDIRECT_URI = f"{settings.SERVER_HOST}/api/v1/email/oauth/callback"


def get_gmail_auth_url(state: str) -> tuple[str, str]:
    """Generate Gmail OAuth2 authorization URL.

    Returns:
        tuple: (authorization_url, state)
    """
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=GMAIL_SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",  # Force consent to get refresh_token
        state=state,
    )
    return auth_url, state


def exchange_gmail_code(code: str) -> dict[str, Any]:
    """Exchange OAuth authorization code for tokens.

    Returns:
        dict: Contains access_token, refresh_token, token_expires_at
    """
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=GMAIL_SCOPES,
        redirect_uri=OAUTH_REDIRECT_URI,
    )
    flow.fetch_token(code=code)

    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_expires_at": (
            creds.expiry.replace(tzinfo=timezone.utc) if creds.expiry else None
        ),
    }


def get_gmail_credentials(token_row: EmailOAuthToken) -> Credentials | None:
    """Build Gmail API credentials from stored (encrypted) tokens."""
    try:
        access_token = decrypt_token(token_row.encrypted_access_token)
        refresh_token = (
            decrypt_token(token_row.encrypted_refresh_token)
            if token_row.encrypted_refresh_token
            else None
        )
    except ValueError as e:
        logger.error(f"Failed to decrypt tokens for {token_row.email_address}: {e}")
        return None

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GMAIL_CLIENT_ID,
        client_secret=settings.GMAIL_CLIENT_SECRET,
        scopes=GMAIL_SCOPES,
    )

    # Refresh if expired
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            # Update stored tokens
            return creds
        except Exception as e:
            logger.error(f"Failed to refresh token for {token_row.email_address}: {e}")
            return None

    return creds


def decode_email_header(header_val: str | None) -> str:
    """Decode email header value, handling RFC 2047 encoded words."""
    if not header_val:
        return ""
    decoded_parts = []
    for part, charset in decode_header(header_val):
        if isinstance(part, bytes):
            decoded_parts.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded_parts.append(str(part))
    return " ".join(decoded_parts).strip()


def parse_email_addresses(header_val: str | None) -> list[str]:
    """Parse email addresses from a header value, returning list of lowercase emails."""
    if not header_val:
        return []
    addresses = []
    # Simple regex-based parser for email addresses
    import re

    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    found = re.findall(email_pattern, header_val)
    addresses.extend(addr.lower() for addr in found)
    return addresses


def fetch_gmail_messages(
    creds: Credentials, max_results: int = 50
) -> list[dict[str, Any]]:
    """Fetch recent messages from Gmail API.

    Returns list of dicts with: message_id, from, to, subject, date
    """
    try:
        from googleapiclient.discovery import build

        service = build("gmail", "v1", credentials=creds)

        # List recent messages
        result = (
            service.users()
            .messages()
            .list(userId="me", maxResults=max_results, q="in:inbox OR in:sent")
            .execute()
        )
        messages = result.get("messages", [])

        parsed = []
        for msg in messages:
            msg_data = (
                service.users()
                .messages()
                .get(userId="me", id=msg["id"], format="metadata")
                .execute()
            )

            headers = {
                h["name"].lower(): h["value"]
                for h in msg_data.get("payload", {}).get("headers", [])
            }

            parsed.append(
                {
                    "message_id": headers.get("message-id", ""),
                    "from": decode_email_header(headers.get("from", "")),
                    "to": decode_email_header(headers.get("to", "")),
                    "subject": decode_email_header(headers.get("subject", "")),
                    "date": headers.get("date", ""),
                    "thread_id": msg_data.get("threadId", ""),
                }
            )

        return parsed
    except Exception as e:
        logger.error(f"Failed to fetch Gmail messages: {e}")
        return []


def fetch_imap_messages(
    host: str,
    username: str,
    password: str,
    port: int = 993,
    use_ssl: bool = True,
    max_results: int = 50,
) -> list[dict[str, Any]]:
    """Fetch recent messages via IMAP.

    Returns list of dicts with: message_id, from, to, subject, date
    """
    try:
        if use_ssl:
            context = ssl.create_default_context()
            imap = imaplib.IMAP4_SSL(host, port, ssl_context=context)
        else:
            imap = imaplib.IMAP4(host, port)

        imap.login(username, password)
        imap.select("INBOX")

        # Search for recent messages
        status, messages = imap.search(None, "ALL")
        if status != "OK":
            return []

        msg_ids = messages[0].split()
        # Get the last max_results messages
        recent_ids = msg_ids[-max_results:]

        parsed = []
        for msg_id in recent_ids:
            status, msg_data = imap.fetch(msg_id, "(RFC822)")
            if status != "OK":
                continue

            raw_email = msg_data[0][1]
            if isinstance(raw_email, bytes):
                msg = email.message_from_bytes(raw_email)
            else:
                msg = email.message_from_string(str(raw_email))

            parsed.append(
                {
                    "message_id": msg.get("Message-ID", ""),
                    "from": decode_email_header(msg.get("From", "")),
                    "to": decode_email_header(msg.get("To", "")),
                    "subject": decode_email_header(msg.get("Subject", "")),
                    "date": msg.get("Date", ""),
                    "thread_id": "",
                }
            )

        imap.logout()
        return parsed
    except Exception as e:
        logger.error(f"Failed to fetch IMAP messages for {username}: {e}")
        return []


def find_contact_by_email(
    session: Session, owner_id: uuid.UUID, email_address: str
) -> Contact | None:
    """Find a contact by matching email address in ContactField.

    Returns the first matching Contact, or None.
    """
    stmt = (
        select(Contact)
        .join(ContactField)
        .where(
            Contact.owner_id == owner_id,
            ContactField.field_type == ContactFieldType.EMAIL,
            func.lower(ContactField.value) == email_address.lower(),
        )
        .limit(1)
    )
    return session.exec(stmt).first()


def find_contacts_for_message(
    session: Session, owner_id: uuid.UUID, from_header: str, to_header: str
) -> list[Contact]:
    """Find all contacts referenced in an email message.

    Checks both From and To headers against ContactField email values.
    Returns list of matching Contacts.
    """
    from_addrs = parse_email_addresses(from_header)
    to_addrs = parse_email_addresses(to_header)
    all_addrs = set(from_addrs + to_addrs)

    if not all_addrs:
        return []

    # Find contacts with matching email addresses
    stmt = (
        select(Contact)
        .join(ContactField)
        .where(
            Contact.owner_id == owner_id,
            ContactField.field_type == ContactFieldType.EMAIL,
            func.lower(ContactField.value).in_([addr.lower() for addr in all_addrs]),
        )
        .distinct()
    )
    return list(session.exec(stmt).all())


def parse_email_date(date_str: str) -> datetime | None:
    """Parse email date string to datetime."""
    if not date_str:
        return None
    try:
        from email.utils import parsedate_to_datetime

        return parsedate_to_datetime(date_str).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def interaction_exists(
    session: Session, contact_id: uuid.UUID, message_id: str
) -> bool:
    """Check if an interaction with this Message-ID already exists for the contact."""
    if not message_id:
        return False
    stmt = select(Interaction).where(
        Interaction.contact_id == contact_id,
        Interaction.message_id == message_id,
    )
    return session.exec(stmt).first() is not None


def create_interaction_from_email(
    session: Session,
    owner_id: uuid.UUID,
    contact: Contact,
    email_data: dict[str, Any],
) -> Interaction | None:
    """Create an Interaction record from parsed email data.

    Returns the created Interaction, or None if deduplicated.
    """
    message_id = email_data.get("message_id", "")
    if message_id and interaction_exists(session, contact.id, message_id):
        logger.debug(
            f"Skipping duplicate message {message_id} for contact {contact.id}"
        )
        return None

    occurred_at = parse_email_date(email_data.get("date"))
    if not occurred_at:
        occurred_at = datetime.now(timezone.utc)

    interaction = Interaction(
        owner_id=owner_id,
        channel=InteractionChannel.EMAIL,
        occurred_at=occurred_at,
        notes=f"Email: {email_data.get('subject', '(no subject)')}",
        message_id=message_id,
        email_subject=email_data.get("subject", ""),
        email_from=email_data.get("from", ""),
        email_to=email_data.get("to", ""),
        email_date=occurred_at,
    )
    session.add(interaction)
    session.flush()  # Get the ID

    # Add attendee
    from app.models import InteractionAttendee

    session.add(
        InteractionAttendee(
            interaction_id=interaction.id,
            contact_id=contact.id,
        )
    )

    # Update contact's last_contacted_at
    if contact.last_contacted_at is None or occurred_at > contact.last_contacted_at:
        contact.last_contacted_at = occurred_at
        session.add(contact)

    session.commit()
    session.refresh(interaction)
    return interaction


def process_email_for_contact(
    session: Session,
    owner_id: uuid.UUID,
    token_row: EmailOAuthToken,
) -> int:
    """Process emails for a contact with OAuth token.

    Returns count of new interactions created.
    """
    if token_row.provider == "gmail":
        return _process_gmail(session, owner_id, token_row)
    else:
        # IMAP or other providers
        logger.warning(f"Unsupported provider: {token_row.provider}")
        return 0


def _process_gmail(
    session: Session,
    owner_id: uuid.UUID,
    token_row: EmailOAuthToken,
) -> int:
    """Process Gmail messages for a contact."""
    creds = get_gmail_credentials(token_row)
    if not creds:
        return 0

    # Update stored tokens if refreshed
    if creds.token:
        try:
            from app.crud import update_email_oauth_token

            update_email_oauth_token(
                session=session,
                token_id=token_row.id,
                access_token=creds.token,
                refresh_token=creds.refresh_token,
                expires_at=creds.expiry.replace(tzinfo=timezone.utc)
                if creds.expiry
                else None,
            )
        except Exception as e:
            logger.warning(
                f"Failed to update tokens for {token_row.email_address}: {e}"
            )

    messages = fetch_gmail_messages(creds, max_results=50)
    return _process_messages(session, owner_id, messages)


def _process_messages(
    session: Session,
    owner_id: uuid.UUID,
    messages: list[dict[str, Any]],
) -> int:
    """Process parsed email messages and create interactions."""
    created_count = 0
    for msg_data in messages:
        contacts = find_contacts_for_message(
            session,
            owner_id,
            msg_data.get("from", ""),
            msg_data.get("to", ""),
        )
        for contact in contacts:
            if not contact.auto_log_email:
                continue
            interaction = create_interaction_from_email(
                session, owner_id, contact, msg_data
            )
            if interaction:
                created_count += 1
    return created_count


def poll_all_email_accounts(session: Session) -> dict[str, int]:
    """Poll all configured email accounts and create interactions.

    Returns dict with stats: {contact_id: new_interactions_count}
    """
    # Get all contacts with auto_log_email=True
    contacts_with_email = session.exec(
        select(Contact)
        .join(ContactField)
        .where(
            Contact.auto_log_email.is_(True),
            ContactField.field_type == ContactFieldType.EMAIL,
        )
        .distinct()
    ).all()

    results = {}
    for contact in contacts_with_email:
        # Find OAuth token for this contact's email
        email_fields = session.exec(
            select(ContactField).where(
                ContactField.contact_id == contact.id,
                ContactField.field_type == ContactFieldType.EMAIL,
            )
        ).all()

        for email_field in email_fields:
            token_row = session.exec(
                select(EmailOAuthToken).where(
                    EmailOAuthToken.contact_id == contact.id,
                    EmailOAuthToken.email_address == email_field.value,
                )
            ).first()

            if token_row:
                count = process_email_for_contact(session, contact.owner_id, token_row)
                if count > 0:
                    results[str(contact.id)] = results.get(str(contact.id), 0) + count

    return results
