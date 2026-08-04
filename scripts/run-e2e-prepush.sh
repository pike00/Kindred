#!/usr/bin/env bash
# Pre-push e2e gate: runs the Playwright suite against the dev stack with
# loopback ports published. Brings the stack up if it isn't already.
#
# Behavior:
#   - Stack reachable on localhost:8001/5173 → run tests, fail on red.
#   - An existing preview stack is also supported; its backend port is detected
#     from the frontend container (for example, main uses 18001).
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

frontend_port="${E2E_FRONTEND_PORT:-5173}"
backend_port="${E2E_BACKEND_PORT:-8001}"
frontend_base_url="${E2E_BASE_URL:-http://localhost:${frontend_port}}"
backend_url="http://localhost:${backend_port}/api/v1/utils/health-check/"
frontend_url="${frontend_base_url%/}/"
e2e_server_pid=""
e2e_server_log=""

cleanup_e2e_frontend() {
    if [ -n "$e2e_server_pid" ]; then
        # Vite launches child processes; run it in its own process group so
        # the pre-push hook cannot leave a proxy behind after the test exits.
        kill -- "-$e2e_server_pid" >/dev/null 2>&1 || kill "$e2e_server_pid" >/dev/null 2>&1 || true
        wait "$e2e_server_pid" >/dev/null 2>&1 || true
    fi
    if [ -n "$e2e_server_log" ]; then
        rm -f "$e2e_server_log"
    fi
}

trap cleanup_e2e_frontend EXIT

frontend_up() {
    curl -fsS -o /dev/null "$frontend_url"
}

backend_up() {
    curl -fsS "$backend_url" >/dev/null 2>&1
}

# The project-kit preview stack uses offset ports and does not expose those
# offsets through `just env`. Discover the backend paired with the container
# serving port 5173 so the API helpers can use the same stack.
discover_preview_backend_port() {
    local frontend_container project backend_container mapped_port
    frontend_container="$(docker ps --format '{{.ID}} {{.Ports}}' | awk '$0 ~ /127[.]0[.]0[.]1:5173->5173/ {print $1; exit}')"
    [ -n "$frontend_container" ] || return 1
    project="$(docker inspect "$frontend_container" --format '{{index .Config.Labels "com.docker.compose.project"}}')"
    [ -n "$project" ] || return 1
    backend_container="$(docker ps -q \
        --filter "label=com.docker.compose.project=$project" \
        --filter 'label=com.docker.compose.service=backend' | head -n 1)"
    [ -n "$backend_container" ] || return 1
    mapped_port="$(docker port "$backend_container" 8000/tcp 2>/dev/null | sed -n 's/.*:\([0-9][0-9]*\)$/\1/p' | head -n 1)"
    [ -n "$mapped_port" ] || return 1
    printf '%s\n' "$mapped_port"
}

configure_backend_port() {
    backend_port="$1"
    backend_url="http://localhost:${backend_port}/api/v1/utils/health-check/"
}

# Preview frontends intentionally call their public hostname, which is not
# necessarily reachable from the host running this hook. Run a stable local
# Vite proxy for the test instead; this keeps browser requests same-origin and
# forwards /api to the already-running preview backend.
start_preview_e2e_frontend() {
    [ -n "${E2E_BASE_URL:-}" ] && return

    local port="" candidate found_port=""
    for candidate in $(seq 5174 5199); do
        if ! (:</dev/tcp/127.0.0.1/$candidate) >/dev/null 2>&1; then
            port="$candidate"
            found_port=1
            break
        fi
    done
    if [ -z "$found_port" ]; then
        echo "e2e: no free local frontend port found in 5174-5199" >&2
        exit 1
    fi

    e2e_server_log="$(mktemp)"
    (
        cd "$repo_root/frontend"
        exec setsid env \
            VITE_API_URL="" \
            VITE_AUTH_MODE="${AUTH_MODE:-local}" \
            E2E_API_TARGET="http://127.0.0.1:${backend_port}" \
                pnpm exec vite --config vite.e2e.config.ts \
                    --host 127.0.0.1 --port "$port" --strictPort
    ) >"$e2e_server_log" 2>&1 &
    e2e_server_pid=$!
    frontend_base_url="http://127.0.0.1:${port}"
    frontend_url="${frontend_base_url%/}/"

    for _ in $(seq 1 30); do
        if frontend_up; then
            # Prime Vite's route-module transforms before Playwright opens a
            # page; the first cold dynamic imports can otherwise race the test.
            local route
            for route in \
                "components/ui/sonner.tsx" \
                "components/PwaInstallPrompt.tsx" \
                "settings.tsx" \
                "contacts/index.tsx" \
                "contacts/\$contactId.tsx" \
                "interactions.tsx"; do
                curl -fsS "${frontend_base_url}/src/routes/_layout/${route}" >/dev/null
            done
            sleep 2
            echo "e2e: using local preview proxy on ${frontend_base_url}"
            return
        fi
        sleep 1
    done
    echo "e2e: local preview proxy failed to start" >&2
    sed -n '1,120p' "$e2e_server_log" >&2
    exit 1
}

stack_up() {
    backend_up && frontend_up
}

if ! frontend_up; then
    echo "e2e: frontend not reachable on loopback — bringing up dev compose with override"
    docker compose -f compose.dev.yml -f compose.dev.override.yml up -d \
        --force-recreate backend frontend >/dev/null
elif ! backend_up; then
    if preview_backend_port="$(discover_preview_backend_port 2>/dev/null)" && [ -n "$preview_backend_port" ]; then
        configure_backend_port "$preview_backend_port"
        echo "e2e: using existing preview backend on localhost:${backend_port}"
        start_preview_e2e_frontend
    else
        echo "e2e: frontend is up but backend is not — bringing up the loopback backend"
        docker compose -f compose.dev.yml -f compose.dev.override.yml up -d \
            --force-recreate backend >/dev/null
    fi
fi

if ! stack_up; then
    # Wait up to 5 min — cold starts include pnpm install + Vite startup
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

echo "e2e: stack ready on frontend=${frontend_base_url%/}, backend=http://localhost:${backend_port}; running Playwright specs..."

if ! E2E_BASE_URL="$frontend_base_url" E2E_API_URL="http://localhost:${backend_port}" \
    pnpm exec playwright test --reporter=list ${E2E_PLAYWRIGHT_ARGS:-}; then
    echo
    echo "ERROR: Playwright e2e specs failed." >&2
    echo "Run 'pnpm exec playwright show-report e2e/report' to view the HTML report." >&2
    echo "Bypass intentionally with: PERSONAL_CRM_SKIP_E2E=1 git push" >&2
    exit 1
fi

echo "e2e: all specs passed"
