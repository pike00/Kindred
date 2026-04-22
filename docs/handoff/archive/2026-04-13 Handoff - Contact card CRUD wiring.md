# Personal CRM — Handoff

**Status**: Contact detail is now fully wired for CRUD across all contact-scoped entities
**Branch**: main
**Last updated**: 2026-04-13
**Frontend build**: ✅ passes (`bun run --filter frontend build`)

---

## Authoritative docs

- [`architecture.md`](architecture.md) — full implementation guide
- [`DB_SCHEMA.md`](DB_SCHEMA.md) — database reference
- [`../README.md`](../README.md) — stack, features, local dev, deploy

## Repo layout note

The project was split into `backend/` and `frontend/` at the repo root — ignore any
older handoff references to `app/backend/…` / `app/frontend/…` (that layout is
gone).

---

## Current state

### Shipped (frontend + backend)

All entities below are fully CRUD'd in the React app:

| Feature        | Where |
| -------------- | ----- |
| Contacts       | [_layout/contacts](../frontend/src/routes/_layout/contacts/) |
| Interactions   | contact detail tabbed section |
| Notes          | contact detail tabbed section |
| Gifts          | contact detail tabbed section |
| Debts          | contact detail tabbed section |
| Tags / Groups  | dedicated routes |
| Reminders      | dedicated route |
| Journal        | dedicated route |
| Dashboard      | index route (stats + losing-touch) |
| Users & Admin  | settings / admin routes |

### New in this session (2026-04-13)

Previously backend-only; now have full add/edit/delete dialogs on the contact
detail page:

| Feature              | Card component                                                             |
| -------------------- | -------------------------------------------------------------------------- |
| Contact fields       | [ContactFieldsCard](../frontend/src/components/Contacts/ContactFieldsCard.tsx) |
| Addresses            | [AddressesCard](../frontend/src/components/Contacts/AddressesCard.tsx)     |
| Pets                 | [PetsCard](../frontend/src/components/Contacts/PetsCard.tsx)               |
| Relationships        | [RelationshipsCard](../frontend/src/components/Contacts/RelationshipsCard.tsx) (with contact picker) |
| Life events          | [LifeEventsCard](../frontend/src/components/Contacts/LifeEventsCard.tsx)   |
| Custom field values  | [CustomFieldsCard](../frontend/src/components/Contacts/CustomFieldsCard.tsx) |

Plus a new settings tab:

- **Custom field definitions** — [CustomFieldDefinitions](../frontend/src/components/UserSettings/CustomFieldDefinitions.tsx), wired as a tab in [settings.tsx](../frontend/src/routes/_layout/settings.tsx).
  Users define arbitrary fields (name + type + description + icon) that can then
  be set per-contact via `CustomFieldsCard`.

The contact detail route [_layout/contacts/$contactId.tsx](../frontend/src/routes/_layout/contacts/$contactId.tsx) was refactored to delegate each section to its card component; each card owns its own query, mutations, and dialogs.

### Remaining backend-only features (no UI)

| Feature          | Backend router                                          | Status |
| ---------------- | ------------------------------------------------------- | ------ |
| `import_export`  | [`backend/app/api/routes/import_export.py`](../backend/app/api/routes/import_export.py) | CSV / vCard bulk import+export, no UI |
| `webhooks`       | [`backend/app/api/routes/webhooks.py`](../backend/app/api/routes/webhooks.py) | outbound webhook registrations, no UI |

Either build UI for these or drop them if out of scope.

---

## Design notes (new in this session)

- **One "Card" per contact-scoped entity.** Each card file contains: list
  rendering, add dialog, edit dialog, delete via dropdown menu + `window.confirm`.
  This keeps the route file short (~300 lines) and each feature self-contained.
- **Cards own their own React Query state.** Query key convention:
  `[<resource>, contactId]` (and `["custom-field-definitions"]` for the
  user-scoped list). Mutations invalidate the matching key on success.
- **Form stack.** `react-hook-form` + `zod` + shadcn `<Form>` primitives, mirroring
  the pre-existing `AddGift` / `EditContactDialog` conventions. Add dialogs
  use `useState` + `DialogTrigger`; edit dialogs are controlled via
  `open` / `onOpenChange` props from the row component.
- **Backend list endpoints return `{data, count}` envelopes** but the generated
  client types them as `unknown` (OpenAPI loss). Cards cast
  `(resp as { data?: X[] })?.data ?? []` to unwrap, matching the existing
  convention in the route file.
- **Relationship picker** lazily fetches the contacts list (limit 500) the
  first time the Add dialog opens, and filters out the current contact.
- **Custom fields** are two-tiered: definitions are user-scoped (managed in
  Settings), values are per-contact (managed on the contact detail page). The
  `CustomFieldValuePublic` schema includes `field_name` so the card can label
  rows without a separate join fetch.

---

## Validation

```bash
# Frontend type-check + build
cd /home/will/Documents/Projects/personal-crm
bun run --filter frontend build

# Backend tests (from a running dev stack)
docker compose exec backend bash scripts/tests-start.sh

# E2E (requires dev stack up)
for f in e2e/*.test.ts; do bun run "$f"; done
```

The frontend build was last run green on 2026-04-13 after the card refactor.
No backend changes were made in this session, so the 60-test suite should
still pass unchanged.

---

## Next up (suggestions)

1. **Drop or build UI for `import_export` and `webhooks`** — decide whether
   they're in-scope and either wire them up or delete the routes.
2. **Manual smoke test** of each new card against a running dev stack
   (nothing has been verified end-to-end yet — only the TypeScript build).
3. **E2E coverage** for the new add/edit/delete flows under `e2e/`.
4. **Real-time invalidation when relationships change** — currently the
   RelationshipsCard fetches each related contact individually; consider
   batching or embedding the related contact name in the API response to
   avoid N+1 queries on the backend.
