set shell := ["bash", "-uc"]
# `release` / `version` / changelog recipes come from release.just (shared).
# `dev` / `down` / `down-clean` / `logs` / `ps` / `shell` / `pytest` /
# `worktree` / `worktree-rm` / `pr` come from preview.just. preview-kit
# threads GIT_HASH + APP_VERSION as build args.
# ── Repo-specific settings ──────────────────────────────────────────────
# Image brand is "kindred" (running container); the repo is "personal-crm".
# Which compose file to target. Override per-invocation:
#   just compose=compose.yml seed
compose := "compose.dev.yml"
_dc := "docker compose -f " + compose
# ─── Marketing site (website/) → Cloudflare Pages ───────────────────────
# Full set of website recipes lives in website/justfile:
#   just -f website/justfile dev       # local preview server on tailnet
#   just -f website/justfile render    # open index.html in browser
#   just -f website/justfile deploy    # push to Cloudflare Pages
# ─── Release / build / deploy ────────────────────────────────────────────
#
# `release` comes from release.just (release-kit cut: preflight, git-cliff
# CHANGELOG, LLM notes, tag, push, GH release). `build` and `deploy` are
# inline because they reference repo-specific paths.
# ─── Python SDK (sdk/) ───────────────────────────────────────────────────

default:
    @just --list

# BEGIN PROJECT-KIT — generated, do not edit by hand
import '.project-kit/_lib.just'
import '.project-kit/preview.just'
import '.project-kit/release.just'
import '.project-kit/test.just'
import '.project-kit/deploy.just'
import '.project-kit/build.just'
import '.project-kit/db.just'
import '.project-kit/setup.just'
import '.project-kit/docs.just'
import '.project-kit/clean.just'
# END PROJECT-KIT

# --- repo-specific ---

# Fast live development over the tailnet. Reuses existing images/containers,
# starts Vite directly on the machine's Tailscale IP, and proxies /api to the
# local backend. Use `BACKEND_PORT=18001` when the default port is occupied.
[group('Dev')]
dev-tailnet:
    #!/usr/bin/env bash
    set -euo pipefail
    toplevel="$(git rev-parse --show-toplevel)"
    cd "$toplevel"
    [ -f .env ] && { set -a; . ./.env; set +a; }
    eval "$(just env | sed 's/^/export /')"
    export BACKEND_PORT="${BACKEND_PORT:-8000}"

    compose_log="$(mktemp)"
    trap 'rm -f "$compose_log"' EXIT
    if ! docker compose -f "$PREVIEW_COMPOSE_FILE" up -d >"$compose_log" 2>&1; then
        echo "Cached dev images are unavailable; bootstrapping with the full project-kit dev recipe."
        BACKEND_PORT="$BACKEND_PORT" just dev
    fi

    health_url="http://127.0.0.1:${BACKEND_PORT}${PREVIEW_HEALTH_PATH}"
    for _ in $(seq 1 45); do
        if curl -fsS --max-time 2 "$health_url" >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    if ! curl -fsS --max-time 2 "$health_url" >/dev/null 2>&1; then
        echo "Backend did not become healthy at $health_url" >&2
        cat "$compose_log" >&2
        exit 1
    fi

    tailnet_ip="$(tailscale ip -4)"
    tailnet_host="$(tailscale status --self --json | jq -r '.Self.DNSName' | sed 's/\.$//')"
    tailnet_port="$(python3 -c '
    import random, socket
    random.seed()
    for _ in range(50):
        port = random.randint(8200, 9000)
        with socket.socket() as sock:
            if sock.connect_ex(("127.0.0.1", port)) != 0:
                print(port)
                break
    ')"
    echo "Tailnet app: http://${tailnet_host}:${tailnet_port}/"
    cd frontend
    VITE_API_URL= \
    VITE_PUBLIC_HOST= \
    TAILNET_HOST="$tailnet_ip" \
    TAILNET_MAGICDNS="$tailnet_host" \
    KINDRED_BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" \
        exec bun run dev -- --config vite.tailnet.config.ts --host "$tailnet_ip" --port "$tailnet_port" --strictPort

# Regenerate docs/db/ from the live Postgres schema using tbls, then render
# each .md to a standalone .html via pandoc. The helper follows the active
# preview stack and reads credentials from its running DB container. Open
# docs/db/index.html in a browser — no server needed.
db-docs:
    @bash scripts/db-docs.sh generate

# Fail if docs/db/ is out of date with the live DB. Runs in the pre-push hook.
db-docs-check:
    @bash scripts/db-docs.sh check

# Run frontend Vitest with v8 coverage. Writes report to frontend/coverage/.
frontend-coverage *args:
    cd frontend && pnpm run test -- --coverage {{args}}

# Install prek hooks (pre-commit + pre-push) into .git/hooks.
install-hooks:
    uv run --project backend prek install

# Regenerate the frontend OpenAPI client AND restart the frontend container
# so Vite drops its cached SDK from node_modules/.vite/deps. Without the
# restart, the dev server keeps serving the stale client even though the
# source files on disk are current.
regen-client:
    #!/usr/bin/env bash
    set -euo pipefail
    bash scripts/generate-client.sh
    {{_dc}} restart frontend

# Build a wheel + sdist into sdk/dist/.
[group('SDK')]
sdk-build:
    cd sdk && uv build

# Print the CLI help — sanity-check the install.
[group('SDK')]
sdk-help:
    cd sdk && uv run kindred --help

# Install the SDK as a global uv tool from this checkout (editable).
# After: `kindred --help` from anywhere.
[group('SDK')]
sdk-install-local:
    uv tool install --force --editable ./sdk

# Regenerate sdk/src/kindred/_generated/ from frontend/openapi.json.
# Run after any backend schema change; commit the result.
[group('SDK')]
sdk-regen:
    cd sdk && ./scripts/regen.sh

# Run the SDK's pytest suite.
[group('SDK')]
sdk-test *args:
    cd sdk && uv sync --frozen --quiet && uv run pytest {{args}}

# Seed fake data for the FIRST_SUPERUSER. Safe to run repeatedly; adds more on top.
seed count="500" email="":
    #!/usr/bin/env bash
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} {{ if email == "" { "" } else { "--email " + email } }}

# Deterministic seed — same data every run (good for screenshots/demos).
seed-fixed count="500" rng="42" email="":
    #!/usr/bin/env bash
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset --seed {{rng}} {{ if email == "" { "" } else { "--email " + email } }}

# Wipe this user's existing contacts/tags/groups/reminders, then reseed.
seed-reset count="500" email="":
    #!/usr/bin/env bash
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset {{ if email == "" { "" } else { "--email " + email } }}

# Run the PR sweep orchestrator (Task 8+9). Loads .env, then runs the full pipeline.
# Set DRY_RUN=1 to print the plan without pushing anything.
# Set ONLY_PR=<n> to process a single PR for smoke-testing.
sweep *args:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env ]; then
        echo "ERROR: .env not found — run: sops -d .env.sops > .env" >&2
        exit 1
    fi
    set -a; source .env; set +a
    exec uv run --script --quiet scripts/run-pr-sweep.py run {{args}}

# Exhaustive overnight sweep — loops sweep+review until all PRs are resolved or stuck.
# Set DRY_RUN=1 for a dry-run first pass. Set ONLY_PR=<n> to test a single PR.
# Runs in a tmux session named 'pr-overnight'; logs to .pr-sweep-runner/overnight.log.
sweep-overnight:
    #!/usr/bin/env bash
    set -euo pipefail
    tmux kill-session -t pr-overnight 2>/dev/null || true
    tmux new-session -d -s pr-overnight -c "$(pwd)" \
        'bash scripts/sweep-overnight.sh'
    echo "Started in tmux session 'pr-overnight'."
    echo "Attach:  tmux attach -t pr-overnight"
    echo "Tail:    tail -f .pr-sweep-runner/overnight.log"

# Review all already-ready PRs with deepseek-v4-pro-cloud (review) + kimi-k2.6-cloud (fixes).
# Idempotent — skips PRs already reviewed. Run after `just sweep` completes.
sweep-review:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f .env ]; then
        echo "ERROR: .env not found — run: sops -d .env.sops > .env" >&2
        exit 1
    fi
    set -a; source .env; set +a
    exec uv run --script --quiet scripts/run-pr-sweep.py review

[group('Deploy')]
web-deploy:
    just -f website/justfile deploy
