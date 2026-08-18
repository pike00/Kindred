---
title: Soft Delete Across Mutable Entities
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Create deleted_at mixin; add to Contact, Interaction, Note, Gift, Debt, LifeEvent, Reminder
---

# Soft Delete Across Mutable Entities

## Goal
Enable recovery, undo, and honest auditing of Contact, Interaction, Note, Gift, Debt, LifeEvent, and Reminder deletions by adding `deleted_at` timestamps and filtering them from the query layer by default. Soft-deleted rows remain in the database and can be restored via a dedicated endpoint.

## Tasks
- [ ] Create deleted_at mixin (datetime | None, nullable, index=True)
- [ ] Apply mixin to Contact, Interaction, Note, Gift, Debt, LifeEvent, Reminder
- [ ] Write Alembic migration to add deleted_at columns and index
- [ ] Implement default query filter (SQLAlchemy with_loader_criteria or SQLAlchemy event)
- [ ] Add restore endpoint (PATCH /contacts/{id}/restore, etc.)
- [ ] Define cascade semantics for hard and soft deletes
- [ ] Write tests for filter behavior, restore, unique constraint collisions
- [ ] Update docstrings and API docs

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

## Notes
- All mutable entities identified in [models.py](../../../backend/app/models.py): Contact (line 465), Interaction (961), Note (1372), Gift (1150), Debt (1237), LifeEvent (1314), Reminder (1044).
- **Default query filter strategy**: Use SQLAlchemy `with_loader_criteria` on the Base query class to inject `WHERE deleted_at IS NULL` automatically on all queries, unless explicit `include_deleted=True` parameter is passed to the service/repo. Alternatively, hook into session events to apply the filter globally—prefer the former for explicitness.
- **Cascade implications**: Hard delete (permanent) cascades to child rows (e.g., deleting a Contact hard-deletes its Interactions, Notes, Gifts, Debts, LifeEvents, Reminders). Soft delete (recovery-intent) marks only the root row as deleted; children remain visible in queries *only if queried directly*—the API UI will filter parent-deleted children by the same query scope.
- **Unique constraint collisions**: If Contact has a unique constraint on (owner_id, email), soft-deleting then trying to create a duplicate email triggers a unique violation. Mitigate with sparse indexes (`WHERE deleted_at IS NULL`) or allow duplicate emails when one is deleted.
- **Prerequisite for items 4 (merge) and 45 (undo toast)**: Soft deletes enable merging two contacts by marking one as deleted instead of cascade-destroying all its history. Undo toast displays recovered rows in the UI and re-soft-deleted them if the user confirms discarding.
