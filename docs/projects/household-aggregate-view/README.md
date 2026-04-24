---
title: Household / Family Aggregate View
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Define Household model schema and derive relationship chains via recursive CTE
---

# Household Aggregate View

## Goal

Derive a logical household/family unit from chains of spouse, child, parent, and sibling relationships without adding a new database table. Display the household on a contact detail page as "Household: Alice, Bob, Max (13), Riley (7)" to support gift occasions, visit planning, and family-centric relationship management.

## Tasks

- [ ] Design Household model and membership derivation logic (recursive CTE vs in-app BFS walk)
- [ ] Implement /contacts/{id}/household endpoint returning names + ages
- [ ] Add cycle detection and max_depth guard to prevent infinite loops
- [ ] Define caching strategy (time-based TTL, invalidation on Relationship mutations)
- [ ] Build household panel component on contact detail page with household members list
- [ ] Add household visibility controls (shared-row access scope for multi-user scenarios)
- [ ] Handle age calculation from Contact.birthday field

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- README and project structure initialized.

## Notes

- **Relationship model reference**: See [models.py](../../../backend/app/models.py) for Relationship class. Each directional link has `contact_id` (from), `related_contact_id` (to), and `relationship_type` (string field). Symmetric relationships (spouse, sibling) must be created bidirectionally as separate rows.

- **Recursive vs walk choice**: A PostgreSQL recursive CTE (WITH RECURSIVE) in the database offers determinism and performance for large families, but requires schema support. In-app BFS walk via SQLAlchemy relationships is simpler initially but requires N+1 care. Consider CTE as an optimization after MVP.

- **Prerequisite**: Relationship inverse mapping feature (e.g. "if spouse goes both directions, sibling should too") should be completed first to reduce data inconsistency when building household chains.

- **Cycle detection**: Add max_depth guard (e.g. depth <= 10) to the walk to bail on circular references. Log warnings for unexpected cycles in test data.

- **Visibility & multi-user**: Household derivation must respect tag-based row sharing; a contact in a shared tag should only show household members also visible to the grantee. Encode this as a scope filter on the BFS walk.

- **Age calculation**: Use Contact.birthday to compute age at query time. Show age in parentheses (e.g. "Max (13)"). Null birthday shows name only.
