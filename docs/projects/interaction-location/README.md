---
title: Interaction Location
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Create Alembic migration to add location_label, latitude, longitude columns to Interaction table
---

# Interaction Location

## Goal
Extend Interaction to track "where we had coffee" with freeform location labels and optional geocoded lat/lon. Enables building a lifetime-of-meetups heatmap or marker map showing where all interactions with a contact occurred over time.

## Tasks
- [ ] Alembic migration: add location_label, latitude, longitude to Interaction schema
- [ ] Update InteractionBase, InteractionCreate, InteractionUpdate, InteractionPublic in models.py
- [ ] API endpoint: add location fields to interaction CRUD routes
- [ ] Frontend: add form fields (location_label text input, optional lat/lon) to interaction form
- [ ] Frontend: map marker + heatmap visualization on contact interaction detail page
- [ ] Privacy: ensure location data respects tag-based sharing (rows with shared tags expose location)

## Session Log

### 2026-04-21
- Project created.

## Notes
- Interaction schema lives in [models.py](../../../backend/app/models.py) lines 925-998; Address already has latitude/longitude (lines 636-643) for reference.
- location_label: max_length=500, optional, freeform text like "Starbucks on 5th", "their home", "the park".
- latitude/longitude: optional floats, null by default (users can omit or geocode manually; no automated geocoder required for MVP).
- Map library: Leaflet (lightweight, no API key) or MapLibre (OSM-based vector tiles); check existing map rendering in frontend.
- Tied to item 34 contact detail view — interaction list may already be on that page; add markers to any existing map.
- Sharing: if a Contact is shared via TagShare, the associated Interactions inherit the share; location fields should be visible to grantee.
- Future: optional reverse-geocode endpoint (city, address) from lat/lon; optional integration with Mapbox or geocoding service if location clustering becomes valuable.
