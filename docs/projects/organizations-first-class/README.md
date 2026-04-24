---
title: Organizations as First-Class
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Organization model and schema migration; define dedupe strategy by trimmed/lowercased company string
---

# Organizations as First-Class

## Goal
Promote Contact.company (currently a free-text string field) into a first-class Organization entity with its own record. This enables rich organization metadata (address, domain, industry, notes), querying all contacts at a given company, and laying groundwork for future org-level features like tagging and auto-linking via domain matching.

## Tasks
- [ ] Create Organization model (address, domain, industry, notes) and Alembic migration
- [ ] Write data migration to dedupe existing Contact.company strings (case-insensitive, trimmed) and create Organization records
- [ ] Add nullable foreign_key on Contact pointing to Organization; keep legacy company string during transition
- [ ] Expose organization CRUD endpoints in FastAPI backend
- [ ] Wire organization picker into contact create/edit form on frontend
- [ ] Build organization detail page showing all linked contacts
- [ ] Remove legacy Contact.company field after migration window (post-transition)

## Session Log

### 2026-04-21
- Project created.

## Notes
- Dedupe strategy: trim and lowercase existing Contact.company strings; combine duplicates into a single Organization record. Preserve the original company string in the Organization name field (not lowercased) for display.
- Transition period: keep Contact.company column during rollout so users can re-sync from external sources (e.g. Contacts app export) without data loss. Once all user imports are verified, remove it.
- Organization merge semantics: when users manually merge two Organization records, reassign all Contact rows from the old org to the new one, then delete the old record.
- Domain-match hint for future auto-linking: store domain (e.g. 'acme.com') on Organization so the system can eventually auto-detect new hires via email domain matching.
- Org-level tagging: organizations can eventually get their own tags (separate from contact tags) for grouping and access control; reserve room in the schema now.
- Reference: [models.py](../../../backend/app/models.py) Contact.company is currently a nullable string, max 255 chars. New Organization table will be user-scoped (owner_id FK to User).
