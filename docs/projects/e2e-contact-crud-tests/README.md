---
title: E2E Coverage for Contact CRUD Flows
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Set up Playwright with Bun runner and scaffold test structure
---

# E2E Coverage for Contact CRUD Flows

## Goal
Add end-to-end test coverage for all contact card add/edit/delete dialogs using Playwright running on the Bun test runner. Tests run against the live docker compose stack seeded with fake data and verify both UI state and API round-trip behavior to ensure the post-2026-04-13 refactor is correctly wired.

## Tasks
- [ ] Install Playwright and configure Bun test runner (frontend/e2e/)
- [ ] Create fixtures for auth, seeding, and base test setup
- [ ] Write add dialog tests (ContactFieldsCard, AddressesCard, PetsCard, RelationshipsCard, LifeEventsCard, CustomFieldsCard)
- [ ] Write edit dialog tests covering field updates and validation
- [ ] Write delete confirmation tests with API verification
- [ ] Run full suite against docker compose stack and document test commands

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Contact CRUD models:** [ContactBase, ContactCreate, ContactUpdate, Contact](../../../backend/app/models.py) defined with SQLModel; relationships to Address, Pet, Relationship, LifeEvent, CustomFieldValue all via owner_id ForeignKey
- **Frontend card components:** Located in [frontend/src/components/Contacts/](../../../frontend/src/components/Contacts/) with separate files for each card type (ContactFieldsCard.tsx, AddressesCard.tsx, PetsCard.tsx, RelationshipsCard.tsx, LifeEventsCard.tsx, CustomFieldsCard.tsx) plus AddContactDialog.tsx and EditContactDialog.tsx
- **Seeding:** `just seed [count] [email]` runs [seed_fake_data.py](../../../backend/app/seed_fake_data.py) to populate Contact, Address, Pet, Relationship, LifeEvent, and CustomField entities; seed tracks are available via separate functions (seed_contact_children, seed_relationships, etc.)
- **Dev stack:** `docker compose -f compose.dev.yml up` (or `compose.dev.yml` default in justfile) brings up FastAPI backend at :8000, React frontend at :5173, Postgres, Redis, and Meilisearch; backend auto-reloads on file changes
- **API endpoints:** Backend defines CRUD routes for contacts and child resources (/api/v1/contacts, /api/v1/contacts/{id}/addresses, etc.); test fixtures must navigate both UI and verify POST/PATCH/DELETE responses
- **Auth:** Dev stack uses local auth mode (VITE_AUTH_MODE=local); FIRST_SUPERUSER email configurable via .env (removed@example.com default)
- **Post-2026-04-13 refactor:** Contact-specific components (ContactFieldsCard, AddressesCard, etc.) were refactored and have not yet been verified end-to-end; TypeScript build passes but runtime UI correctness unconfirmed
