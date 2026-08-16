---
title: Contact Merge with History
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Design migration and merge service; decide on absorb strategy for two-way relationships (Relationship.related_contact_id)
---

# Contact Merge with History

## Goal
Implement a reversible contact merge workflow that combines duplicate contacts while preserving audit visibility. The absorbed contact is soft-deleted (not hard-deleted) so the operation can be undone, and a contact_merge log table tracks who merged what and when.

## Tasks
- [ ] Alembic migration: add contact_merge table with (surviving_id, absorbed_id, merged_at, merged_by); add is_merged soft-delete flag to contact
- [ ] Merge service: cascade all contact_id FKs to surviving_id, handle bidirectional Relationship rows, preserve original contact_id for audit via contact_merge.absorbed_id
- [ ] Unmerge endpoint: restore absorbed contact from soft-delete state, reverse FK rewrites using contact_merge log
- [ ] Duplicate detection UI: list potential duplicates (name similarity, shared emails/phones), trigger merge picker
- [ ] Merge audit view: show contact_merge log entries with old/new values, optionally filter by contact or user
- [ ] Testing: merge with interactions, notes, relationships, debts, gifts, etc.; verify no data loss; test unmerge

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

## Notes

**Foreign keys to contact.id (from models.py):**
- ContactTag: contact_id (junction; cascade)
- ContactGroup: contact_id (junction; cascade)
- ContactField: contact_id (emails/phones; cascade)
- Address: contact_id (cascade)
- Interaction: contact_id (cascade)
- Reminder: contact_id (optional; cascade)
- Gift: contact_id (cascade)
- Debt: contact_id (cascade)
- LifeEvent: contact_id (cascade)
- Note: contact_id (cascade)
- MediaRecommendation: contact_id (cascade)
- Relationship: contact_id and related_contact_id (both FKs; cascade)
- CustomFieldValue: contact_id (cascade)

**Key design decisions:**
1. **Soft-delete strategy**: Add `is_merged` boolean flag to Contact (not `is_archived` — that has UI meaning). When merging contact_b into contact_a, set contact_b.is_merged = True instead of hard-deleting.
2. **Two-way relationships**: Relationship has both contact_id (from) and related_contact_id (to). During merge, rewrite both directions: a->(b) becomes a->(a), and b->(x) becomes a->(x). If two-way link a<->b exists, collapse to self-relationship (contact_a -> contact_a) or delete as degenerate.
3. **Audit trail**: contact_merge(surviving_id, absorbed_id, merged_at, merged_by) lets us trace which contact absorbed which and who did it. For unmerge, replay the log entry to restore.
4. **Reversibility**: Because absorbed rows are not deleted, contact_merge log can drive unmerge by updating FKs back to absorbed_id and flipping is_merged flag. Does not require row-level change tracking.
5. **Conflict resolution**: No field-level merge (e.g. "keep survivor's company, absorbed's title"). Merge is all-or-nothing: absorb all rows into survivor. If user wants selective merge, surface UI dialog showing what will move.

**Ambiguous fields:**
- vcard_raw, vcard_etag: Which contact's vCard data survives? Pick survivor's.
- avatar_url: Survivor's avatar; optionally surface absorbed avatar as alternate.
- last_contacted_at: Merge will not recompute; existing value on survivor stands. (Could recompute as max(survivor.last_contacted_at, max(absorbed's interaction dates) if needed later.)

**Unmerge mechanics:**
- Look up contact_merge log entry.
- Set absorbed_contact.is_merged = False.
- Update all FKs: contact_field, address, interaction, etc. where contact_id == survivor_id back to absorbed_id (only those inserted after merge timestamp).
- For Relationship: restore rows by rewriting contact_id or related_contact_id back to absorbed_id.
- Delete self-relationships or collapsed relationships if they were created during merge.

**Testing checklist:**
- Merge with no child rows (survivor survives unchanged).
- Merge with mixed child rows (some on survivor, some on absorbed; all moved to survivor).
- Two-way Relationship: a<->b merge into a (should result in degenerate or single self-link).
- Interaction/Note timestamps: verify no timestamp shift during merge.
- Unmerge: all rows must return to absorbed contact.
- Unmerge with new data: if user adds interactions to survivor after merge, unmerge should not touch those rows (timestamp guard).
