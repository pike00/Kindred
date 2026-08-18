# Share All Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a contact owner to grant another active user access to all of the owner's current and future contacts, including the contact-scoped data and interactions already covered by the existing visibility rules.

**Architecture:** Add a dedicated owner-to-user `AllContactsShare` grant instead of manufacturing a special tag. Extend the existing `visible_contact_ids` predicate with an owner-level grant branch, so every existing contact and contact-child endpoint inherits the behavior. Add a small sharing-management UI separate from tag management because the grant is not attached to a tag.

**Tech Stack:** FastAPI, SQLModel, Alembic, PostgreSQL, React, TanStack Query, generated TypeScript client, pytest, frontend component tests.

## Global Constraints

- Broad sharing grants read + write access, matching the existing `TagShare` contract; do not add a permission mode in this feature.
- The grant applies to current and future contacts owned by the grantor.
- Soft-deleted contacts remain hidden from normal visibility queries.
- Journal entries, groups, and tags remain owner-only; broad contact sharing does not make them visible.
- Only the owner/grantor can create, list, or revoke their broad-contact grants.
- A grantee must already be an active `User`; this feature does not add invitations or provisioning.
- All development and verification commands go through the repository's `just` recipes.
- After backend schema or route changes, run `just regen-client` and `just sdk-regen`.

## Scope and behavior

### In scope

- Grant all contacts owned by the current user to one active user.
- Include contacts created after the grant without additional tagging.
- Reuse the existing contact visibility predicate for contact CRUD, contact-child resources, and interaction visibility/write access.
- Idempotent grant creation.
- Revoke access without deleting or changing any contacts, interactions, or related rows.
- Activity-log entries for grant and revoke operations.
- API and frontend management flow.

### Out of scope

- Read-only broad sharing.
- Per-contact exclusions.
- Sharing another user's contacts.
- Shared tags, groups, journal entries, or saved filters.
- Invitations, household membership management, or automatic user provisioning.
- Changing the existing tag-share semantics.

## Data model

Add a table with one row per owner/grantee pair:

```python
class AllContactsShare(SQLModel, table=True):
    __tablename__ = "all_contacts_share"

    owner_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    grantee_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    created_at: datetime = Field(default_factory=get_datetime_utc, nullable=False)
```

The composite primary key makes repeated grants idempotent and makes deleting a user clean up their grants. No `Contact` rows change when a grant is created or revoked.

## Visibility semantics

Extend `visible_contact_ids(user)` in `backend/app/crud.py` with a third branch:

```python
all_shared = (
    select(Contact.id)
    .join(AllContactsShare, AllContactsShare.owner_id == Contact.owner_id)
    .where(AllContactsShare.grantee_id == user.id)
)
```

Apply the existing soft-delete predicate to this branch and return the union of:

```text
contacts owned by the user
OR contacts bearing a tag shared with the user
OR contacts owned by a user who granted all-contact access
```

Because interaction routes already define visibility as “any attendee is visible,” a recipient will see an interaction when at least one attendee is covered by the broad grant. The attendee list must continue filtering out attendees the recipient cannot see.

## API contract

Add a router at `/api/v1/contact-shares` with these operations:

```text
POST   /api/v1/contact-shares/
       body: { "grantee_id": UUID } or { "grantee_email": string }
       response: AllContactsSharePublic

GET    /api/v1/contact-shares/
       response: AllContactsSharesPublic

DELETE /api/v1/contact-shares/{grantee_id}
       response: { "message": "Share removed" }
```

The POST handler must require an active grantee, reject self-sharing with `400`, return the existing row for an idempotent repeat, and write an activity log containing the grantor, grantee, scope `all_contacts`, and action `create`. GET and DELETE must restrict access to the current user's grants; a grantee cannot manage or revoke access granted to them.

## Implementation tasks

### Task 1: Add the broad-share model and migration

**Files:**
- Modify: `backend/app/models.py` near `TagShare`
- Create: `backend/app/alembic/versions/q6r7s8t9u0_add_all_contacts_share.py`
- Modify: `docs/db/schema.dbml`
- Modify: `docs/db/schema.json`
- Create: `docs/db/public.all_contacts_share.md`
- Test: `backend/tests/crud/test_visibility.py`

**Interfaces:**
- Produces `AllContactsShare` for CRUD and `visible_contact_ids`.
- Produces the `all_contacts_share` table with composite primary key `(owner_id, grantee_id)` and cascading user foreign keys.

- [ ] Write a failing visibility test that creates an owner, grantee, and owner contact, inserts an `AllContactsShare`, and asserts the grantee sees it through `visible_contact_ids`.
- [ ] Add the model and migration with the exact columns and constraints above.
- [ ] Add tests for revoke visibility, future-contact visibility, owner visibility, self-row exclusion, and soft-deleted contact exclusion.
- [ ] Run `just test-backend -- tests/crud/test_visibility.py -q` and verify the new tests pass.
- [ ] Refresh database documentation using the repository's database-docs recipe and verify the generated table documents match the migration.

### Task 2: Extend the shared visibility predicate

**Files:**
- Modify: `backend/app/crud.py:465-481`
- Audit: `backend/app/api/routes/contacts.py`, `backend/app/api/routes/addresses.py`, `backend/app/api/routes/contact_fields.py`, `backend/app/api/routes/custom_fields.py`, `backend/app/api/routes/debts.py`, `backend/app/api/routes/gifts.py`, `backend/app/api/routes/life_events.py`, `backend/app/api/routes/reminders.py`, and `backend/app/api/routes/interactions.py`; these routes should continue using the shared visibility helpers without changing their public signatures.
- Test: `backend/tests/api/routes/test_contacts.py`
- Test: `backend/tests/api/routes/test_interactions.py`

**Interfaces:**
- Consumes `AllContactsShare` from Task 1.
- Keeps the existing `visible_contact_ids(user, include_deleted=False)` and `contact_visible(...)` signatures unchanged.

- [ ] Add an API test where Alice grants all contacts to Bob and Bob can list and retrieve Alice's existing contact.
- [ ] Add an API test where Alice creates a new contact after granting access and Bob can list and retrieve it without a tag.
- [ ] Add a negative test showing that after DELETE, Bob receives `404` for the contact and it disappears from the list.
- [ ] Add child-resource assertions for one representative contact child, such as an address or contact field, to ensure the existing `contact_visible` path covers broad shares.
- [ ] Add an interaction test where an interaction has one broadly shared attendee and one private attendee; Bob sees the interaction but only the broadly visible attendee.
- [ ] Run `just test-backend -- tests/api/routes/test_contacts.py tests/api/routes/test_interactions.py -q`.

### Task 3: Add broad-share API routes and audit logging

**Files:**
- Create: `backend/app/api/routes/contact_shares.py`
- Modify: `backend/app/api/main.py`
- Modify: `backend/app/models.py` with `AllContactsSharePublic` and `AllContactsSharesPublic`
- Test: `backend/tests/api/routes/test_contact_shares.py`
- Test: `backend/tests/api/routes/test_activity_logs.py`

**Interfaces:**
- `POST /contact-shares/` accepts `grantee_id` or `grantee_email`.
- `GET /contact-shares/` returns the current user's active broad grants, including grantee email and creation time.
- `DELETE /contact-shares/{grantee_id}` revokes only the current user's grant to that grantee.

- [ ] Write route tests for grant-by-ID, grant-by-email, unknown/inactive grantee, self-share rejection, idempotent repeat, list isolation, and revoke isolation.
- [ ] Implement the router following `backend/app/api/routes/tag_shares.py` patterns, but query `AllContactsShare.owner_id == current_user.id` for management operations.
- [ ] Add create and delete `ActivityLog` entries with `entity_type="AllContactsShare"`, `entity_id` set to the grantee ID, and `changes_json` containing `scope="all_contacts"`.
- [ ] Register the router in `backend/app/api/main.py`.
- [ ] Add activity-log tests proving the grantor can see grant/revoke events and another user cannot use the grantor's filters to inspect them.
- [ ] Run `just test-backend -- tests/api/routes/test_contact_shares.py tests/api/routes/test_activity_logs.py -q`.

### Task 4: Regenerate clients and add frontend query/mutation support

**Files:**
- Modify: `frontend/openapi.json`
- Modify: `frontend/src/client/sdk.gen.ts`
- Modify: `frontend/src/client/types.gen.ts`
- Modify: `frontend/src/client/schemas.gen.ts`
- Modify: `sdk/src/kindred/_generated/`

**Interfaces:**
- Produces `ContactSharesService.createContactShare`, `listContactShares`, and `deleteContactShare` in the generated frontend client.
- Produces matching generated Python SDK models and API methods.

- [ ] Start the backend stack with the repository's standard dev recipe so the OpenAPI document is available.
- [ ] Run `just regen-client` after the route/schema changes.
- [ ] Run `just sdk-regen` and inspect the generated diff for only the new models/routes.
- [ ] Run `just typecheck` and the backend route tests.

### Task 5: Build the sharing-management UI

**Files:**
- Create: `frontend/src/components/Sharing/ContactSharingPanel.tsx`
- Create: `frontend/src/components/Sharing/ContactShareDialog.tsx`
- Create: `frontend/src/components/Sharing/ContactShareRow.tsx`
- Modify: `frontend/src/routes/_layout/settings.tsx`
- Test: `frontend/src/__tests__/components/Sharing/ContactSharingPanel.test.tsx`

**Interfaces:**
- Uses generated `ContactSharesService` methods from Task 4.
- Displays active grants and supports adding/revoking a grant.

- [ ] Write component tests for loading an empty state, rendering an existing grantee, submitting a valid email, showing the scope warning, and revoking a grant after confirmation.
- [ ] Add copy that explicitly says: “This shares all current and future contacts and their contact-related records. The recipient can edit shared contacts and interactions.”
- [ ] Require confirmation before granting access and show the irreversible scope clearly; do not promise read-only access.
- [ ] Invalidate the contact-share query after create/revoke and show success/error toasts using existing project conventions.
- [ ] Add the panel to account/settings navigation rather than the Tags page; broad sharing is independent of tags.
- [ ] Run `just test-frontend` and `just typecheck`.

### Task 6: Fix the existing tag-share submission bug and clarify permissions

**Files:**
- Modify: `frontend/src/components/Tags/TagShareDialog.tsx:94-124`
- Test: the existing TagShare dialog test location, or create `frontend/src/__tests__/components/Tags/TagShareDialog.test.tsx`

**Interfaces:**
- Keeps tag sharing behavior unchanged while making the existing email form submit `grantee_email` instead of an empty `grantee_id`.

- [ ] Add a failing test that submits `person@example.com` and asserts `createTagShare` receives `{ tag_id, grantee_email: "person@example.com" }`.
- [ ] Change the mutation payload to use `grantee_email: data.granteeEmail`.
- [ ] Change the dialog text from “read access” to “read and write access.”
- [ ] Add a test that the preview step does not create a grant before confirmation.
- [ ] Run `just test-frontend`.

### Task 7: End-to-end verification and documentation

**Files:**
- Create or modify: `e2e/contact-sharing.spec.ts`
- Modify: `docs/improvements.md` to remove or update the now-completed sharing UI item
- Create: `docs/projects/share-all-contacts/README.md` describing shipped behavior and limitations

- [ ] Add an E2E flow: owner grants all contacts to a second user, second user sees existing contacts, owner creates a new contact, second user sees the new contact, second user edits a shared contact, and owner sees the edit.
- [ ] Add revoke assertions: second user loses the contacts and related interactions after revocation, while no rows are deleted.
- [ ] Add a mixed-attendee interaction assertion that private attendees remain hidden.
- [ ] Run `just test-all`.
- [ ] Run `just lint` and `just typecheck`.
- [ ] Run the repository health check and record any unrelated pre-existing failures.

## Acceptance criteria

- An owner can grant all-contact access to an existing active user from the UI.
- The recipient sees all current contacts owned by the grantor.
- Contacts created after the grant are automatically visible to the recipient.
- The recipient can edit and soft-delete shared contacts and can create/edit/delete interactions involving visible contacts.
- Interactions reveal only attendees visible to the recipient.
- Revoking the grant immediately removes visibility without deleting data.
- The grantor can list and revoke their grants; the recipient cannot manage them.
- Tags, groups, journal entries, and unrelated private contacts remain private.
- Grant and revoke actions are auditable.
- Existing tag sharing continues to work, including its corrected email submission path.
- Backend, frontend, typecheck, lint, and E2E verification pass through `just`.

## Open product decision

This plan assumes broad sharing is read/write because that is the current locked sharing model. If “share all contacts” should be read-only, that is a separate authorization-model change: add a permission field, define write checks for every contact-child and interaction route, and expand the test matrix before implementation.
