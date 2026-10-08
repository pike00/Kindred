#!/usr/bin/env bash
# Test this checkout's built SPA against its own isolated preview backend.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "${PERSONAL_CRM_SKIP_E2E:-0}" == "1" ]]; then
    echo "e2e: skipped (PERSONAL_CRM_SKIP_E2E=1)"
    exit 0
fi
for command in docker just pnpm uv tailscale jq curl; do
    command -v "$command" >/dev/null || { echo "e2e: $command is required" >&2; exit 1; }
done

project="$(just env | sed -n 's/^COMPOSE_PROJECT_NAME=//p')"
[[ "$project" =~ ^[a-z0-9][a-z0-9_-]+$ ]] || { echo "e2e: invalid preview project" >&2; exit 1; }
if [[ -n "${E2E_COMPOSE_PROJECT:-}" && "$E2E_COMPOSE_PROJECT" != "$project" ]]; then
    echo "e2e: the requested project does not belong to this checkout" >&2
    exit 1
fi
backend_container="$(docker ps -q --filter "label=com.docker.compose.project=$project" --filter 'label=com.docker.compose.service=backend')"
if [[ -z "$backend_container" || "$backend_container" == *$'\n'* ]]; then
    echo "e2e: start this checkout's isolated backend with just dev first" >&2
    exit 1
fi
binding="$(docker port "$backend_container" 8000/tcp)"
[[ "$binding" =~ ^127\.0\.0\.1:([0-9]+)$ ]] || { echo "e2e: expected one isolated backend port" >&2; exit 1; }
api_base_url="http://$binding"
if [[ -n "${E2E_API_URL:-}" && "${E2E_API_URL%/}" != "$api_base_url" ]]; then
    echo "e2e: API override does not match this checkout's backend" >&2
    exit 1
fi
if [[ -n "${E2E_BASE_URL:-}" ]]; then
    echo "e2e: unset E2E_BASE_URL; this gate builds and serves the current checkout" >&2
    exit 1
fi
curl --fail --silent --show-error --max-time 10 "$api_base_url/api/v1/utils/health-check/" >/dev/null

tailnet_ip="$(tailscale ip -4)"
tailnet_host="$(tailscale status --self --json | jq -er '.Self.DNSName' | sed 's/\.$//')"
[[ "$tailnet_ip" =~ ^100\.[0-9]+\.[0-9]+\.[0-9]+$ && "$tailnet_host" == *.ts.net ]] || {
    echo "e2e: an active Tailscale address and MagicDNS name are required" >&2
    exit 1
}
port=""
for _ in $(seq 1 50); do
    candidate=$((8200 + RANDOM % 801))
    if ! (:</dev/tcp/"$tailnet_ip"/"$candidate") >/dev/null 2>&1; then
        port="$candidate"
        break
    fi
done
[[ -n "$port" ]] || { echo "e2e: no available tailnet port" >&2; exit 1; }

e2e_server_pid=""
e2e_server_log="$(mktemp)"
cleanup() {
    if [[ -n "$e2e_server_pid" ]]; then
        kill -- "-$e2e_server_pid" >/dev/null 2>&1 || true
        wait "$e2e_server_pid" >/dev/null 2>&1 || true
    fi
    rm -f "$e2e_server_log"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

(
    cd frontend
    VITE_API_URL="" VITE_E2E=true VITE_AUTH_MODE="${AUTH_MODE:-local}" pnpm run build
    uv run "$repo_root/scripts/check-bundle-placeholders.py"
)

# Bash job control creates an owned process group on macOS and Linux.
set -m
(
    cd frontend
    exec env VITE_E2E=true E2E_API_TARGET="$api_base_url" \
        TAILNET_HOST="$tailnet_ip" TAILNET_MAGICDNS="$tailnet_host" \
        pnpm exec vite preview --config vite.e2e.config.ts \
        --host "$tailnet_ip" --port "$port" --strictPort
) >"$e2e_server_log" 2>&1 &
e2e_server_pid=$!
set +m

frontend_base_url="http://$tailnet_host:$port"
ready=0
for _ in $(seq 1 60); do
    kill -0 "$e2e_server_pid" 2>/dev/null || break
    if curl --fail --silent --max-time 2 "$frontend_base_url/" >/dev/null; then
        ready=1
        break
    fi
    sleep 1
done
if [[ "$ready" != 1 ]]; then
    echo "e2e: the task's frontend preview did not start" >&2
    cat "$e2e_server_log" >&2
    exit 1
fi
echo "e2e: preview [$frontend_base_url]($frontend_base_url)"

playwright_args=(--reporter=list "--workers=${E2E_WORKERS:-1}" "--retries=${E2E_RETRIES:-0}")
if [[ -n "${E2E_PLAYWRIGHT_ARGS:-}" ]]; then
    read -r -a extra_args <<< "$E2E_PLAYWRIGHT_ARGS"
    playwright_args+=("${extra_args[@]}")
fi
e2e_tmp_dir="${E2E_TMPDIR:-${TMPDIR:-/tmp}}"
if [[ -z "${E2E_TMPDIR:-}" && -d /dev/shm && -w /dev/shm ]]; then
    e2e_tmp_dir=/dev/shm
fi
E2E_BASE_URL="$frontend_base_url" E2E_API_URL="$api_base_url" \
    E2E_RETRIES="${E2E_RETRIES:-0}" TMPDIR="$e2e_tmp_dir" \
    pnpm exec playwright test "${playwright_args[@]}"
echo "e2e: all specs passed"
