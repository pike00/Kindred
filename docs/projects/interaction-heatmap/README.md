---
title: Interaction Heatmap per Contact
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Implement /contacts/{id}/heatmap endpoint returning week buckets grouped by ISO week
---

# Interaction Heatmap per Contact

## Goal
Display a GitHub-style 52-week grid on the contact detail page, with each cell's intensity representing the count of interactions that week. Instantly reveals relationship drift and engagement patterns.

## Tasks
- [ ] GET /contacts/{id}/heatmap endpoint returning week buckets (week start date, interaction count)
- [ ] HeatmapGrid React component rendering 52-week SVG with 5-step intensity scale
- [ ] Hover tooltip showing interaction count and week date range
- [ ] Week cell click navigation to contact timeline filtered by that week
- [ ] Intensity color scale (white -> light gray -> medium gray -> dark gray -> black)

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

## Notes

- **SQL bucketing**: Use `date_trunc('week', interaction.occurred_at)` to group interactions by ISO week (Monday-Sunday).
- **Week alignment**: ISO 8601 convention (Monday = day 1); check Postgres `EXTRACT(ISODOW ...)` for alignment verification.
- **Dark/light mode**: Color palette should respect system theme; light mode white->dark gray, dark mode light gray->dark gray with sufficient contrast.
- **Draft interactions exclusion**: Filter to only `interaction.is_active = true` (future boolean field pending schema) or exclude archived interactions.
- **Timeline pairing**: Week-click should navigate to `/contacts/{id}` and apply a date range filter to the unified timeline below the heatmap.
- **Reference model**: Interaction.occurred_at is `datetime` in UTC; interaction.contact_id is the foreign key (see [models.py](../../../backend/app/models.py) line 972).
