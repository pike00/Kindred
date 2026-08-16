---
title: TagShare Scope Warning
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Implement /api/tags/{tag_id}/share-preview endpoint to count rows by entity type
---

# TagShare Scope Warning

## Goal

When sharing a tag with another user via TagShare, the grantee gains read access to every contact bearing that tag plus all related rows (interactions, notes, gifts, debts, etc.). The current grant modal provides no preview of the scope. Add a scope-warning modal that fetches a preview breakdown and displays counts by entity type, plus sample contact names, so the granter can see exactly what they're about to share before confirming.

## Tasks

- [ ] Backend: Implement `/api/tags/{tag_id}/share-preview` endpoint (counts per entity type: Contact | Interaction | Note | ContactField | Address | Gift | Debt | Reminder | LifeEvent | MediaRecommendation | Relationship | Pet)
- [ ] Frontend: Fetch and display preview in grant modal, showing entity type | count as a table with sample contact names (first 3)
- [ ] Frontend: Add typed confirmation (radio button: "I understand I'm sharing X contacts and Y related rows")
- [ ] Backend: Wire in audit log entry on TagShare creation with grantee email and row counts
- [ ] Frontend: Implement revoke-share UI (DELETE /api/tag-shares/{tag_id}/{grantee_id})
- [ ] Testing: Cover edge cases (empty tag, multiple contacts, tag with no nested rows)

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.
- Schema analyzed: TagShare is junction table (tag_id + grantee_id compound PK), grants read access to contacts + all related rows.

## Notes

- **Scope includes:** All rows where contact_id matches a Contact in the tag. This includes Interactions, Notes, ContactFields, Addresses, Gifts, Debts, Reminders, LifeEvents, MediaRecommendations, Pets (child contacts), and Relationships where contact_id is the tagged contact (unidirectional).
- **Preview caching:** Counts should be computed on-demand; brief caching (30s) acceptable if POST /api/tags/{tag_id}/share endpoint is slow. Consider indexed query on contact_id + owner_id to avoid full scans.
- **Revoke flow:** DELETE endpoint should log removal event (audit log feature TBD).
- **Audit log:** When share is granted or revoked, emit an audit log entry (AuditLog model not yet in schema; design TBD) recording grantee email, counts snapshot, and timestamp.
- **UI table:** Entity type | Count columns; sort by count descending. Show "1 contact: Alice Chen, Bob Zhang, ..." as sample row.
- **Confirmation:** Modal step-through: (1) select grantee, (2) preview counts + typed confirmation, (3) confirm or cancel.
