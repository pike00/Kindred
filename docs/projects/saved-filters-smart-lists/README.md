---
title: Saved Filters / Smart Lists
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Create SavedFilter migration and Pydantic schema for filter_json
---

# Saved Filters / Smart Lists

## Goal
Enable users to save and reuse complex contact filters (e.g., "colleagues overdue > 30d", "family with birthdays next month", "anyone in stage=prospect") as smart lists, surface them in the sidebar, and use them as the foundation for bulk operations. SavedFilter(owner_id, name, filter_json) will provide a lightweight, queryable index of saved filtering logic without hardcoding UI-specific filter states.

## Tasks
- [ ] Create SavedFilter migration (id, owner_id, name, filter_json, created_at, updated_at)
- [ ] Design and implement Pydantic schema for filter_json to enforce type safety and prevent injection
- [ ] Build safe JSON-to-SQL query compiler with allowlist of permitted fields and operators
- [ ] Implement CRUD API endpoints for SavedFilter (POST, GET, PATCH, DELETE)
- [ ] Add SavedFilter sidebar section in React frontend with list and quick-apply UX
- [ ] Wire "save current filters" CTA to auto-populate filter_json from active UI filters
- [ ] Add starter built-in filters and support filter sharing by tag

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- README drafted with schema reference and design notes.

## Notes

- **filter_json injection risk**: The filter_json column must not accept arbitrary free-form text. Define a strict Pydantic schema (e.g., FilterCondition with field, operator, value) and validate on insert. Reference `Contact` model fields in [models.py](../../../backend/app/models.py) — only allow filters on columns like first_name, last_name, company, stage, is_favorite, is_archived, birthday, contact_frequency_days, last_contacted_at, created_at. Reject unknown fields at parse time.

- **Operator allowlist**: Permitted operators depend on field type (e.g., string: "contains", "equals", "in"; date: "before", "after", "equals"; number: "gt", "gte", "lt", "lte", "equals"; boolean: "is"). Implement as a query compiler that produces parameterized SQL, never string interpolation.

- **Sidebar UX**: Render SavedFilter list as a collapsible "Smart Lists" section below Tags/Groups. Each smart list is a link; clicking applies its filter_json to the main contact table. Star icon to mark favorites; context menu to edit/delete/share.

- **Filter sharing via tags**: Allow SavedFilter to optionally reference a tag_id; only users with TagShare read access can see the filter. Omit tag_id for personal (owner-only) filters. Validates authorization at query time.

- **Pairing with bulk operations**: Once a filter is applied (URL or sidebar), the "bulk operations" feature can target the filtered set. Example: "Save filter 'Colleagues overdue' -> apply it -> bulk add tag 'Reconnect'".

- **Session-local filters**: Consider a separate ephemeral column (filter_state: JSON) on User or a temporary table for "current" filter state (don't save it). SavedFilter only captures explicitly saved filters. Avoids clutter from exploratory filtering.
