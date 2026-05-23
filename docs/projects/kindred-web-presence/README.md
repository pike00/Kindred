---
title: Kindred Web Presence
status: active
repos: [kindred]
started: 2026-05-22
last_updated: 2026-05-22
next_step: Decide tech stack for the marketing site and pick a hosting target
---

# Kindred Web Presence

## Goal

Build two public-facing sites for Kindred: (1) a marketing/info landing page that explains what Kindred is, highlights its features, and includes screenshots, and (2) a live demo deployment of the Kindred app pre-seeded with sample data so visitors can try it out without signing up for a real account.

## Tasks

- [ ] Decide marketing site tech stack (Astro, plain HTML, or other SSG)
- [ ] Design landing page structure: hero, feature highlights, screenshots, call-to-action
- [ ] Build marketing/info site content and layout
- [ ] Choose hosting for marketing site (Cloudflare Pages, GitHub Pages, etc.)
- [ ] Deploy marketing site and wire DNS
- [ ] Configure demo Kindred instance with seeded sample contacts/interactions
- [ ] Gate demo with read-only mode or a shared demo account
- [ ] Wire DNS for demo instance (e.g. `demo.kindred.example.com`)
- [ ] Verify version + git hash visible in demo UI footer

## Session Log

### 2026-05-22
- Project scaffolded — goal: marketing landing page (explain + feature showcase) + live seeded demo deployment
- work-in-progress — no commits yet

## Notes

### 2026-05-22
- **Decisions:** Two distinct sites: a static marketing page and a live Kindred instance; demo will need either a shared login or read-only guard so strangers can't modify seed data
- **Gotchas:** Demo seeding should be deterministic (`just seed-fixed`) so the instance looks polished; randomized seed data may surface awkward generated names
- **Issues:** Tech stack for marketing site not yet chosen; hosting target not decided
- **Accomplished:** Project created; scope defined (info site + demo deployment)
