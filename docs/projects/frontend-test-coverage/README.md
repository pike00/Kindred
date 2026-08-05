---
title: Frontend Test Coverage ≥90%
status: to_review
repos: [kindred]
started: 2026-05-15
last_updated: 2026-08-04
next_step: Goal achieved (all four metrics ≥90%); commit working tree
progress: 4/4
---

# Frontend Test Coverage ≥90%

## Goal
Add comprehensive Vitest unit tests to the kindred frontend so all four v8 coverage metrics (statements, branches, functions, lines) hit the 90% global threshold enforced in `vitest.config.ts`. Excluded from coverage: shadcn/ui vendor components, TanStack Router route definitions, generated client, and boilerplate files.

## Tasks
- [ ] **Verify (LLM-built, to_review):** re-run vitest coverage; confirm all four metrics still ≥90% and the flaky `AddReminderDialog` loading-state test isn't masking a regression
- [x] Wave 1: scaffold test files for all major component groups (82 test files, 1834 tests passing)
- [x] Wave 2: rewrite low-coverage tests for RelationshipsCard, MentionTextarea, CommandPalette, QuickLogFAB, Appearance, and queryFn-dead-code fix for JournalList/RemindersList/TagsList
- [x] Wave 3: fix remaining branch/function gaps — QuickLogFAB (41% branch), CommandPalette (51% func), AddressesCard/CustomFieldsCard/ContactFieldsCard edit-dialog paths, ImportExport downloadAuthed error branch, ReminderBell formatRelative edge cases, UserSettings/CustomFieldDefinitions edit dialog
- [x] All four metrics ≥90%: statements, branches, functions, lines

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-05-31
- Housekeeping: status → `to_review`. Coverage was driven to ≥90% by 5 parallel haiku agents (Wave 3); the agent-written tests have not been human-reviewed for assertion quality (passing ≠ meaningful). Added a verification task to re-run coverage and sanity-check the flaky `AddReminderDialog` test.

### 2026-05-16
- Goal hit: all four v8 coverage metrics now ≥90% — Statements 96.97% (1954/2015), Branches 90.05% (1105/1227), Functions 95.99% (814/848), Lines 97.48% (1860/1908)
- Branches lifted 87.61% → 90.05% by adding ~25 targeted non-Error rejection tests across components with `err instanceof Error ? err.message : "Fallback"` patterns: ImportExport (3), QuickLogFAB (1), NotesCard (3), AddressesCard (3), RelationshipsCard (2), PetsCard (3), LifeEventsCard (2), ContactFieldsCard (1), CustomFieldsCard (1), CustomFieldDefinitions (1), Webhooks (2), ApiKeys (1), AddDebt/AddGift/AddMediaRecommendation (1 each), CommandPalette (tags-haystack), EditContactDialog (freq-input fallback)
- Fixed pre-existing `z.object is undefined` error in ContactFieldsCard/CustomFieldsCard test files by wrapping `mockShowSuccessToast`/`mockShowErrorToast` in `vi.hoisted()` — module-scope `const = vi.fn()` was in TDZ when vi.mock factories ran, cascading to break module init
- 1942 tests passing across 83 files (was 1913 → +29 new); QuickLogFAB Dialog X-button fix landed earlier in session
- Project complete; ready to commit and close

### 2026-05-15 (session 2)
- Dispatched 5 parallel Wave 3 haiku agents covering QuickLogFAB, CommandPalette, AddressesCard+CustomFieldsCard, ContactFieldsCard, and ImportExport+ReminderBell+UserActionsMenu+CustomFieldDefinitions
- Agents wrote ~60 new tests; committed 56 files (21k+ line diff) to main
- 32 tests currently failing due to selector mismatches: contact picker uses `data-testid="command-item-{id}"` but tests look by first_name; edit buttons use `data-testid="action-edit"` but the RowActionsMenu mock may not be rendering for some components
- Branches: 81.58% → still below threshold; functions: 87.61% → still below; statements/lines still passing
- CommandPalette agent also identified all navigate items need to be clicked; ReminderBell formatRelative branches covered; UserActionsMenu null-return branch covered
### 2026-05-15
- Wave 1 complete: 82 test files, 1834 tests passing; statements 91.51% and lines 92.19% already above threshold
- Wave 2 complete: rewrote low-coverage tests for RelationshipsCard, MentionTextarea, CommandPalette, QuickLogFAB, Appearance; fixed useSuspenseQuery queryFn dead-code pattern for JournalList/RemindersList/TagsList
- Current state: statements 91.51% ✅, lines 92.19% ✅, branches 81.58% ❌, functions 87.61% ❌
- Identified root cause of branch/function gaps: edit dialogs never opened (require RowActionsMenu "Edit" click), form submissions not exercised, standalone helper functions unreached
- Wave 3 targets queued: QuickLogFAB (41% branch), CommandPalette (51% func), AddressesCard/CustomFieldsCard/ContactFieldsCard edit dialogs, ImportExport downloadAuthed error path, ReminderBell formatRelative edge cases, UserActionsMenu null-return branch, CustomFieldDefinitions edit dialog

## Notes

### 2026-05-16
- **Decisions:** Used non-Error rejection (`mockRejectedValue("plain-string")`) as the systematic pattern to exercise the `err instanceof Error` false branch across the codebase — one ~10-line test per error handler scales linearly and avoids source refactoring.
- **Gotchas:** `vi.hoisted()` is mandatory when capturing mock-function refs at module scope. `const mockShowErrorToast = vi.fn()` outside `vi.hoisted()` hits TDZ when the hoisted `vi.mock()` factory runs first; the symptom surfaces as `TypeError: z.object is undefined` because the module fails to initialize cleanly — confusing diagnostic, real cause is hoisting order.
- **Issues:** `AddReminderDialog.test.tsx > shows loading state while submitting` is intermittently flaky in full-suite runs (passes in isolation) — race condition between mutation pending state and DOM assertion. Pre-existing on clean HEAD, not caused by this session. Not blocking.
- **Accomplished:** All four coverage metrics ≥90%; ContactFieldsCard/CustomFieldsCard previously-broken test files now run cleanly (35+21 tests); project goal met. Coverage thresholds in `vitest.config.ts` now enforced and passing.

### 2026-05-15 (session 2)
- **Gotchas:** QuickLogFAB contact picker is a nested Popover inside the main Popover — need to open the inner contact-picker Popover before clicking items; `data-testid="command-item-{contact.id}"` uses the UUID, not the name; AddressesCard's RowActionsMenu mock renders `data-testid="action-{label.toLowerCase()}"` but some new tests couldn't find it (investigate whether addresses are rendering)
- **Issues:** 32 Wave 3 tests failing; coverage gains blocked until fixes applied; ImportExport fetch mock not capturing error path; CustomFieldsCard tests using wrong dialog text selectors
### 2026-05-15
- **Gotchas:** useSuspenseQuery mock at module level makes the queryFn arrow function dead code — must mock only the service method and use real hook + Suspense wrapper; Radix Dialog/Popover/Command portal rendering requires inline mocks in jsdom; vi.hoisted() required for mock variables in vi.mock() factory functions
- **Issues:** Branches 81.58% needs ~8.4pp gain (~103 more branches); Functions 87.61% needs ~2.4pp gain (~20 more functions); all gaps are in edit dialogs and form submission paths never exercised by existing tests
- **Accomplished:** Project scaffolded; Wave 1 + Wave 2 tests written; two of four metrics already passing
