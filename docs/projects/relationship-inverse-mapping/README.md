---
title: Relationship Inverse Mapping
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Design inverse mapping table and seed data structure
---

# Relationship Inverse Mapping

## Goal
When a user creates a directional relationship (e.g. "Alice spouse Bob"), automatically create the inverse (e.g. "Bob spouse Alice"). Implement a mapping table to define symmetry rules (spouse<->spouse, parent<->child, friend<->friend), with clear conflict resolution for asymmetric labels and edit-conflict handling.

## Tasks
- [ ] Create inverse_relationship_map seed table (relationship_type pairs with forward/inverse labels)
- [ ] Implement service-layer relationship creator that checks map and auto-creates inverse
- [ ] Design Alembic migration to backfill inverses for existing relationships
- [ ] Implement idempotency: prevent duplicate inverses on edit or retry
- [ ] Define conflict resolution: what happens when user edits only one side of a symmetric pair
- [ ] Add tests for mapping edge cases (self-referential, missing map entries, label mismatches)

## Session Log

### 2026-04-21
- Project created.

## Notes

- **Relationship Model (lines 708-737):** Directional link with `contact_id` (from), `related_contact_id` (to), and `relationship_type` (string label). Current docs say "create two rows" for symmetric relationships; inverse mapping automates this.

- **Trigger vs Service Layer:** Trigger approach is fast but harder to unit test and reason about; service-layer approach is explicit, testable, and easier to instrument. Recommend service layer to pair well with REST endpoints.

- **Symmetric vs Asymmetric Labels:** Symmetric (spouse<->spouse, friend<->friend) vs asymmetric (parent<->child, manager<->report). Mapping table must handle both; asymmetric pairs need distinct forward/inverse labels.

- **Edit-only-one-side Problem:** If user edits "Alice spouse Bob" to "Alice friend Bob", should the inverse flip automatically? Strict consistency requires updating both. Consider a "cascade" flag on the inverse pair to auto-update or flag conflicts.

- **Household View Integration (item 11):** Inverse mapping feeds into household grouping; households could auto-include bidirectional family relationships (spouse, parent, child, sibling) without manual tagging.

- **Relationship Graph Visualization (item 35):** Graph layout benefits from bidirectional edges; inverse mapping ensures every relationship has a reciprocal path, improving layout symmetry and discoverability.
