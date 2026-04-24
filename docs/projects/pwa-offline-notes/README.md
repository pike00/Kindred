---
title: PWA Installability and Offline Note Drafting
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-23
next_step: Integrate vite-plugin-pwa into Vite config
---

# PWA Installability and Offline Note Drafting

## Goal

Make the personal-crm React frontend installable as a PWA on iOS (A2HS) and Android (install banner), with offline-first service worker caching the app shell. Notes drafted offline are queued to IndexedDB and synced to the backend when reconnected, enabling users to keep working through network interruptions.

## Tasks

- [ ] Install and configure vite-plugin-pwa in Vite build
- [ ] Create manifest.json with app metadata, iOS splash screens, and icon assets (192px and 512px)
- [ ] Implement Workbox service worker with cache-first strategy for app shell, network-first for API
- [ ] Design IndexedDB draft queue schema (note ID, content, timestamp, sync status)
- [ ] Implement background sync with manual retry fallback for iOS (lacks Background Sync API)
- [ ] Add install prompt UI (show banner on Android, A2HS passive on iOS)
- [ ] Ensure idempotent POSTs via client-generated UUIDs to prevent double-writes on reconnect
- [ ] Cache-busting on deploy to prevent stale service workers

## Session Log

### 2026-04-21
- Project created.

### 2026-04-23
- Project README and handoffs directory initialized.

## Notes

- **Cache-first for app shell:** Static assets (JS, CSS, HTML, images) cached at install time; invalidated on deploy via versioned paths or manifest hash.
- **Network-first for API:** POST/GET to `/api/*` always attempts network; falls back to IndexedDB draft cache only for offline state.
- **IndexedDB draft queue:** Each draft stores `{ uuid, noteId, contactId, content, createdAt, syncedAt, error }` with UUID as primary key for idempotency.
- **Background sync on reconnect:** Uses Service Worker `sync` event (web) or manual polling (iOS); queued drafts are POSTed in order, marked synced on 2xx, retain error message on failure.
- **iOS fallback:** Since A2HS is user-initiated and iOS lacks Background Sync API, show a soft prompt on app launch if offline drafts exist; users must manually retry or sync.
- **Idempotent POSTs:** Client generates UUID for each draft before submission; backend deduplicates on UUID, allowing safe retry without data loss.
- **Manifest and icons:** Manifest served from `/manifest.json` with scope `/`, icons at `/icons/192.png` and `/icons/512.png`; iOS requires `apple-touch-icon` meta tag in `<head>`.
- **Interaction drafts pairing:** This feature slots into the interaction timeline; offline drafts appear with pending state (gray icon) until synced, then refresh to normal.
