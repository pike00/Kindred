#!/usr/bin/env bash
# Pre-push e2e gate: runs the Playwright suite against the dev stack with
# loopback ports published. Brings the stack up if it isn't already.
#
# Behavior:
#   - Stack reachable on localhost:8001/5173 → build an E2E preview and run.
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
api_base_url="${E2E_API_URL:-http://localhost:${backend_port}}"
backend_url="${api_base_url%/}/api/v1/utils/health-check/"
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

# The project-kit preview stack uses offset ports. Prefer the current
# worktree's Compose project, then fall back to the single project that owns
# the requested host port when an already-running preview is being reused.
discover_preview_backend_port() {
    local expected_project="${E2E_COMPOSE_PROJECT:-${COMPOSE_PROJECT_NAME:-}}"
    if [ -z "$expected_project" ]; then
        expected_project="$(just env 2>/dev/null | sed -n 's/^COMPOSE_PROJECT_NAME=//p')"
    fi

    local frontend_container="" candidate project backend_container mapped_port
    local compose_filter=()
    if [ -n "$expected_project" ]; then
        compose_filter=(--filter "label=com.docker.compose.project=$expected_project")
    fi
    while IFS= read -r candidate; do
        [ -n "$candidate" ] || continue
        if docker port "$candidate" 5173/tcp 2>/dev/null |
            grep -Eq "(^|:)${frontend_port}$"; then
            if [ -n "$frontend_container" ]; then
                echo "e2e: multiple frontend containers own host port ${frontend_port}" >&2
                return 1
            fi
            frontend_container="$candidate"
        fi
    done < <(
        docker ps -q \
            --filter 'label=com.docker.compose.service=frontend' \
            "${compose_filter[@]}"
    )

    # If this worktree is not running, reuse the unique preview bound to the
    # requested port. A host port can only belong to one running stack.
    if [ -z "$frontend_container" ] && [ -n "$expected_project" ]; then
        compose_filter=()
        while IFS= read -r candidate; do
            [ -n "$candidate" ] || continue
            if docker port "$candidate" 5173/tcp 2>/dev/null |
                grep -Eq "(^|:)${frontend_port}$"; then
                if [ -n "$frontend_container" ]; then
                    echo "e2e: multiple preview frontends own host port ${frontend_port}" >&2
                    return 1
                fi
                frontend_container="$candidate"
            fi
        done < <(
            docker ps -q --filter 'label=com.docker.compose.service=frontend'
        )
    fi

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
    if [ -z "${E2E_API_URL:-}" ]; then
        api_base_url="http://localhost:${backend_port}"
        backend_url="${api_base_url%/}/api/v1/utils/health-check/"
    fi
}

# Preview frontends intentionally call their public hostname, which is not
# necessarily reachable from the host running this hook. Build the current
# frontend and serve it through a local Vite preview proxy; this keeps browser
# requests same-origin and avoids dev-server JIT/import races under Playwright.
start_preview_e2e_frontend() {
    [ -n "${E2E_BASE_URL:-}" ] && return
    [ -n "$e2e_server_pid" ] && return

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
    local backend_target="${E2E_API_URL:-http://127.0.0.1:${backend_port}}"
    setsid bash -c '
        repo_root="$1"
        backend_target="$2"
        port="$3"
        cd "$repo_root/frontend"
        env \
            VITE_API_URL="" \
            VITE_E2E="true" \
            VITE_AUTH_MODE="${AUTH_MODE:-local}" \
            E2E_API_TARGET="$backend_target" \
                pnpm build >/dev/null && \
            exec env \
                VITE_E2E="true" \
                E2E_API_TARGET="$backend_target" \
                pnpm exec vite preview --config vite.e2e.config.ts \
                    --host 127.0.0.1 --port "$port" --strictPort
    ' _ "$repo_root" "$backend_target" "$port" >"$e2e_server_log" 2>&1 &
    e2e_server_pid=$!
    frontend_base_url="http://127.0.0.1:${port}"
    frontend_url="${frontend_base_url%/}/"

    # A cold TypeScript build can take close to 30s on the shared dev host.
    for _ in $(seq 1 120); do
        if frontend_up; then
            echo "e2e: using local production preview on ${frontend_base_url}"
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
    if [ -z "${E2E_API_URL:-}" ] &&
        preview_backend_port="$(discover_preview_backend_port 2>/dev/null)" &&
        [ -n "$preview_backend_port" ]; then
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

# Always test the built SPA. A running Vite dev server can retain stale lazy
# chunks or register the PWA service worker, which makes unrelated specs fail.
start_preview_e2e_frontend

echo "e2e: stack ready on frontend=${frontend_base_url%/}, backend=${api_base_url%/}; running Playwright specs..."

playwright_args=(--reporter=list)
e2e_retries="${E2E_RETRIES:-0}"
if [ -n "${E2E_PLAYWRIGHT_ARGS:-}" ]; then
    # Keep the escape hatch for focused runs and explicit Playwright options.
    read -r -a extra_playwright_args <<< "$E2E_PLAYWRIGHT_ARGS"
    playwright_args+=("${extra_playwright_args[@]}")
else
    # The backend's SQLAlchemy pool is intentionally small; one worker keeps
    # data-heavy specs from turning harmless setup calls into connection
    # timeouts and cascading route-load failures. Opt into two workers when
    # the environment has enough database capacity.
    playwright_args+=("--workers=${E2E_WORKERS:-1}")
    # Keep retries opt-in so a green pre-push gate cannot hide a first-attempt
    # regression. CI or a local diagnostic run can still set E2E_RETRIES.
    playwright_args+=("--retries=$e2e_retries")
fi

# Chromium creates a temporary profile for every Playwright worker. Prefer the
# host's tmpfs so a long suite does not consume the root filesystem and crash
# the browser or the dev database with ENOSPC.
if [ -n "${E2E_TMPDIR:-}" ]; then
    e2e_tmp_dir="$E2E_TMPDIR"
elif [ -d /dev/shm ] && [ -w /dev/shm ]; then
    e2e_tmp_dir=/dev/shm
else
    e2e_tmp_dir="${TMPDIR:-}"
fi

if ! E2E_BASE_URL="${E2E_BASE_URL:-$frontend_base_url}" \
    E2E_API_URL="$api_base_url" \
    E2E_RETRIES="$e2e_retries" \
    TMPDIR="$e2e_tmp_dir" \
    pnpm exec playwright test "${playwright_args[@]}"; then
    echo
    echo "ERROR: Playwright e2e specs failed." >&2
    echo "Run 'pnpm exec playwright show-report e2e/report' to view the HTML report." >&2
    echo "Bypass intentionally with: PERSONAL_CRM_SKIP_E2E=1 git push" >&2
    exit 1
fi

echo "e2e: all specs passed"
