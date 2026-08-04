---
title: CardDAV Server Mode
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Implement PROPFIND and REPORT WebDAV endpoints; wire vcard serializer to Contact.vcard_raw
---

# CardDAV Server Mode

## Goal
Expose a standards-compliant CardDAV endpoint at `/carddav/{user}/contacts/` so that iOS, macOS Contacts, and other CardDAV clients (DAVx5, Gnome Evolution) can sync contacts bidirectionally. The Contact model already has `vcard_raw` (raw vCard 3.0 text) and `vcard_etag` (sync token) columns to support round-trip fidelity and incremental synchronization.

## Tasks
- [ ] Implement WebDAV PROPFIND handler for collection discovery
- [ ] Implement WebDAV REPORT (addressdata) handler for batch contact fetch with ETag
- [ ] Implement WebDAV PUT handler for contact creation and update with vcard parsing
- [ ] Implement WebDAV DELETE handler for contact removal
- [ ] Build vcard serializer aligned with Contact fields (name, email, phone, organization, notes, avatar_url, etc.)
- [ ] Wire ETag invalidation (SHA-256 or similar hash of vcard_raw on every update)
- [ ] Add HTTP Basic Auth (or bearer token) guard on CardDAV routes
- [ ] Test bidirectional sync with macOS Contacts and/or DAVx5
- [ ] Document Apple client compatibility and any quirks

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

### 2026-04-23
- Created project README and handoffs directory.

## Notes
- **vcard columns already present:** Contact model in [models.py](../../../backend/app/models.py) has `vcard_raw` (stores raw vCard 3.0 text) and `vcard_etag` (up to 255 chars, typically a hash) to support CardDAV round-trip without data loss.
- **vcard hash verification + provenance:** When clients PUT a modified vcard, parse it, update Contact fields, then re-serialize and hash to `vcard_etag` so the ETag changes only when content changes (idempotence + conflict detection).
- **WebDAV XML namespaces:** CardDAV uses RFC 4791 (DAV:, CARDDAV:, RFC 2426 vCard) for PROPFIND and REPORT responses. SyncCollection REPORT is optional but recommended for incremental sync (sync-token tracking).
- **Testing approach:** Use macOS Contacts (built-in) or DAVx5 (Android) to pair with the endpoint. Both are strict about HTTP/HTTPS and XML namespace compliance; any deviation breaks discovery.
- **HTTPS requirement:** Apple Contacts may refuse plain HTTP; consider deploying behind a reverse proxy with TLS or wire HTTP for localhost testing only.
- **Avatar handling:** Store avatar_url as a URL or data: URI in vcard; CardDAV clients may fetch images separately via PHOTO property.
