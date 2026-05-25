---
title: Household / Family Aggregate View
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-05-15
next_step: Released as v0.1.8 (BFS walk implementation in app.household). Recursive CTE optimization, caching, and household visibility controls remain as follow-ups.
---

# Household Aggregate View

## Goal

Derive a logical household/family unit from chains of spouse, child, parent, and sibling relationships without adding a new database table. Display the household on a contact detail page as "Household: Alice, Bob, Max (13), Riley (7)" to support gift occasions, visit planning, and family-centric relationship management.

## Tasks

- [x] Design Household model and membership derivation logic (chose in-app BFS walk in `app.household`)
- [x] Implement /contacts/{id}/household endpoint returning names + ages
- [x] Add cycle detection and max_depth guard to prevent infinite loops
- [ ] Define caching strategy (time-based TTL, invalidation on Relationship mutations)
- [x] Build household panel component on contact detail page with household members list
- [ ] Add household visibility controls (shared-row access scope for multi-user scenarios)
- [ ] Handle age calculation from Contact.birthday field

## Session Log

### 2026-05-15
- Squash-merged `dirac/household-aggregate-view` into main as commit `6b8b1b0`; tagged and released **v0.1.8**.
- Landed: `backend/app/household.py` (BFS walk over relationship graph with cycle detection), `GET /contacts/{id}/household` endpoint, and `frontend/src/components/Contacts/HouseholdCard.tsx` panel on the contact detail page.
- Conflict resolution: kept HEAD's full `contacts.py` (bulk operations, overdue contacts, skip, iMessage sync — all features that landed in earlier waves) and grafted the branch's `get_contact_household` endpoint plus `from app.household import get_household_members` onto the file. The squash's three-way merge had put HEAD's `list_contact_mentions` body inside the new household function — discarded that conflict region since the canonical mentions endpoint lives separately at contacts.py:686-728.

### 2026-04-21
- Project created.

### 2026-04-23
- README and project structure initialized.

## Notes

### 2026-05-15
- **Decisions:** Chose in-app BFS walk over PostgreSQL recursive CTE for MVP. CTE optimization can come later if N+1 cost shows up under load.
- **Gotchas:** During the squash merge, git's three-way merge dropped HEAD's `list_contact_mentions` query body into the new `get_contact_household` function position. The fix was to take HEAD wholesale for contacts.py and graft the household endpoint manually at the end.
- **Accomplished:** v0.1.8 shipped. Household derivation usable from any contact's detail page.

- **Relationship model reference**: See [models.py](../../../backend/app/models.py) for Relationship class. Each directional link has `contact_id` (from), `related_contact_id` (to), and `relationship_type` (string field). Symmetric relationships (spouse, sibling) must be created bidirectionally as separate rows.

- **Recursive vs walk choice**: A PostgreSQL recursive CTE (WITH RECURSIVE) in the database offers determinism and performance for large families, but requires schema support. In-app BFS walk via SQLAlchemy relationships is simpler initially but requires N+1 care. Consider CTE as an optimization after MVP.

- **Prerequisite**: Relationship inverse mapping feature (e.g. "if spouse goes both directions, sibling should too") should be completed first to reduce data inconsistency when building household chains.

- **Cycle detection**: Add max_depth guard (e.g. depth <= 10) to the walk to bail on circular references. Log warnings for unexpected cycles in test data.

- **Visibility & multi-user**: Household derivation must respect tag-based row sharing; a contact in a shared tag should only show household members also visible to the grantee. Encode this as a scope filter on the BFS walk.

- **Age calculation**: Use Contact.birthday to compute age at query time. Show age in parentheses (e.g. "Max (13)"). Null birthday shows name only.
