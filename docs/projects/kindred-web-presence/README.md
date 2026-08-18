---
title: Kindred Web Presence
status: active
repos: [kindred]
started: 2026-05-22
last_updated: 2026-08-04
next_step: Choose hosting target (Cloudflare Pages or GitHub Pages) and deploy
---

# Kindred Web Presence

## Goal

Build two public-facing sites for Kindred: (1) a marketing/info landing page that explains what Kindred is, highlights its features, and includes screenshots, and (2) a live demo deployment of the Kindred app pre-seeded with sample data so visitors can try it out without signing up for a real account.

## Tasks

- [x] Decide marketing site tech stack (plain HTML + Tailwind CDN — no build step)
- [x] Design landing page structure: hero, feature highlights, screenshots, call-to-action
- [x] Build marketing/info site content and layout
- [ ] Choose hosting for marketing site (Cloudflare Pages, GitHub Pages, etc.)
- [ ] Deploy marketing site and wire DNS
- [ ] Configure demo Kindred instance with seeded sample contacts/interactions
- [ ] Gate demo with read-only mode or a shared demo account
- [ ] Wire DNS for demo instance (e.g. `demo.kindred.example.com`)
- [ ] Verify version + git hash visible in demo UI footer

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-05-23
- Built `website/index.html` — full marketing landing page with Tailwind CDN (no build step)
- Sections: sticky nav, hero + CTA, dashboard screenshot, 9-feature grid, 6-screenshot gallery, self-host + code snippet, dark CTA banner, footer
- Screenshots served from GitHub raw URLs; all 8 app screenshots referenced
- Committed and pushed as `feat: kindred-web-presence marketing landing page`

### 2026-05-22
- Project scaffolded — goal: marketing landing page (explain + feature showcase) + live seeded demo deployment
- work-in-progress — no commits yet

## Notes

### 2026-05-22
- **Decisions:** Two distinct sites: a static marketing page and a live Kindred instance; demo will need either a shared login or read-only guard so strangers can't modify seed data
- **Gotchas:** Demo seeding should be deterministic (`just seed-fixed`) so the instance looks polished; randomized seed data may surface awkward generated names
- **Issues:** Tech stack for marketing site not yet chosen; hosting target not decided
- **Accomplished:** Project created; scope defined (info site + demo deployment)

### 2026-05-23
- **Decisions:** Plain HTML + Tailwind Play CDN (no build step, deploys to any static host as-is); screenshots via GitHub raw URLs so they stay in sync with the repo
- **Gotchas:** Tailwind Play CDN is fine for a low-traffic marketing page but should be swapped for a proper Tailwind build if the site grows; `cdn.tailwindcss.com` generates CSS at runtime in the browser
- **Issues:** Hosting target not yet chosen; DNS not wired; demo site still pending
- **Accomplished:** `website/index.html` — full landing page shipped (nav, hero, 9-feature grid, 6 screenshots, self-host section with code block, CTA banner, footer)
