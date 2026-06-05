---
title: Interaction Drafts
status: completed
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Drafts feature removed (UI + DraftsList) and shipped.
decision: Remove the feature (2026-05-31 feature-verification pass)
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

## Removal Tasks (2026-05-31 — decision reversed)
- [ ] Delete `frontend/src/components/Interactions/DraftsList.tsx`
- [ ] Remove the Drafts tab + Tabs wrapper from `frontend/src/routes/_layout/interactions.tsx` (revert to a single InteractionTimeline view)
- [ ] Grep for and remove any remaining `confirmDraft` / `is_draft=true` frontend call sites
- [ ] (Deferred / optional) Drop backend `interaction.is_draft` + `interaction.draft_source` columns and the `POST /interactions/{id}/confirm` endpoint via a dedicated Alembic migration — only once we are sure no ingestion path (voice/email) will resurrect drafts
- [ ] Remove/skip any e2e or component tests asserting the Drafts tab

## Session Log

### 2026-06-05
- Housekeeping: Drafts feature removed (UI + DraftsList) and shipped.

### 2026-04-21
- Project created.

### 2026-05-31
- Surfaced in the 0.2.x feature-verification pass: user flagged Drafts on `/interactions` with "remove drafts". Decision reversed from build → **remove**.
- Footprint mapped (read-only): frontend `DraftsList.tsx` + Drafts tab on the interactions route; backend `is_draft`/`draft_source` columns (models.py ~1581) and `POST /interactions/{id}/confirm` (interactions.py ~247) are implemented; the frontend confirm mutation was stubbed (`Promise.reject("confirmDraft not yet implemented")`).
- Chosen approach: **UI-only removal** is lowest-risk — delete the component + tab, leave backend columns/endpoint dormant (no external dependency, no migration needed now). Defer the column/endpoint drop to a separate migration if/when we're certain no ingestion flow will create drafts.
- No UI currently *creates* drafts (DraftsList only lists/confirms), so removal has no data-loss impact.

## Notes
- Drafts are a prerequisite for voice-to-text capture and email ingestion features; they allow asynchronous capture without premature contact-frequency recalculation.
- Reference [models.py](../../../backend/app/models.py) for Interaction schema (lines 922-1003); currently has channel, occurred_at, notes, mood, duration_minutes.
- The confirm action must recompute last_contacted_at on the parent contact; delete simply removes the draft row.
- draft_source enum values: "voice_memo", "email_suggestion", "manual", "import" — extensible for future ingestion sources.
- Partial index on `(contact_id, is_draft)` where is_draft=true optimizes drafts filtering without slowing regular interaction queries.
- Draft interactions inherit the same owner_id and contact_id as confirmed ones; soft-delete is not needed (hard delete on confirm or manual discard).
