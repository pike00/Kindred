---
title: Interaction Drafts
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Add is_draft and draft_source fields to Interaction model via Alembic migration
---

# Interaction Drafts

## Goal
Enable capture of draft interactions from voice memos and email suggestions without affecting contact engagement metrics until explicitly confirmed. Drafts sit in a separate view, can be edited, and are promoted to confirmed interactions on user approval.

## Tasks
- [ ] Add is_draft boolean and draft_source enum to Interaction model (Alembic migration)
- [ ] Exclude draft interactions from last_contacted_at computation
- [ ] Implement drafts list endpoint (GET /interactions?is_draft=true) with filtering
- [ ] Add confirm/delete actions for draft interactions via API
- [ ] Build drafts list UI component with edit, confirm, and delete capabilities
- [ ] Create partial index on (contact_id, is_draft) for query performance

## Session Log

### 2026-04-21
- Project created.

## Notes
- Drafts are a prerequisite for voice-to-text capture and email ingestion features; they allow asynchronous capture without premature contact-frequency recalculation.
- Reference [models.py](../../../backend/app/models.py) for Interaction schema (lines 922-1003); currently has channel, occurred_at, notes, mood, duration_minutes.
- The confirm action must recompute last_contacted_at on the parent contact; delete simply removes the draft row.
- draft_source enum values: "voice_memo", "email_suggestion", "manual", "import" — extensible for future ingestion sources.
- Partial index on `(contact_id, is_draft)` where is_draft=true optimizes drafts filtering without slowing regular interaction queries.
- Draft interactions inherit the same owner_id and contact_id as confirmed ones; soft-delete is not needed (hard delete on confirm or manual discard).
