# Frontend security remediation

Date: 2026-10-26. Base: `57b6d9bef02760f8f0524984a201e4bdebc14a9a`
(deployed v0.2.123). Branch: `codex/kindred-security-remediation`.
Initial implementation: `b5fc82402eca3b548ecb7037f839cce28efef646`.
The subsequent review-fix commit containing this report addresses F1/F2/F3 in
`frontend-review.md`; its final SHA is supplied in the parent handoff.
No newer feature work was merged.

## Behavior

- Private `/api/` GETs use Workbox NetworkOnly. API navigations cannot receive
  the SPA shell. The generated worker imports a permanent migration that deletes
  legacy `api-cache` on activation, on safety handshakes, and on private fetches.
  This removes both response bodies and cached Requests bearing Authorization.
  It never reads or recreates that cache. Later private fetches also remove a
  stale legacy cache if one is present.
- New application code checks an installed controlling worker before mounting
  private queries/routes. An old worker must update and relinquish control to a
  worker confirming the NetworkOnly protocol. If that cannot happen offline,
  the page shows a reconnect/reload message instead of using the legacy worker.
  The change listener is installed before the first probe; every probe compares
  its worker with the actual current controller. Startup accepts a safe successor
  even if it activates during the initial old-worker probe, and cannot accept a
  stale safe response after an unsafe replacement takes over.
- Removed redundant absolute icon precache inclusion. The existing icons remain
  in the glob precache. Executing the generated worker exposed conflicting keys
  from duplicate icon inclusion; leaving that intact would prevent activation.
- Auth transitions synchronously invalidate a session generation, abort all its
  transport requests, clear shared query/mutation state, and discard mounted
  application state. Login/logout use full-document navigation, so router loader
  caches, mutation callbacks and component-local state cannot cross accounts.
  Each generation binds its first credential before accepting work or a verified
  owner. Observable localStorage drift immediately clears the old account state
  and reloads without deleting the sibling's newly installed token, even before
  the browser delivers the storage event. A simultaneous pending login response
  cannot overwrite that sibling token.
- SDK session checks use its supported header/request/response hooks, outside
  generated files, and capture credentials before its first asynchronous boundary.
  The internal request marker is removed before transport. Late success or denial
  from an old generation is rejected. Direct private fetches and body reads use
  equivalent guards. The direct-fetch transport captures before asynchronous
  credential resolution and verifies both the resolved bearer and any supplied
  Authorization header against that fixed snapshot before sending. Callers no
  longer resolve credentials outside the guard. SDK regeneration cannot erase
  this integration. CSV export uses the guarded access-token source and a real
  component regression verifies bearer, download and session preservation.
- Bearer login responses are rejected if logout occurred while login was pending.
  API 401/403 and Access HTML-login responses trigger teardown. Cloudflare logout
  uses the same teardown, private route entry verifies cookie-backed identity,
  and current-user queries revalidate on every focus/reconnect. A changed verified
  account exits before publishing its response. Sibling-tab credential/session
  events and BFCache restoration reload the page while preserving an already
  installed sibling-tab token.
- Offline drafts require a server-verified owner. IndexedDB v2 uses composite
  `[ownerId, id]` keys; every read/write/update/delete is scoped to the current
  verified owner and generation. Pending reads now enumerate owner records,
  fixing the missing-syncedAt index problem. Sync uses the draft's original
  contact and only the current contact's queue; repeated renders cannot start
  concurrent auto-sync loops. A synthetic component test switches A to B and
  verifies only B's current-contact draft is sent.
- Legacy v1 drafts have no evidence of ownership. The upgrade transaction renames
  the old store to `unowned-draft-quarantine`, preserves its text, and creates a
  fresh owned queue. No normal application API reads, renders, exports or replays
  quarantined records. A one-time notice explains the quarantine. Other old tabs
  blocking migration produce a close-tabs/reload error. Recovery requires separate
  evidence of ownership; the migration does not guess the next login owns them.

## Dependencies

The baseline pnpm audit reproduced 44 advisory entries: 16 high, 20 moderate,
8 low. No advisory suppressions, omissions, forced updates or major-version
upgrades were used. The canonical pnpm lock is authoritative; stale Bun lock
files were not substituted. Compatible parent/transitive updates resolved all
reported entries. One narrow override updates the old pinned OpenAPI parser's
API-compatible `js-yaml` 4.x dependency. Runtime query/router updates also satisfy
the router-plugin/query-devtools peer ranges. `pnpm peers check` passes.

| Affected package | Final resolved version |
| --- | --- |
| zod | 4.6.7 |
| vite | 8.3.5 |
| vitest / @vitest/mocker | 4.1.12 |
| undici | 7.30.1 |
| js-yaml | 4.3.2 |
| fast-uri | 3.1.9 |
| follow-redirects | 1.16.2 |
| source-map-js | 1.2.2 |
| seroval | 1.7.2 |
| serialize-javascript | 7.1.4 |
| brace-expansion | 2.1.7 / 5.0.12 |

Zod form arrays now have explicit collection limits. MediaPipe remains 0.10.35
with the existing jsDelivr WASM and Google model URLs. `frontend/index.html`
inline scripts are unchanged.

## Verification

Fresh final checks on this tree:

- `just typecheck`: pass, including test sources. Fixed pre-existing fixtures
  by retaining their typed overdue extension and using the existing complete
  contact factory; no production schema or assertions were weakened.
- `just test-frontend`: 95 files, 1,976 tests pass after the review fix wave.
- `pnpm --filter frontend build`: pass with PWA enabled (no `VITE_E2E`).
- `node frontend/scripts/verify-private-service-worker.mjs`: pass. Executes the
  generated worker and bundled Workbox in a synthetic VM, verifies initialization,
  activation purge, uncached success, unchanged 401/403, network-error rejection,
  and deletion without replay of a synthetic late legacy-cache write.
- New transport tests exercise actual SDK request construction with synthetic
  Axios adapters, cancellation, late response handling, B's route-loader cache
  lookup, queued credential changes, 401/403, Access HTML, identity switches,
  late login and fetch-body completion, sibling-tab token preservation, work
  started in the pre-storage-event drift window, mismatched supplied bearers,
  and asynchronous credential resolution crossing that boundary.
- Six worker-startup tests cover first visit, safe-controller handshake,
  replacement of an old controller, offline refusal, handoff during the initial
  probe, and rejection of a safe reply from a controller already superseded.
- Real fake-indexeddb transactions test owned draft isolation, pending reload,
  cross-account mutation refusal (including pre-storage-event credential drift),
  and preservation/quarantine of legacy text.
- Biome on changed production/config/helper files and `git diff --check`: pass.
- `pnpm audit --json`: zero vulnerabilities across the complete final graph.

Test output retains pre-existing jsdom navigation notices from tests outside the
changed auth tests and a Vite warning about future native configuration loading.
Neither is a failed test or an unhandled security probe. No browser automation,
network server, real user records, secrets, deployment or public publication was
used. Build assets embed the build-time Git hash; release images must rebuild
from the final reviewed commit for correct source/asset provenance.

## Limits and remaining review concerns

- Owned offline drafts and legacy quarantine remain plaintext in the browser
  profile. Account scoping prevents application replay/display across accounts;
  it does not protect against arbitrary same-origin JavaScript or profile access.
- Drafts remain available after the same account is verified again. A fresh
  offline page cannot infer ownership until current-user verification succeeds.
  An already verified active page retains offline capture and later sync.
- A completely out-of-band Cloudflare cookie account change has no JavaScript
  event. Identity is revalidated on private route entry/focus/reconnect and auth
  errors. Backend identity binding on every response would be needed to prove
  correspondence during otherwise invisible concurrent cookie transitions.
- The VM inserts a synthetic stale cache after activation to verify cleanup and
  no replay. This does not demonstrate a retiring-worker write race. The service
  worker activation algorithm terminates the previous active worker and Workbox
  extends fetch-event lifetimes for cache writes. No additional browser lifecycle
  leak was established; actual installed-worker verification remains a release check.
- The worker integration was exercised synthetically, not in a real installed
  browser. Production release should verify update/activation and authenticated
  behavior using the approved deployment checks. No exhaustive security absence
  or external WASM/model audit is claimed.

Primary implementation references:
[Workbox build modes and routing](https://developer.chrome.com/docs/workbox/modules/workbox-build),
[TanStack authenticated routes](https://tanstack.com/router/latest/docs/guide/authenticated-routes).
