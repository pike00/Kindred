---
title: Email Log Ingestion
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Design OAuth token storage schema and migrations
---

# Email Log Ingestion

## Goal
Poll Gmail or IMAP inboxes for messages to/from known contacts; automatically create `Interaction` records with `channel=EMAIL` for contacts that have email log ingestion enabled. Store only message headers and subject (not body) to preserve privacy; deduplicate via RFC 2822 Message-ID.

## Tasks
- [ ] Design Contact schema migration: add `auto_log_email` boolean flag (default false)
- [ ] Implement Gmail OAuth 2.0 flow: authorization, token exchange, token refresh
- [ ] OAuth token storage: design encrypted storage in database (or SOPS vault); decide per-contact or per-user
- [ ] Implement IMAP idle fallback for accounts without Gmail API access
- [ ] Match messages to contacts by email address (handle multiple email addresses per contact)
- [ ] Auto-create Interaction records: extract headers, parse sender/recipient, create with `channel=EMAIL`
- [ ] Implement Message-ID deduplication to prevent duplicate interactions
- [ ] Polling worker: decide between APScheduler container or cron job; implement refresh logic
- [ ] Integration with interaction drafts feature (optional future): allow editing before auto-log

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Privacy-first headers storage**: Store only `Message-ID`, `From`, `To`, `Date`, `Subject` and minimal metadata. Never store message body or attachments to protect email content.

- **Message-ID deduplication**: RFC 2822 Message-ID is globally unique per message; use as natural dedup key. Index on `(contact_id, message_id)` to detect already-logged interactions.

- **Scheduler choice**: Docker container with Alpine `crond` or a dedicated polling worker (APScheduler in backend). Alpine approach is lighter; APScheduler keeps polling logic in-process. See CLAUDE.md feedback on Docker scheduling preferences.

- **OAuth token security**: Store refresh tokens encrypted at rest in the database (with a key from SOPS or AWS KMS) or in the SOPS vault directly. Never commit plaintext tokens. Plan rotation strategy for expired access tokens.

- **Per-contact flag**: `auto_log_email` boolean on Contact model gates ingestion. Only contacts with the flag set are monitored. User can selectively enable for frequent correspondents, exclude accounts (e.g., support tickets) where auto-logging noise is high.

- **Email address matching**: ContactField with `field_type=EMAIL` stores multiple addresses per contact. IMAP/Gmail sender/recipient parsing must match against all known addresses for a contact to correctly route to the owner.

- **Future pairing**: Interaction drafts feature (planned) would allow manual review/editing before finalizing auto-logged interactions; useful for adding mood/duration/notes. Start with auto-create; drafts are enhancement.

## References

- [models.py](../../../backend/app/models.py) - Contact, Interaction, InteractionChannel enum, ContactField
- InteractionChannel values: CALL, IN_PERSON, TEXT, EMAIL, VIDEO, SOCIAL, OTHER
