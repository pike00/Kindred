#!/usr/bin/env bash
# Pre-push e2e gate: runs the puppeteer suite against the dev stack with
# loopback ports published. Brings the stack up if it isn't already.
#
# Behavior:
#   - Stack reachable on localhost:8001/5173 → run tests, fail on red.
#   - Stack down + Docker available → bring it up with the override file, run.
#   - Docker unavailable → skip with a warning. Never silently green.
#
# Bypass intentionally with: SKIP=e2e-tests git push
#                          or  PERSONAL_CRM_SKIP_E2E=1 git push

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "${PERSONAL_CRM_SKIP_E2E:-0}" == "1" ]]; then
    echo "e2e: skipped (PERSONAL_CRM_SKIP_E2E=1)"
    exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "WARN: docker not on PATH — skipping e2e (cannot bring stack up)" >&2
    exit 0
fi

backend_url="http://localhost:8001/api/v1/utils/health-check/"
frontend_url="http://localhost:5173/"

stack_up() {
    curl -fsS "$backend_url" >/dev/null 2>&1 && \
    curl -fsS -o /dev/null "$frontend_url"
}

if ! stack_up; then
    echo "e2e: stack not reachable on loopback — bringing up dev compose with override"
    docker compose -f compose.dev.yml -f compose.dev.override.yml up -d \
        --force-recreate backend frontend >/dev/null
    # Wait up to 5 min — cold starts include bun install + Vite startup
    waited=0
    until stack_up || (( waited >= 300 )); do
        sleep 5
        (( waited += 5 ))
        (( waited % 30 == 0 )) && echo "e2e: waiting for stack... ${waited}s elapsed"
    done
    if ! stack_up; then
        echo "ERROR: stack failed to come up within 300s — investigate before pushing" >&2
        exit 1
    fi
fi

echo "e2e: stack ready, running puppeteer specs..."

# Stable specs that gate the push. Order matters only for log readability;
# each script self-cleans its test data.
specs=(
    e2e/auth.test.ts
    e2e/tags.test.ts
    e2e/dashboard.test.ts
    e2e/journal.test.ts
    e2e/reminders.test.ts
    e2e/contacts.test.ts
    e2e/contact-cards.test.ts
    e2e/interactions.test.ts
    e2e/settings-admin.test.ts
)

failed=()
for spec in "${specs[@]}"; do
    if ! bun run "$spec"; then
        failed+=("$spec")
    fi
done

if (( ${#failed[@]} > 0 )); then
    echo
    echo "ERROR: ${#failed[@]} e2e spec(s) failed:" >&2
    printf '  - %s\n' "${failed[@]}" >&2
    echo "Bypass intentionally with: PERSONAL_CRM_SKIP_E2E=1 git push" >&2
    exit 1
fi

echo "e2e: all specs passed"
