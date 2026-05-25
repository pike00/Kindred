# CardDAV Server Implementation Notes

## Date: 2026-05-03

## Status
The CardDAV server implementation appears to be complete. A Radicale-based implementation already exists in the codebase.

## Implementation Summary

### Files Implemented:
- `backend/app/carddav/__init__.py` - Package init
- `backend/app/carddav/auth.py` - HTTP Basic Auth via Radicale auth module
- `backend/app/carddav/rights.py` - Access control for CardDAV collections
- `backend/app/carddav/storage.py` - Radicale storage backend with:
  - `Collection` class implementing PROPFIND, REPORT, PUT (upload), DELETE handlers
  - `Storage` class for collection discovery and management
- `backend/app/vcard.py` - vCard 3.0 parsing/generation utilities:
  - `compute_etag()` - SHA-256 hash for ETag
  - `contact_to_vcard()` - Generate vCard from Contact model
  - `vcard_to_contact_data()` - Parse vCard to Contact data
- `backend/app/main.py` - Mounts Radicale at `/dav` with `.well-known/carddav` redirect

### Task Checklist Status:
- [x] Implement WebDAV PROPFIND handler for collection discovery (via Radicale)
- [x] Implement WebDAV REPORT (addressdata) handler for batch contact fetch with ETag (via Radicale)
- [x] Implement WebDAV PUT handler for contact creation and update with vcard parsing (via `upload()`)
- [x] Implement WebDAV DELETE handler for contact removal (via `delete()`)
- [x] Build vcard serializer aligned with Contact fields (`vcard.py`)
- [x] Wire ETag invalidation (SHA-256 via `compute_etag()`)
- [x] Add HTTP Basic Auth guard on CardDAV routes (`auth.py`)
- [ ] Test bidirectional sync with macOS Contacts and/or DAVx5 - BLOCKED (services not running)
- [ ] Document Apple client compatibility and any quirks - Not yet done

## Blocker
Docker services are not running in this worktree. Cannot verify the implementation works.

### Commands attempted:
```
docker compose ps  # Output: no containers running
docker compose -f compose.worktree.yml ps  # Failed: WORKTREE_HOST not set
```

Per guardrails, I did not attempt to start the services.

## Code Review Notes
- All CardDAV-related files compile without syntax errors
- The implementation uses Radicale 3.6.1 as a WSGI middleware mounted at `/dav`
- vCard 3.0 format is used (not 4.0)
- ETag uses SHA-256 hash of vCard content
- Apple extensions are preserved via X-CRM-* properties

## Next Steps (when services are running)
1. Start the worktree dev stack: `just up` (from worktree directory with WORKTREE_HOST set)
2. Test with macOS Contacts or DAVx5
3. Document any Apple client compatibility quirks
4. Run `docker compose exec -T backend uv run pytest backend/tests/carddav/ -v` to verify tests pass
