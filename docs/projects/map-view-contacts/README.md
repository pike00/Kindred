---
title: Map View of Contacts
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Decide on map library (Leaflet vs MapLibre) and set up /contacts/geo endpoint
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

## Notes

- **OSM tiles**: Use OpenStreetMap tiles (no Mapbox account needed, homelab-friendly). Leaflet is lightweight; MapLibre has built-in clustering but larger bundle.
- **Geocoding fallback**: Addresses without coordinates can trigger optional automatic geocoding (e.g. Nominatim) on save. Document the privacy implications.
- **Interaction location overlap**: Related feature: Interaction model may eventually track location. Coordinate schema to avoid redundancy.
- **Privacy for shared tags**: If a contact is shared via tag, ensure the map respects TagShare grants (only show contacts in shared tags to grantees).
- **Drag-to-explore bounding box**: Optional UX: allow users to drag the map, then filter contacts to visible bounds (useful for traveling).
- **Contact card integration**: Clicking a pin opens the contact card in a side panel or new tab; includes address label, all contact fields, and links to interactions/notes.
