# Gift Kanban Implementation Notes

## Completed Tasks

### 1. Extended GiftStatus Enum
- Added `PURCHASED` and `WRAPPED` states to the GiftStatus enum in `backend/app/models.py`
- Created Alembic migration `6639555a4ae8_add_purchased_wrapped_gift_status.py` to add these values to the PostgreSQL enum type
- Migration successfully applied to the database

### 2. Updated GiftPublic Model
- Added `days_until_occasion` computed field to `GiftPublic`
- Added `contact_birthday`, `contact_first_name`, `contact_last_name` fields for the kanban board display

### 3. Updated Gifts API
- Updated `list_gifts` endpoint to join with Contact and calculate `days_until_occasion`
- Added `/kanban` endpoint that returns gifts grouped by status with:
  - Per-status gift lists
  - Count of gifts per status
  - Total value per status
  - Overdue warning flag (birthday < 3 days && status is IDEA/PURCHASED)
- Added `/{gift_id}/change-status` endpoint for drag-and-drop functionality
  - Automatically sets `gift_date` to today when moving to GIVEN status

### 4. Frontend Updates
- Updated `GiftStatus` type in `frontend/src/client/types.gen.ts` to include 'purchased' and 'wrapped'
- Created `KanbanBoard.tsx` component with:
  - Status column display (Ideas, Purchased, Wrapped, Given, Received)
  - GiftCard component with overdue warning badge
  - Visual indicators for each status
- Added `/gifts/kanban` route
- Added "Gift Kanban" link to sidebar navigation

## Remaining Tasks

- [ ] Implement full drag-and-drop functionality in the Kanban board (currently displays placeholder)
- [ ] Add cost rollup aggregation display per status column
- [ ] Implement shared board mode for family gift coordination via tag-based access
- [ ] Add unit tests for the new API endpoints
- [ ] Regenerate frontend SDK properly (currently manually updated types)

## Technical Notes

- PostgreSQL enum alteration uses `ALTER TYPE ... ADD VALUE` which works well for adding new enum values
- The kanban board endpoint joins Gift with Contact to get birthday information for overdue calculations
- Overdue warning triggers when: `days_until_occasion < 3` AND `status in (IDEA, PURCHASED)`
- Frontend SDK generation was skipped due to environment variable issues; types were manually updated

## Database Migration

The migration file `6639555a4ae8_add_purchased_wrapped_gift_status.py`:
- Upgrades by adding PURCHASED and WRAPPED to the giftstatus enum
- Downgrade is a no-op (PostgreSQL doesn't support removing enum values easily)
