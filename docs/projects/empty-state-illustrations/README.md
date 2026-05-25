---
title: Empty-State Illustrations
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-22
next_step: Document EmptyState component signature and migration path for pages not yet using it
---

# Empty-State Illustrations

## Goal
Provide a cohesive first-run experience on every list page (Contacts, Interactions, Debts, Gifts, Journal, Notes, Reminders, Tags) with instructive empty states that teach users what content belongs in each section. Add a dev-only seed button to populate realistic demo data for testing and UX validation.

## Tasks
- [x] Audit existing EmptyState component and usage patterns across all list pages
- [x] Define page-specific empty state copy (title, description) for each of 8 pages
- [x] Select illustration library (Lucide icons, undraw SVGs, or custom); ensure consistency with design system
- [x] Build shared seed function that populates realistic demo data across all entities
- [x] Add dev-only seed button to each empty state (gated by import.meta.env.DEV)
- [ ] Document EmptyState component signature and migration path for pages not yet using it

## Session Log

### 2026-04-21
- Project created.
- Found existing EmptyState component at frontend/src/components/Common/EmptyState.tsx with icon/title/description/action slots.
- Verified usage across Contacts subcomponents (LifeEventsCard, RelationshipsCard, AddressesCard, PetsCard, CustomFieldsCard, ContactsList).
- No dev-gating patterns detected in codebase; will establish import.meta.env.DEV convention.

### 2026-04-22
- Added EmptyState to JournalList (was missing).
- Created shared seed utility at `frontend/src/lib/seed.ts`.
- Wired up dev-only seed buttons to all list pages: ContactsList, InteractionTimeline, JournalList, RemindersList, TagsList.
- Also added seed buttons to contact detail tabs: Debts, Gifts, Notes.
- All seed buttons are gated by `import.meta.env.DEV` and call backend `/api/v1/private/seed` endpoint.
- TypeScript typecheck passes; lint passes.

## Notes

- **EmptyState signature:** `{ icon: LucideIcon, title: string, description?: string, action?: ReactNode, className?: string }`. Action slot is used for buttons and interactive elements.
- **Icon source:** Already importing Lucide icons (lib/icons.ts). Use Lucide for consistency; avoid undraw if possible to minimize asset dependencies.
- **Dev-gating:** Use `import.meta.env.DEV` to hide seed buttons in production builds. Never render demo UI in prod.
- **Copy tone:** Instructive not marketing. Examples: "No contacts yet. Create your first contact to get started." rather than "Build your network!"
- **Seed strategy:** Pair with backend seeding via `/api/v1/private/seed` endpoint. The backend seed_fake_data.py script is idempotent.
- **Seed implementation:** Created `frontend/src/lib/seed.ts` with `useSeedDemo` hook and `seedDemoData`/`seedMinimalDemo` functions.
- **Pages with seed buttons:** ContactsList, InteractionTimeline, JournalList, RemindersList, TagsList, and contact detail tabs (Debts, Gifts, Notes).
- **List pages covered:** Contacts (top-level), Interactions, Journal, Reminders, Tags, Debts, Gifts, Notes.
- **Design consistency:** EmptyState component auto-renders rounded border, dashed stroke, and muted icon bg. Ensure all custom illustrations respect this visual language.
