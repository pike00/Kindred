---
title: Audit Log for Shared Data
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Design activity_log table schema and implement service layer
---

# Audit Log for Shared Data

## Goal
Track edits to shared rows in personal-crm with owner and actor identity. Any user who has access to a tag via TagShare can query the activity log for that tag's contacts and related entities, seeing what was changed, by whom, and when.

## Tasks
- [ ] Design activity_log table schema (owner_id, actor_id, entity_type, entity_id, action, changes_json, occurred_at)
- [ ] Create Alembic migration for activity_log table
- [ ] Implement activity log service layer (insert, query by tag scope)
- [ ] Wire SQLAlchemy event listeners or explicit service calls to log mutations
- [ ] Build read API endpoint scoped via TagShare (GET /activity-logs?tag_id=...)
- [ ] Add PII redaction for sensitive fields in changes_json
- [ ] Document retention policy and archival strategy

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- README drafted with accurate schema references and design notes.

## Notes

- **TagShare model** ([models.py](../../../backend/app/models.py#L238)): Links a tag and a grantee user; includes created_at. Rows are the authorization boundary for audit log visibility.

- **Scope via TagShare**: To read activity for a Contact, the querying user must either own the contact or have a TagShare row where grantee_id = current_user and the contact is tagged with that tag. Activity log queries join through tag membership.

- **Event logging approach**: Two options:
  1. SQLAlchemy event listeners on Contact, Interaction, Note, etc. (auto-fires but couples event listener to models)
  2. Explicit service layer calls in mutation endpoints (manual but clearer, scoped to API layer)
  Recommend explicit calls for transparency; event listeners can be added later if auditing deeper mutations (e.g., Contact.updated_at bump from interaction insert).

- **changes_json shape**: Store as JSON diff, not full snapshot. For PATCH /contacts/{id}, record {"first_name": {"old": "Alice", "new": "Alicia"}}. Snapshot approach is simpler but larger storage footprint.

- **PII redaction**: Contacts may hold sensitive data. Activity logs shown to grantees reveal who edited what. Consider redacting or masking certain fields (e.g., birthday, how_we_met, addresses) in changes_json before returning to grantees, or store redacted by default.

- **Retention policy**: No retention logic yet. Options: TTL on activity_log rows, archival to cold storage after N months, or indefinite retention with optional filtering.

- **Entities to audit**: Contact (create, update, delete), Interaction (create, update, delete), Note (create, update, delete), potentially ContactField, Address, Relationship, Gift, Debt, LifeEvent, MediaRecommendation. Start with Contact/Interaction/Note.

- **Actor vs. Owner distinction**: owner_id identifies the Contact owner (tenant); actor_id identifies the user who performed the edit (may be the owner or a grantee). If a grantee logs an interaction for a shared contact, actor_id != owner_id.

- **Existing endpoints**: Check [routes/tag_shares.py](../../../backend/app/api/routes/tag_shares.py) for TagShare CRUD and any existing permission checks that activity log queries must respect.
