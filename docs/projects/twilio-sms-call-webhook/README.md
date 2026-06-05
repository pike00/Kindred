---
title: Twilio SMS / Call Webhook
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Implement X-Twilio-Signature verification in webhook handler
---

# Twilio SMS / Call Webhook

## Goal
Auto-log inbound SMS and call activity from Twilio provider numbers as `Interaction(channel=TEXT|CALL)` rows, matched against existing contacts by E.164-normalized phone number. Enable seamless CRM touchpoint tracking without manual entry.

## Tasks
- [ ] Implement X-Twilio-Signature verification for webhook authenticity
- [ ] Add E.164 normalization index on Contact.phone fields (via ContactField)
- [ ] Implement phone-to-contact matching with graceful fallback for unknown numbers
- [ ] Add StatusCallback support for call completion tracking
- [ ] Wire Interaction draft creation on match with timestamp normalization
- [ ] Add rate limiting to webhook endpoint (per-sender basis)

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

## Notes

- **Signature verification is mandatory** — Always validate X-Twilio-Signature header using the shared auth token (stored in `WebhookEndpoint.secret`) and request body. Prevents spoofed payloads.

- **E.164 phone normalization** — Use the `phonenumbers` Python library to normalize incoming caller/recipient numbers to E.164 format (`+14155552671`). Build a query index on normalized contact phone values in `ContactField` for reliable matching.

- **Unknown-number handling** — When an inbound SMS/call arrives from a phone not in the contact list: create a minimal placeholder contact with auto-generated display name (e.g. `Unknown (+1-415-555-2671)`), or drop the interaction entirely. Decision depends on UX preference for inbox management.

- **StatusCallback for calls** — Twilio call webhooks arrive twice: initial CallSid + incoming caller, then StatusCallback on hangup with call duration + final status. Capture duration_minutes from the callback payload for accurate Interaction.duration_minutes.

- **Rate limiting** — Prevent abuse by throttling requests from the same sender number (e.g. 10 per minute). Use Redis or in-memory backoff; silently drop or 429 on excess.

- **Schema coupling** — `WebhookEndpoint` model already exists with `direction`, `event_types`, `secret`, and `api_key` fields (see [models.py](../../../backend/app/models.py)). `Interaction` model supports `channel=(CALL|TEXT)`, `occurred_at`, `notes`, `mood`, and `duration_minutes`.
