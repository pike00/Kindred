# Journal to Contact Join - Implementation Notes

## Completed Tasks

### 1. Created Alembic Migration
- Created `backend/app/alembic/versions/f6a7b8c9d0e1_add_journal_entry_contact_junction.py`
- Migration creates `journal_entry_contact` junction table with:
  - `journal_entry_id` (FK to journal_entry, CASCADE delete)
  - `contact_id` (FK to contact, CASCADE delete)
  - Primary key on both columns
  - Indexes on both columns for query performance

### 2. Updated Models (`backend/app/models.py`)
- Added `JournalEntryContact` junction table model
- Updated `JournalEntryCreate` to include `contact_ids: list[uuid.UUID] | None = None`
- Updated `JournalEntryUpdate` to include `contact_ids: list[uuid.UUID] | None = None`
- Updated `JournalEntryPublic` to include `contact_ids: list[uuid.UUID] = []`

### 3. Updated CRUD (`backend/app/crud.py`)
- Added `JournalEntryContact` to imports
- Updated `create_journal_entry` to handle `contact_ids` and sync junction table entries

### 4. Updated Journal API (`backend/app/api/routes/journal.py`)
- Added `JournalEntryContact` to imports
- Added `sql_delete` import from sqlmodel
- Updated `create_journal_entry_route` to load `contact_ids` in response
- Updated `update_journal_entry` to sync `contact_ids` when provided
- Updated `list_journal_entries` to load `contact_ids` for each entry

### 5. Updated Contacts API (`backend/app/api/routes/contacts.py`)
- Added `JournalEntry`, `JournalEntryContact`, `JournalEntryPublic` to imports
- Added `GET /{contact_id}/reflections` endpoint to list journal entries referencing a contact

## Committed
- Commit: `82fa306` - `feat(journal): add journal_entry_contact junction table and API`

## Remaining Tasks
- [ ] Apply migration (needs running backend service)
- [ ] Test cascade behavior on contact/journal entry deletion
- [ ] Implement journal entry editor person picker UI component (frontend)
- [ ] Add "reflections" section to contact detail page (frontend)

## Privacy Model
- Journal entries remain private to owner even when linked to contacts
- Contact's `visible_contact_ids` query does NOT grant access to linked journal entries
- The `/{contact_id}/reflections` endpoint only returns journal entries owned by the requesting user

## Cascade Behavior
- Deleting a contact: Removes junction table rows (CASCADE), journal entry remains intact
- Deleting a journal entry: Removes junction table rows (CASCADE), contact remains intact
