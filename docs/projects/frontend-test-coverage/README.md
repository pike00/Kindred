---
title: Frontend Test Coverage ≥90%
status: in-progress
repos: [kindred]
started: 2026-05-15
last_updated: 2026-05-15
next_step: Fix branches (81.58%→90%) and functions (87.61%→90%) — target QuickLogFAB, CommandPalette, AddressesCard, CustomFieldsCard, ContactFieldsCard, ImportExport, ReminderBell
progress: 2/6
---

# Frontend Test Coverage ≥90%

## Goal
Add comprehensive Vitest unit tests to the kindred frontend so all four v8 coverage metrics (statements, branches, functions, lines) hit the 90% global threshold enforced in `vitest.config.ts`. Excluded from coverage: shadcn/ui vendor components, TanStack Router route definitions, generated client, and boilerplate files.

## Tasks
- [x] Wave 1: scaffold test files for all major component groups (82 test files, 1834 tests passing)
- [x] Wave 2: rewrite low-coverage tests for RelationshipsCard, MentionTextarea, CommandPalette, QuickLogFAB, Appearance, and queryFn-dead-code fix for JournalList/RemindersList/TagsList
- [ ] Wave 3: fix remaining branch/function gaps — QuickLogFAB (41% branch), CommandPalette (51% func), AddressesCard/CustomFieldsCard/ContactFieldsCard edit-dialog paths, ImportExport downloadAuthed error branch, ReminderBell formatRelative edge cases, UserSettings/CustomFieldDefinitions edit dialog
- [ ] All four metrics ≥90%: statements, branches, functions, lines

## Session Log

### 2026-05-15
- Wave 1 complete: 82 test files, 1834 tests passing; statements 91.51% and lines 92.19% already above threshold
- Wave 2 complete: rewrote low-coverage tests for RelationshipsCard, MentionTextarea, CommandPalette, QuickLogFAB, Appearance; fixed useSuspenseQuery queryFn dead-code pattern for JournalList/RemindersList/TagsList
- Current state: statements 91.51% ✅, lines 92.19% ✅, branches 81.58% ❌, functions 87.61% ❌
- Identified root cause of branch/function gaps: edit dialogs never opened (require RowActionsMenu "Edit" click), form submissions not exercised, standalone helper functions unreached
- Wave 3 targets queued: QuickLogFAB (41% branch), CommandPalette (51% func), AddressesCard/CustomFieldsCard/ContactFieldsCard edit dialogs, ImportExport downloadAuthed error path, ReminderBell formatRelative edge cases, UserActionsMenu null-return branch, CustomFieldDefinitions edit dialog

## Notes

### 2026-05-15
- **Gotchas:** useSuspenseQuery mock at module level makes the queryFn arrow function dead code — must mock only the service method and use real hook + Suspense wrapper; Radix Dialog/Popover/Command portal rendering requires inline mocks in jsdom; vi.hoisted() required for mock variables in vi.mock() factory functions
- **Issues:** Branches 81.58% needs ~8.4pp gain (~103 more branches); Functions 87.61% needs ~2.4pp gain (~20 more functions); all gaps are in edit dialogs and form submission paths never exercised by existing tests
- **Accomplished:** Project scaffolded; Wave 1 + Wave 2 tests written; two of four metrics already passing
