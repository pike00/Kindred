---
title: Inline Contact Editing UI
status: active
repos: [kindred]
started: 2026-08-18
last_updated: 2026-08-20
next_step: Review live preview on tailnet and merge PR to main
---

# Inline Contact Editing UI

## Goal
Replace static contact view fields with modern inline editable textboxes, datepickers, and dropdowns on contact detail pages.

## Tasks
- [x] Create reusable inline editing primitives (`InlineText`, `InlineTextarea`, `InlineDate`) in `frontend/src/components/ui/inline-edit.tsx`
- [x] Create modern inline editable header (`InlineContactHeader.tsx`) for contact name, title, company, favorite, and archive
- [x] Create modern inline details card (`InlineContactDetailsCard.tsx`) for nickname, pronouns, birthday, timezone, frequency, and how we met
- [x] Integrate components into contact detail route `frontend/src/routes/_layout/contacts/$contactId.tsx`
- [x] Pin React & React DOM dependencies to `19.2.8` to fix runtime error
- [x] Remove buggy `TanStackRouterDevtools` causing client unhandled rejections
- [x] Optimize Vite dev server config (disable watch polling & dev service worker)
- [ ] Review live preview on tailnet and open PR to main

## Session Log

### 2026-08-18
- Built modern inline contact editing UI components (`InlineContactHeader`, `InlineContactDetailsCard`, `inline-edit.tsx` primitives)
- Resolved React 19 dependency mismatch by pinning `react` and `react-dom` to `19.2.8`
- Fixed client page freeze by removing buggy `TanStackRouterDevtools`
- Optimized Vite dev server performance by disabling CPU-heavy watch polling and dev ServiceWorker
- Validated TypeScript typecheck (`bunx tsc --noEmit`) and Tailnet preview server (`http://willbook.savannah-mimosa.ts.net:8264/` - 200 OK)

## Notes

### 2026-08-18
- **Decisions:** Use inline click-to-edit pattern with automatic blur/enter save triggers for contact detail fields.
- **Gotchas:** React 19 requires exact matching versions between `react` and `react-dom`; mismatched patch versions (`19.2.6` vs `19.2.8`) cause runtime errors. `@tanstack/react-router-devtools` v1.170 throws unhandled rejections in dev mode.
- **Accomplished:** Added inline editable fields across contact header and detail cards; fixed React version drift; tuned dev server performance; committed (`ed8fa8f`) and pushed to `origin/feat/inline-contact-edit`.
