---
title: Gift Kanban
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Design Alembic migration strategy for GiftStatus enum extension
---

# Gift Kanban

## Goal
Extend the Gift lifecycle from a simple 3-state enum (idea/given/received) to a real procurement pipeline. Model the full journey: Idea -> Purchased -> Wrapped -> Given, with automatic overdue warnings when a contact's birthday is approaching and gifts are still in ideation.

## Tasks
- [ ] Extend GiftStatus enum with PURCHASED and WRAPPED states (Alembic migration using ALTER TYPE ADD VALUE)
- [ ] Backfill existing gifts mapping old enum values to new pipeline positions
- [ ] Add Gift.days_until_occasion computed field for urgency detection
- [ ] Implement overdue-warning badge (birthday in <3 days && status is IDEA/PURCHASED)
- [ ] Build Kanban board view with drag-to-change-status and per-column counts
- [ ] Implement cost rollup aggregation per status column
- [ ] Optional: Add shared board mode for family gift coordination via tag-based access

## Session Log

### 2026-04-23
- Project README created with full task breakdown.
- Handoffs directory structure initialized.

### 2026-04-21
- Project created.

## Notes

- **Enum migration strategy:** Postgres enum changes require `ALTER TYPE ... ADD VALUE`. Order matters; insert PURCHASED and WRAPPED between IDEA and GIVEN. Alembic's `enum.Enum` operation supports raw SQL via `ops.execute()`. Test against a copy of production schema first.

- **Backfill mapping:** Gifts currently in IDEA stay IDEA. Gifts with gift_date and status GIVEN/RECEIVED are assumed to have been purchased/wrapped and can default to PURCHASED/WRAPPED retroactively, or stay as-is if we want to preserve original semantics. Decide on migration vs UI mapping.

- **Urgency computation:** Add a database view or computed field: `EXTRACT(DAY FROM Contact.birthday - CURRENT_DATE)`. If this is <3 and the gift's status is IDEA or PURCHASED, flash a red badge on the Kanban card.

- **Kanban board use case:** Family gift coordination. Multiple users (via tag-based shares) can see the same gifts and move them through the pipeline. Tag shares already grant read access; consider if write access should be scoped by tag too.

- **Cost rollup:** SUM(Gift.value_amount) grouped by status column. Useful for budget planning per phase (e.g., "Wrapped column = $156 committed").

- **Frontend considerations:** React component reusing existing contact card, but in column layout. Drag-drop via react-beautiful-dnd or native HTML5 drag API. Show column totals and count badges.
