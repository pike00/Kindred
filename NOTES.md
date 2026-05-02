# Bulk Contact Operations - Implementation Notes

## Status
Implementation appears complete based on code review. All task items have corresponding code:

### Completed:
- [x] Add selection state to list component (checkbox UI, track selected IDs)
- [x] Implement floating action bar with bulk action buttons
- [x] Create /contacts/bulk PATCH endpoint for atomic server-side mutations
- [x] Add dry-run preview modal for destructive operations (archive, tag removal)
- [x] Implement select-all-filtered logic (server-side filter matching, pagination-aware)
- [x] Integrate CSV export and undo toast notifications

### Backend Implementation:
- Models: `BulkContactRequest`, `BulkContactOperation`, `BulkContactFilter` in `backend/app/api/routes/contacts.py`
- Endpoints: `PATCH /api/v1/contacts/bulk` and `GET /api/v1/contacts/bulk/preview`
- Transaction support for atomic all-or-nothing semantics
- Server-side filtering with `_build_filtered_contact_stmt()`
- Limit of 500 contacts per request (safety cap)

### Frontend Implementation:
- `ContactsList.tsx` with multi-select checkboxes
- Floating action bar with bulk action buttons
- Preview modal for confirming destructive actions
- CSV export via `/api/v1/import-export/export/csv`
- Undo functionality with toast notifications

### Tests:
- `backend/tests/api/test_bulk_contacts.py` with 12 test cases covering all bulk operations

## Verification Issue
Cannot verify implementation because Docker services are not running:

```
$ docker compose ps
NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS
(empty - no services running)
```

The worktree compose file (`compose.worktree.yml`) requires `WORKTREE_HOST` environment variable which is normally set by `just up`. However, the instructions explicitly forbid starting services:

> "The dev stack (db, backend, worker, redis, meilisearch, frontend) is ALREADY running. Do not start, stop, restart, recreate, or rebuild it."
> "If a service appears unhealthy, write to NOTES.md and stop. Do NOT try to recover it."

## Attempted Verification
1. `docker compose exec -T backend uv run pytest tests/api/test_bulk_contacts.py -x -q` - Failed: service "backend" is not running
2. `docker compose exec -T frontend bun run typecheck` - Failed: service "frontend" is not running
3. Direct backend test execution - Failed: Missing POSTGRES_SERVER environment variable (needs Docker database)

## Recommendation
The implementation appears complete based on code review. Once the Docker services are started (by the runner or user), verification should be performed:

1. Run backend tests: `docker compose exec -T backend uv run pytest tests/api/test_bulk_contacts.py -x -q`
2. Run frontend typecheck: `docker compose exec -T frontend bun run typecheck` (note: "typecheck" script not in package.json, may need to use "lint" instead)
3. Manual testing of the UI to verify bulk operations work end-to-end

## Frontend Script Note
The `package.json` does not have a "typecheck" script. It has "lint" which uses Biome. The verification step may need to be adjusted to use `bun run lint` or add a "typecheck" script that runs `tsc --noEmit`.
