---
title: Contacts Kanban Board
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Implement dnd-kit board layout with columns from Contact.stage values
---

# Contacts Kanban Board

## Goal
Build a visual kanban board for the Contact list view where contacts are organized into columns by their stage (Active, Dormant, Lost, etc.). Dragging a contact between columns updates Contact.stage via PATCH /contacts/{id}, with stage change history tracked automatically via the contact_stage_event audit table.

## Tasks
- [ ] Extract stage values from existing Contact records; define standard stages (Active, Dormant, Lost, Archived) or make them dynamic from database
- [ ] Build dnd-kit board component: columns for each stage, cards for contacts, drop-to-reorder handler
- [ ] Implement optimistic reordering: update local state on drop, debounce PATCH request to backend
- [ ] Wire PATCH /contacts/{id} stage updates to trigger contact_stage_event logging in service layer
- [ ] Add per-column contact count badge (e.g. "Active (12)")
- [ ] Implement column virtualization for boards with many contacts (e.g. scrollable cards, sticky headers)
- [ ] Add optional column-level filtering: by tag, by group, or by search query (shared with list view)
- [ ] Support mobile drag: long-press on contact card to initiate drag, touch-friendly drop target feedback
- [ ] Write tests: stage update flow, optimistic UI consistency, event logging, empty board state

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- README and handoffs/ directory created.

## Notes

* **dnd-kit library**: Preferred over react-beautiful-dnd because it is actively maintained, has better touch support, and hooks-based API integrates cleanly with React state management. See https://docs.dndkit.com/ for latest API.

* **Stage values**: Contact.stage is currently a string field (max 100 chars) with no enum constraint in the database. Existing values may vary; recommend querying SELECT DISTINCT stage FROM contact WHERE owner_id = ? to discover actual stages, then displaying all unique stages as columns. Consider adding a ContactStage enum in models.py for future validation (Active, Dormant, Lost, Archived as defaults with extensibility for user-defined stages).

* **Stage change audit trail**: The contact_stage_event table (or similar) should already exist per the project spec. Ensure the ContactService or similar business logic layer logs stage changes automatically when Contact.stage is updated. Do NOT rely on frontend to call a separate event endpoint; the service layer must handle it atomically with the stage PATCH.

* **Optimistic reordering**: On drag drop, immediately move the card in local state and fire off the PATCH request. If the request fails, revert the card to its original column and show an error toast. Use React Query or SWR to manage the mutation and cache coherency; avoid race conditions by disabling drag while a request is in flight.

* **Column virtualization**: If a contact has 100+ interactions logged, rendering all at once in a column is slow. Use a virtualization library like TanStack React Virtual to render only cards in the viewport. Alternatively, paginate or lazy-load cards within each column.

* **Mobile long-press**: dnd-kit supports touch events natively. Test on iOS and Android with a real device or Cypress/Playwright mobile emulation. Long-press (touch + hold > 200ms) should highlight the card and show a "dragging" state; release to drop. Consider adding visual feedback (e.g. shadow, opacity change) during drag.

* **Integration with list view**: The kanban board should coexist with the contacts list view (not replace it). Share filter state (tags, groups, search) between views using context or URL query params. Switching between views preserves filter and scroll position if possible.

* **Empty column state**: If a stage has no contacts, show a placeholder like "No contacts in Active" and allow drop targets to accept cards (drag a contact from another column to reorder without additional filtering).

* **Relationship to other stages**: If contact_stage_event is missing, check project docs for the audit table name. See models.py for the Contact entity definition and any existing stage-related logic. Stage changes may also trigger workflows (e.g. "mark lost contact for archive workflow"); coordinate with other projects to avoid duplicate event handling.
