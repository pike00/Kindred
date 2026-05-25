---
title: Undo Toast on Destructive Actions
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Check for/install sonner toast library (already present in frontend/src/components/ui/sonner.tsx), implement useUndoableAction hook, wire restore endpoints for Contact, Interaction, Note, Gift, Debt entities
---

# Undo Toast on Destructive Actions

## Goal
Provide a 5-second toast notification with an Undo button after delete-contact, delete-note, delete-gift, and settle-debt actions. Toast dismissal after 5 seconds permanently commits the soft delete to the server; explicit Undo within the window calls a restore endpoint to recover the entity. Backed by soft-delete feature (repo: soft-delete-entities).

## Tasks
- [ ] Verify sonner toast library is installed (already in frontend/src/components/ui/sonner.tsx)
- [ ] Implement useUndoableAction hook in frontend (tracks undo state, manages 5-second timer, calls restore on undo)
- [ ] Wire /{entity}/{id}/restore endpoints for Contact, Interaction, Note, Gift, Debt (soft-delete-entities feature provides the schema)
- [ ] Toast dismiss after 5s calls server to permanently commit soft delete (mark as deleted_at with no recovery window)
- [ ] Restore focus to deleted entity's row/card after successful undo
- [ ] Add Cmd+Z keyboard shortcut to undo last deletion (focus-dependent)
- [ ] ARIA live region announcement on toast show/dismiss for accessibility

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- README written; structure confirmed: sonner already installed, soft-delete-entities is prerequisite.

## Notes
- **Hard dependency on soft-delete-entities**: This feature assumes Contact, Interaction, Note, Gift, Debt, LifeEvent, Reminder all have deleted_at columns and restore endpoints exist.
- **5-second window**: After toast appears, user has 5 seconds to click Undo. If toast dismisses naturally (after 5s or user clicks X), the client sends a "commit delete" call to the server to finalize the hard delete. Soft-deleted rows can remain indefinitely if user never dismisses the toast.
- **Debounced batch undo**: If user deletes multiple items in rapid succession, each toast is independent; however, consider batching undo calls if 3+ deletions occur within 500ms.
- **Cmd+Z shortcut**: Implement global keyboard handler; pressing Cmd+Z within the 5-second window restores the most recent deletion. After 5s, Cmd+Z is a no-op (deletion committed).
- **ARIA live region**: Toast container must have role="status" aria-live="polite" to announce "Item deleted. Undo?" and "Deletion permanent." for screen readers.
- **Entities covered**: Contact (primary), Interaction (nested under Contact), Note (nested), Gift, Debt, LifeEvent, Reminder (all secondary). Focus restoration varies: Contact row -> sidebar selection highlight, Note/Gift/Debt card -> previous item in list.
