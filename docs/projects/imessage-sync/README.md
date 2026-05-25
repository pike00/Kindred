---
title: Kindred — iMessage Social Graph Integration
status: to_review
repos: [personal-crm, message_metadata_extraction]
started: 2026-05-03
last_updated: 2026-05-03
next_step: Define contact upsert API endpoint accepting iMessage profile payload; design field mapping
---

# Kindred — iMessage Social Graph Integration

## Goal
Import the iMessage social graph (`output/graph/social.json`) and per-contact profiles into
kindred as the primary CRM enrichment source. Each resolved iMessage contact maps to a kindred
contact (created or updated), enriched with: relationship_type, key_events, topics,
facts_about_other, pattern_notes, message stats (volume, recency), and a last-messaged date.
The social.json edges (direct, co_mention) inform kindred relationship edges between contacts.

## Tasks
- [ ] Design `POST /api/contacts/imessage-sync` endpoint accepting iMessage profile payload (or extend existing contact upsert)
- [ ] Map iMessage → kindred contact fields: `relationship_type` → kindred relationship stage/label; `key_events` → interaction log entries; `facts_about_other` → notes body; `last_ts` → last_contacted_at
- [ ] Map iMessage co_mention edges → kindred relationship edges (contact A ↔ contact B with type "co-mentioned")
- [ ] Add `imessage_id` field to kindred contacts table for stable cross-system identity (E.164 phone or email)
- [ ] Write Alembic migration for `imessage_id` column + imessage_synced_at timestamp
- [ ] Implement idempotent upsert: match by phone E.164 or email; update if changed, skip if same hash
- [ ] Add `/api/contacts/{id}/imessage-profile` GET endpoint returning raw iMessage profile for UI display
- [ ] Frontend: add "iMessage data" section in contact detail view showing message stats + pattern_notes
- [ ] Add social graph visualization powered by `social.json` edge data to the existing `relationship-graph` project (complement, not replace — iMessage edges are richer signal)
- [ ] Expose sync status in contact list: badge or icon indicating contacts with iMessage enrichment

## Session Log

### 2026-05-03
- personal-crm already has `relationship-graph` project (vis-network graph visualization) — this is a data integration that feeds into it
- kindred API key auth ships with kk_ prefix (project_kindred_api_key_implementation_patterns.md); M2M sync from message_metadata_extraction uses service account key
- social.json has 655 nodes + 1126 edges; per-contact profiles cover 429 resolved contacts
- Co-mention edges are a unique signal not available in kindred today — they reveal who talks about whom

## Notes

### 2026-05-03
- **Decisions:** iMessage is an enrichment source, not the authoritative contact store — kindred remains primary; iMessage data annotates existing contacts rather than replacing manually-curated fields
- **Gotchas:** Some iMessage contacts are unresolved (no vCard match, flagged_unresolved=True); skip these in sync or create them as "imported, unverified" contacts with lower confidence
- **Issues:** relationship_type in iMessage ("close_friend", "family") and kindred's relationship model may not map 1:1; treat as tags/labels rather than replacing kindred's relationship type field
- **Accomplished:** Architecture designed; cross-repo dependencies identified; no code written
