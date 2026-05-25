---
title: Relationship Graph
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Design /contacts/graph endpoint schema and pick force-directed layout library
---

# Relationship Graph

## Goal
Build an interactive force-directed graph visualization of contacts with `Relationship` edges typed by relationship_type labels. Users can zoom to any contact, explore their immediate network (2-hop default), and jump through relationships to discover connections.

## Tasks
- [ ] Design /contacts/graph endpoint (returns nodes + edges JSON, filters by depth)
- [ ] Choose force-directed layout library (d3-force vs cytoscape vs vis-network vs ELK)
- [ ] Implement React graph component with viewport controls (pan, zoom, click-to-focus)
- [ ] Add edge label rendering and relationship type legend
- [ ] Wire zoom-to-contact interaction (expand from single node, fetch 2-hop neighborhood)
- [ ] Performance tuning for large networks (canvas vs SVG, node culling, edge bundling)

## Session Log

### 2026-04-21
- Project created.
- Relationship model reviewed: directional edges with relationship_type + optional notes.
- Handoff structure initialized (README + empty handoffs/ subdirectory).

## Notes

- **2-hop default viewport**: Load root contact + direct relationships + their neighbors. Full-graph rendering is expensive (O(n^2) force simulation); 2-hop is readable and avoids cognitive overload.

- **Inverse relationship mapping**: Model is directional; symmetric relationships like "spouse" need two rows (A->B and B->A). Consider UI affordance to suggest/auto-create inverses when user adds a relationship.

- **Household feature pairing**: Relationship Graph pairs well with a "household" grouping feature (contacts linked by proximity, shared address, or is_related flag). Could highlight households as node clusters or subgraph.

- **Canvas vs SVG tradeoff**: SVG scales to ~500 nodes smoothly; canvas needed for 1000+. Start with SVG, measure performance, only switch if profiling shows layout/render time > 100ms.

- **Filter by tag/group**: Query param ?tag=family&tag=work allows filtering visible relationships before rendering. Reduces rendering load and helps focus on relationship subsets.

- **Pin/lock nodes**: Let user anchor high-degree nodes (hubs like "boss" or "parent") so force simulation doesn't shake them around. Improves navigation stability.

- **Relationship labels on edges**: Show relationship_type as small text on edges. For dense areas, conditionally render only high-weight relationships (many interactions) to avoid label soup.
