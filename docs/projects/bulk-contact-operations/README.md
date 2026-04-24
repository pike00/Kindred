---
title: Bulk Operations on Contacts List
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Add multi-select checkboxes to list component state + wire up floating action bar
---

# Bulk Operations on Contacts List

## Goal
Add multi-select checkboxes and bulk actions to the contact list view. Triage work (add/remove tags, manage groups, archive, export) currently requires one contact at a time; bulk operations turn minutes into seconds.

## Tasks
- [ ] Add selection state to list component (checkbox UI, track selected IDs)
- [ ] Implement floating action bar with bulk action buttons
- [ ] Create /contacts/bulk PATCH endpoint for atomic server-side mutations
- [ ] Add dry-run preview modal for destructive operations (archive, tag removal)
- [ ] Implement select-all-filtered logic (server-side filter matching, pagination-aware)
- [ ] Integrate CSV export and undo toast notifications

## Session Log

### 2026-04-23
- Project README and handoffs directory created.

### 2026-04-21
- Project created.

## Notes
- **Bulk endpoint strategy:** Use single /contacts/bulk PATCH instead of N requests. Atomicity matters: if one contact is already archived, don't partially fail. Transactional commit ensures all-or-nothing semantics.
- **Select-all-filtered scope:** "Select all filtered" must include rows not currently rendered (e.g., page 5 if user is on page 1). Server must re-apply the current filter, sort, and search when processing the bulk request, not just the selected list.
- **Confirm modal for tag grants:** Add a scope warning modal when bulk-adding tags. Future feature: scope detection (if tag is Confidential, warn that revealing it to coworkers via group bulk-add has privacy implications).
- **Undo via background job:** Toast notification should trigger a queued undo task; database tombstones or copy-on-write may be needed for high-throughput teams.
- **Pairing with related features:** CSV export is a natural companion (select, export). Archive and group reassignment are the top triage workflows; tag management runs second.
- **Performance consideration:** Limit bulk operations to 500 contacts per request; require pagination/offset for larger selections to prevent timeout on slow networks.
