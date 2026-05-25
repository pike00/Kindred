# Contact Merge History - Implementation Notes

## Status: Partially Complete

### Completed:
1. **Migration**: `f6a7b8c9d0e1_add_contact_merge_and_is_merged.py` - Creates `contact_merge` table and adds `is_merged` flag to contact
2. **Models**:
   - `ContactMerge` model with `surviving_id`, `absorbed_id`, `merged_by`, `merged_at`, `notes`
   - `Contact` model has `is_merged` and `merged_into_id` fields
3. **Merge Service**: `backend/app/merge_service.py` with:
   - `merge_contacts()` - Handles merging two contacts, rewriting all FK references
   - `unmerge_contact()` - Reverses a merge operation
   - `get_merge_logs()` - Lists merge audit log entries
4. **API Endpoints** in `backend/app/api/routes/contacts.py`:
   - `POST /api/v1/contacts/merge` - Merge two contacts
   - `POST /api/v1/contacts/{contact_id}/unmerge` - Unmerge a contact
   - `GET /api/v1/contacts/merge-logs` - List merge audit logs

### Issues Encountered:
1. **SQLAlchemy Relationship Issue**: The original implementation had ORM relationships between `Contact` and `ContactMerge` models that caused SQLAlchemy to fail when resolving the string references. The error was:
   ```
   sqlalchemy.exc.InvalidRequestError: When initializing mapper Mapper[Contact(contact)], expression 'Contact | None' failed to locate a name
   ```

   **Solution**: Removed the ORM relationships (`back_populates`) from both `Contact` and `ContactMerge` models. The foreign key fields remain for lookups, but the ORM relationship overhead was removed to avoid the resolution issue.

2. **Backend Service Not Running**: The Docker backend service is not running in this worktree, so tests could not be executed. According to the rules, I should NOT start/stop services.

### Remaining Tasks:
1. **Testing**: Run `docker compose exec -T backend uv run pytest -x -q` to verify the implementation
2. **Frontend UI**: Implement the duplicate detection UI and merge audit view in the frontend
3. **Verification**: Test merge/unmerge with interactions, notes, relationships, debts, gifts, etc.

### Technical Decisions:
1. **Soft-delete strategy**: `is_merged` flag on Contact (not `is_archived`)
2. **Two-way relationships**: During merge, both `contact_id` and `related_contact_id` are rewritten
3. **Audit trail**: `contact_merge` table tracks all merges for unmerge operations
4. **Reversibility**: Absorbed contacts are not hard-deleted, so unmerge is possible

### Commit History:
- `c51844b` feat(merge): add merge/unmerge service and API endpoints
- `ee54db1` feat(merge): add merge support to Contact model and API endpoints
- `6ca8d77` feat(frontend): update SDK after ContactMerge model changes
