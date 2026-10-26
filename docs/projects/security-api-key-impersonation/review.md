# API key impersonation security review

Report received: October 25, 2026. Reported and reviewed base:
`369674c9cbb280fc7c03bb2719d446f4a8824f63` (GitHub main).

## Plan

- [x] Read the report and trace signup, contact sharing, key issuance, and authentication.
- [x] Reproduce the reported escalation in a disposable local PostgreSQL database.
- [x] Require superuser authorization for impersonation grants and every impersonated request.
- [x] Verify legacy keys, disabled/demoted owners, ordinary keys, and legitimate admin impersonation.
- [x] Align the settings UI and regenerate the frontend client (no generated diff).
- [x] Resolve the frontend focus-loop failure and pass the full frontend suite.

## Scope

The fix belongs in `backend/app/api/routes/api_keys.py` (grant issuance) and
`backend/app/api/deps.py` (request-time authorization). Regression coverage belongs
in `backend/tests/api/test_api_keys.py`. The API key settings UI must offer
impersonation only to administrators. No database migration is needed.

Run `just test-security -q` with an explicitly isolated test database and Redis.
The existing backend test configuration recreates the test schema; never point
it at production or a shared development database.

## Review boundaries

This change is prepared for pull request review against the exact GitHub revision
named in the report. Deployment, incident response against production, and
correspondence with the reporter remain separate actions.

## Findings

The report is technically valid. The missing authorization check allows a normal
account to become a persistent superuser.

| Claim | Verification |
| --- | --- |
| Signup creates an ordinary active account without admin approval | Confirmed through the public signup endpoint in the local test application. |
| Sharing by email reveals the recipient's UUID | Confirmed. Existing sharing tests explicitly require that response. |
| Ordinary users can grant impersonation of other active users | Confirmed before the fix: HTTP 201 with a login token or a personal API key. |
| An impersonated admin can permanently promote the attacker | Confirmed before the fix: the admin-only PATCH returned 200, and a subsequent request with the attacker's original login reported `is_superuser=true`. |
| The issue affects the cited revision | Confirmed against `369674c9cbb280fc7c03bb2719d446f4a8824f63`, also GitHub main at review time. |
| Every installation is externally exploitable | Not established. The application-level flaw is present, but reachability still depends on gateway and deployment controls. Production was not probed. |

The contact-sharing response is an account-enumeration/privacy concern and an
enabler for the reported chain. A UUID must never confer authorization. The fix
therefore closes impersonation even when an attacker already knows a target UUID.
It preserves the existing sharing API, including IDs used to revoke shares.
Removing that disclosure requires a separate invitation/consent design or a
change to share identifiers; that privacy change is not included here.

The report's exact CVSS 3.1 score of 9.9 is not independently established. Its
`S:C` assumption describes crossing security authorities. The demonstrated
impact remains within Kindred, so my assessment is `S:U`; retaining the report's
other metrics gives 8.8 (`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H`). Open signup makes
the account prerequisite easy to satisfy. This remains an urgent account-takeover
issue. See the [FIRST CVSS 3.1 specification](https://www.first.org/cvss/v3-1/specification-document#Scope-S)
for the scope definition and scoring formula.

## Fix and compatibility

- The key-creation endpoint rejects every nonempty impersonation list from a
  non-superuser before looking up target accounts or writing a key.
- Authentication checks that the key owner exists and is active for all API-key
  requests. Impersonation additionally requires the owner to be a superuser now,
  as well as an allowed, active target.
- The request-time check also blocks legacy non-admin keys and keys whose owner
  has been demoted or disabled. Authentication timestamps update only after a
  successful authorization check.
- Ordinary users can still create, use, list, and revoke personal API keys.
  The settings dialog only fetches the user directory and offers impersonation
  controls to superusers.

Existing impersonation integrations owned by ordinary service accounts will
stop impersonating, even if they were originally provisioned by a trusted CLI.
There is no stored consent/issuer record that can distinguish those grants from
ones created through this bug. Review those integrations before release; the
current supported policy requires an active admin owner.

## Validation

Tests ran against a disposable PostgreSQL 18 container with all Alembic migrations
applied, a separate test database, Redis 7, and synthetic test accounts. Requests
passed through the real FastAPI authentication and database code via TestClient.
No production data or credentials were used.

- Before the fix: `just test-security -q --tb=short` had 15 failures and 61 passes.
  Failures included unauthorized issuance, persistent promotion, all three auth
  modes, and continued impersonation by demoted/disabled owners.
- After the fix: the same command passed all 76 tests, with eight existing
  SQLModel/Starlette warnings. The suite includes 17 added cases.
- API-key UI component suite: 38 passed, including ordinary-user and unresolved
  identity cases that neither query nor offer impersonation.
- Full frontend suite: `just test-frontend` passed all 2,007 tests in 92 files.
  The earlier stack overflow came from separate Radix focus-manager instances
  competing when a dropdown opened an edit dialog. Dialog, sheet, dropdown,
  select, popover, and alert-dialog wrappers now import from the existing
  `radix-ui` package to share overlay state. The custom-field suite that
  reproduced the failure passes all 27 tests. This follows the upstream
  [Radix dependency guidance](https://www.radix-ui.com/primitives/docs/overview/introduction).
  No dependency versions or lockfile entries changed.
- `just typecheck`, focused Ruff and Biome checks, and `git diff --check` passed.
  The generated UI wrappers are excluded by the repository's Biome configuration;
  their six import changes were reviewed directly and covered by the full suite.
- `just regen-client` passed and produced no schema or generated-client changes.
  No backend schema changed, so Python SDK regeneration is unnecessary.

## Release follow-up

This patch prevents new exploitation but cannot reverse an account that was
already promoted, credentials already copied, or keys already created under an
admin identity. Before release, review existing superusers, impersonation grants,
and available account-change audit evidence; revoke unauthorized credentials and
remediate compromised accounts if found. This review does not establish that
production was compromised or that it is clean.

The change is prepared on `codex/security-impersonation-fix` for pull request review.
It has not been deployed, and no reply has been sent to the reporter.
