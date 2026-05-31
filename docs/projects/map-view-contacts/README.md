---
title: Map View of Contacts
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-05-31
next_step: Fix the 422 on /contacts/map load — ensure the geo client omits undefined bbox params (no ?min_lat=undefined) and/or relax backend Query validation; add a graceful error fallback in ContactsMap
bug: /contacts/map returns HTTP 422 on initial load (prod v0.2.84) — 2026-05-31 verification
---

# Map View of Contacts

## Goal

Visualize contacts on an interactive map by their Address.latitude/longitude. Enable fast discovery of geographically nearby contacts with clustering by city. Solve "who can I have lunch with when I'm in Boston next week?" by showing contact locations at a glance.

## Tasks

- [ ] Set up map library integration (Leaflet or MapLibre; OSM tiles)
- [ ] Create /contacts/geo backend endpoint with optional bounding-box filter
- [ ] Implement Supercluster clustering for city-level aggregation
- [ ] Add click-to-jump behavior: cluster -> zoom to city, pin -> open contact card
- [ ] Handle missing coordinates: fallback geocoding or geocode-on-save during address creation
- [ ] Privacy & sharing: respect shared-tag visibility rules on map view

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- Address model verified: latitude/longitude fields present (backend/app/models.py:636-643).
- README created with task breakdown.

### 2026-05-31
- Feature is built and deployed (route `/contacts/map` exists; tasks above predate the build and are stale). Flagged in the 0.2.x verification pass: **`/contacts/map` returns HTTP 422 on initial load** (prod, v0.2.84).
- Root-cause hypothesis (read-only): the geo endpoint `GET /contacts/geo` (contacts.py ~749) declares `min_lat/max_lat/min_lng/max_lng` as `float | None` Query params and only applies the bbox filter when **all four** are non-None. On first load `bounds` is empty, so the frontend (`ContactsMap.tsx` → `CustomContactsService.listContactsGeo`) likely sends the params as the literal string `undefined` (e.g. `?min_lat=undefined`), which fails float validation → 422. Confirm against the actual 422 response body in DevTools Network.
- Fix approach: (1) make the geo client **omit** undefined bbox params entirely rather than serialize `undefined`; (2) optionally relax the backend to tolerate partial/missing bounds and just skip the filter; (3) add a graceful error fallback in `ContactsMap` so a 422 shows a message / retries without bounds instead of leaving the view blank.
- Files: `frontend/src/components/Contacts/ContactsMap.tsx`, `frontend/src/client/custom.ts` (geo service), `backend/app/api/routes/contacts.py` (`list_contacts_geo`).

## Notes

- **OSM tiles**: Use OpenStreetMap tiles (no Mapbox account needed, homelab-friendly). Leaflet is lightweight; MapLibre has built-in clustering but larger bundle.
- **Geocoding fallback**: Addresses without coordinates can trigger optional automatic geocoding (e.g. Nominatim) on save. Document the privacy implications.
- **Interaction location overlap**: Related feature: Interaction model may eventually track location. Coordinate schema to avoid redundancy.
- **Privacy for shared tags**: If a contact is shared via tag, ensure the map respects TagShare grants (only show contacts in shared tags to grantees).
- **Drag-to-explore bounding box**: Optional UX: allow users to drag the map, then filter contacts to visible bounds (useful for traveling).
- **Contact card integration**: Clicking a pin opens the contact card in a side panel or new tab; includes address label, all contact fields, and links to interactions/notes.
