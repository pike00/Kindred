# Frontend security remediation independent review

Reviewed and re-reviewed 2026-10-26. Assessment: **Approve** for the frontend
source at `de759b19f44badf271cf87706c04119b0831720e`. All three original P2
findings are closed by the single batched fix. No new P0-P2 finding was
established. No application code was changed by this review. This approval does
not assert an immutable release image or completed production verification.

## Scope and evidence

- Exact base: `57b6d9bef02760f8f0524984a201e4bdebc14a9a`.
- Initial reviewed head: `b5fc82402eca3b548ecb7037f839cce28efef646`.
- Re-review range: `b5fc82402eca3b548ecb7037f839cce28efef646` through
  `de759b19f44badf271cf87706c04119b0831720e`. Read the complete frontend fix
  diff, updated report and regression tests; unrelated runtime/backend changes
  were outside this lane.
- Read the implementation report, Homelab security-remediation plan, prior
  frontend review, relevant project instructions, full frontend production diff,
  new tests, generated SDK transport, and installed Workbox cache-write code.
- Specification review preceded the implementation and simplification review.
  Production uses public local login. Cloudflare behavior is conditional.
- Supplied fresh evidence at the initial head: typecheck passed; 95 files / 1,968 tests
  passed; 56 focused tests, production PWA build, and actual generated Workbox VM
  probe passed after commit; pnpm audit reported zero vulnerabilities and peers
  were clean. These suites were not needlessly rerun.
- Supplied fresh fix-wave evidence: the three findings were reproduced by
  failing tests before their fixes; final typecheck and 95 files / 1,976 tests
  passed, as did the production PWA build and generated-worker VM probe.
  The complete pnpm audit remains zero; frontend dependencies did not change in
  the fix range. The re-review found no new concrete concern requiring a suite
  rerun. Post-commit artifact building was still in progress at handoff; no
  immutable-image or deployed-asset provenance claim is made here.
- Additional fresh evidence: Node VM execution of the actual TypeScript session,
  session-api, and service-worker-session modules after type stripping, using
  synthetic credentials, responses, storage, and virtual timers. These probes
  reproduced the findings below. An initial harness attempt used an unavailable
  TypeScript transpilation API; the corrected Node type-stripping harness passed
  its reproduction assertions. No browser, server, real records, credentials,
  deployment, or Git mutation was used.

## Specification assessment

| Requirement | Assessment |
| --- | --- |
| Private API reads never replay service-worker cache | Implemented: NetworkOnly; API navigation excluded from shell fallback; activation and handshake delete legacy api-cache. |
| Old controller hands off safely | F3 closed: listener precedes the first probe, current-controller identity is rechecked after handshakes, and unsafe/missing handoff remains fail-closed. |
| Logout/login/auth failure clear query, router and component state | Central generation reset, abort, cache clearing, root unmount and document navigation cover explicit transitions. |
| Multiple tabs and late asynchronous work stay account-bound | F1 closed: generation binds a fixed credential before work/identity, observable drift tears down without removing the sibling token, and transport validates credentials across asynchronous resolution. |
| Unsynced drafts remain owned and preserved | Composite owner keys, verified identity, owner-scoped reads/updates, original contact targeting and legacy quarantine meet the design; owner access now also rejects credential drift before storage-event delivery. |
| Legacy drafts never automatically replay | Preserved in a separate quarantine; normal queue APIs do not expose or replay them. |
| Compatible dependency fixes with no advisory omissions | Manifest/lock changes and supplied complete audit/peer/test/build evidence support this. Existing MediaPipe remote assets remain outside npm audit coverage. |
| User-facing functionality preserved | F2 closed: CSV export uses the guarded access-token source; its component test verifies bearer, download, retained query state and retained session. |

## Findings

The original coordinates, reproduction evidence and required corrections below
describe the initial reviewed head. Each disposition includes verification of
the corresponding fix at `de759b19f44badf271cf87706c04119b0831720e`.

### F1 - P2: Bind the generation to its credential before accepting new work

- Source: independent manual review plus fresh synthetic VM probe.
- Reviewed head: `b5fc82402eca3b548ecb7037f839cce28efef646`.
- Coordinate: new, `frontend/src/lib/session.ts:22` (capture and assertion at
  lines 19-36); associated new boundary `frontend/src/lib/session-api.ts:73`.
- Confidence: 99. Fingerprint: `kindred-session-generation-token-drift`.
- Disposition: closed at `de759b19f44badf271cf87706c04119b0831720e`.

Fix review: `assertCredential` binds once per generation and rejects drift in
capture, assertion, owner access and identity acceptance. Drift reloads without
removing a sibling token. SDK headers must equal the captured bearer;
`sessionFetch` captures before invoking its optional asynchronous resolver and
checks both the resolved credential and any explicitly supplied header. ApiKeys
and ImportExport no longer await token resolution outside this boundary. New
tests cover pre-event SDK and owned-draft operations, late simultaneous login,
mismatched Authorization and a token-provider await crossing the transition.
The fix satisfies the original action without changing generated SDK files.

`captureSession()` reads the current localStorage token every time instead of
binding credentials to the page's generation and verified owner. When another
tab installs B's token, the first tab can still have A's owner, UI and draft
queue until the asynchronous storage event is handled. New SDK requests in
that interval capture B, compare B with B, and pass. `currentAccountId()` still
returns A. The queue's owner check therefore does not prevent sending an A-owned
operation with B's credentials. Backend authorization still applies; an A-only
contact may be rejected, but this does not make an account-mismatched write or
read safe for shared/permitted resources or other mutation types.

The direct-fetch helpers have an additional instance of the same unbound
credential problem: ApiKeys reads its token before an await at line 61, and
ImportExport does so at lines 25-28, before `sessionFetch` captures a session.
An already-read A header can therefore be paired with a B snapshot. The wrapper
does not compare the supplied Authorization header to that snapshot.

The fresh VM probe set a verified A owner, changed synthetic storage to B
without delivering its storage event, and ran the actual SDK hooks: the B
request passed while `currentAccountId()` remained A. A second probe then sent
an already-resolved A header through `sessionFetch`; A's synthetic response body
was accepted under the B snapshot. Existing tests exercise requests queued
*before* token change and delivered storage events, not this interval.

Required correction, now implemented: bind each active generation/verified identity to a fixed credential and
fail closed immediately on drift, without deleting a sibling's new token.
Capture the session before any credential await, or let the guarded transport
own credential acquisition so headers and snapshot cannot disagree. Add tests
for a request and owned-draft operation started after storage changes but before
the event, and for credential resolution crossing the boundary.

### F2 - P2: CSV export now logs out a valid local user

- Source: independent manual review plus fresh synthetic VM probe.
- Reviewed head: `b5fc82402eca3b548ecb7037f839cce28efef646`.
- Coordinate: new, `frontend/src/components/Contacts/ContactsList.tsx:297`.
- Confidence: 100. Fingerprint: `kindred-csv-export-session-logout`.
- Disposition: closed at `de759b19f44badf271cf87706c04119b0831720e`.

Fix review: the wrong storage-key lookup and manual bearer construction were
removed. The real ContactsList component test returns 200 only for the correct
logged-in bearer and verifies download, query retention, token retention and no
login navigation. Legitimate 401 teardown remains intact.

The changed call uses `sessionFetch`, but its caller still reads
`localStorage.getItem("token")` at line 295. Login writes `access_token`.
A normal local-auth user therefore sends an empty bearer to the private export
endpoint. Previously that broken export showed an error; the new transport
handles its 401 by removing the valid `access_token`, unmounting the application
and navigating to login. This is a new session-destruction regression on an
existing broken credential lookup, relevant to the actual production auth mode.

The fresh probe used only a synthetic `access_token`, constructed the header
with the current caller's lookup, and returned 401 from synthetic fetch. The
actual transport removed that valid token and called `assign("/login")`.

Required correction, now implemented: use the same guarded credential source as other authenticated requests.
Test that a successful local CSV export sends the logged-in bearer, downloads
the response, and preserves the session. Do not weaken legitimate 401 teardown.

### F3 - P2: A controller change during the first handshake is missed

- Source: independent manual review plus fresh virtual-timer VM probe.
- Reviewed head: `b5fc82402eca3b548ecb7037f839cce28efef646`.
- Coordinate: new, `frontend/src/lib/service-worker-session.ts:22` (listener
  registration at line 29 and unconditional update wait at line 36).
- Confidence: 100. Fingerprint: `kindred-worker-initial-handshake-handoff-race`.
- Disposition: closed at `de759b19f44badf271cf87706c04119b0831720e`.

Fix review: the controller listener is installed before probing. The probe loop
compares the responding worker to the current controller and probes again if
they differ; registration/update and event-revision tracking avoid the lost
handoff. Tests cover the original early takeover and the inverse case, where a
safe response arrives from a worker already superseded by an unsafe controller.
Timeout still rejects unsafe startup and listener cleanup remains in `finally`.

The initial handshake waits up to one second on the captured old worker before
the function subscribes to `controllerchange`. If the installed safe worker
takes control during that wait, its event is lost. The function then registers
and updates the already-current safe worker and awaits a further controller
change that need not occur. After 15 seconds the entire app shows the security
update error despite having a safe current controller. This blocks normal login
and private-route startup until the user manually reloads; it does not replay
private data.

The fresh probe invoked the actual function with an old nonresponding worker,
switched to the safe worker before firing the initial handshake timer, and let
register/update complete without another event. The function rejected at its
deadline while the safe worker was still controller. Current tests change the
controller only after listener registration and miss this sequence.

Required correction, now implemented: subscribe before the initial asynchronous probe and re-evaluate the
current controller after each probe/update. Resolve once the actual current
controller confirms the protocol, even if its change event preceded the wait.
Retain the fail-closed timeout and add this handoff-order regression test.

## Code quality and bounded limitations

The central session module, generated-client hooks and narrow owned-store helper
are useful boundaries. The fix improves clarity by moving credential resolution
into guarded transport, removing the duplicate ApiKeys token helper and adding
an explicit Session interface and return types to the core session operations.
The worker's revision/wakeup state serves a concrete event-ordering purpose;
collapsing it to a single awaited event would restore the reviewed race. No
further simplification is needed for approval, and no stylistic churn is
requested. The source review found no new regression at these boundaries.

The proposed late retiring-worker cache-write concern was investigated and is
**not established as a further finding**. The supplied VM inserts a synthetic
cache after activation and proves its deletion on a later fetch; it does not
prove that browser lifecycle ordering permits that insertion by the old worker.
The [Service Worker Activate algorithm](https://w3c.github.io/ServiceWorker/#activate-algorithm)
terminates the previous active worker before promoting the replacement.
Installed Workbox schedules cache writes through the event's extended lifetime.
These details do not justify claiming a demonstrated late-write leak from a
manually inserted synthetic cache. Retain migration cleanup and verify actual
installed-worker lifecycle during authorized release checks; no browser timing
guarantee was established by this review.

Conditional Cloudflare identity changes are rechecked at route entry, focus,
reconnect and auth errors. An invisible out-of-band cookie switch still has no
JavaScript event or response-bound identity proof. The implementation report
correctly records that limitation; do not claim it fully fixed. This is separate
from F1, which is a directly observable localStorage credential change affecting
the production local-auth mode.

Offline queue/quarantine data remains plaintext within the browser profile.
Account scoping prevents normal application cross-account access, not arbitrary
same-origin script or profile access. No exhaustive security certification or
production deployment verification is implied by this review.
