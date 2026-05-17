set shell := ["bash", "-uc"]

# `release` / `version` / changelog recipes come from release.just (shared).
# `dev` / `down` / `down-clean` / `logs` / `ps` / `shell` / `pytest` /
# `worktree` / `worktree-rm` / `pr` come from preview.just. preview-kit
# threads GIT_HASH + APP_VERSION as build args.

import 'release.just'
import 'preview.just'

default:
    @just --list

# ── Repo-specific settings ──────────────────────────────────────────────
# Image brand is "kindred" (running container); the repo is "personal-crm".
# Which compose file to target. Override per-invocation:
#   just compose=compose.yml seed
compose := "compose.dev.yml"
_dc := "docker compose -f " + compose

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

# Seed fake data for the FIRST_SUPERUSER. Safe to run repeatedly; adds more on top.
seed count="500" email="":
    #!/usr/bin/env bash
    eval "$(just env | sed 's/^/export /')"
    docker compose -f "$PREVIEW_COMPOSE_FILE" exec -T backend python app/seed_fake_data.py --count {{count}} {{ if email == "" { "" } else { "--email " + email } }}

# Wipe this user's existing contacts/tags/groups/reminders, then reseed.
seed-reset count="500" email="":
    #!/usr/bin/env bash
    eval "$(just env | sed 's/^/export /')"
    docker compose -f "$PREVIEW_COMPOSE_FILE" exec -T backend python app/seed_fake_data.py --count {{count}} --reset {{ if email == "" { "" } else { "--email " + email } }}

# Deterministic seed — same data every run (good for screenshots/demos).
seed-fixed count="500" rng="42" email="":
    #!/usr/bin/env bash
    eval "$(just env | sed 's/^/export /')"
    docker compose -f "$PREVIEW_COMPOSE_FILE" exec -T backend python app/seed_fake_data.py --count {{count}} --reset --seed {{rng}} {{ if email == "" { "" } else { "--email " + email } }}

# Regenerate the frontend OpenAPI client AND restart the frontend container
# so Vite drops its cached SDK from node_modules/.vite/deps. Without the
# restart, the dev server keeps serving the stale client even though the
# source files on disk are current.
regen-client:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    bash scripts/generate-client.sh
    docker compose -f "$PREVIEW_COMPOSE_FILE" restart frontend

# Regenerate docs/db/ from the live Postgres schema using tbls, then render
# each .md to a standalone .html via pandoc. Open docs/db/index.html in a
# browser — no server needed. Requires the `db` service to be running.
db-docs:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    set -a; source .env; set +a
    DSN="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable"
    # 1) Live DB schema → Markdown (tbls).
    docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network "${COMPOSE_PROJECT_NAME}_default" \
        -v "$(pwd)":/work -w /work \
        -e TBLS_DSN="$DSN" \
        ghcr.io/k1low/tbls \
        doc -c /work/.tbls.yml "$DSN" docs/db --force --rm-dist
    # 2) Live DB schema → DBML (@dbml/cli). npm needs registry.npmjs.org
    # (default bridge), the DB only answers on the project network (no internet).
    # Create on bridge, attach project network, then start.
    DBML_CID=$(docker create \
        --user "$(id -u):$(id -g)" \
        -v "$(pwd)":/work -w /work \
        -e HOME=/tmp \
        node:22-alpine \
        npx -y -p @dbml/cli@7.1.1 db2dbml postgres "$DSN" -o docs/db/schema.dbml)
    trap 'docker rm -f "$DBML_CID" >/dev/null 2>&1 || true' EXIT
    docker network connect "${COMPOSE_PROJECT_NAME}_default" "$DBML_CID"
    docker start -a "$DBML_CID"
    docker rm -f "$DBML_CID" >/dev/null
    trap - EXIT
    # 3) Markdown → standalone HTML (pandoc). One docker run, loop inside.
    docker run --rm \
        --user "$(id -u):$(id -g)" \
        -v "$(pwd)":/work -w /work \
        --entrypoint sh \
        pandoc/core:latest \
        -c '
            for md in docs/db/*.md; do
                title=$(basename "$md" .md)
                pandoc "$md" -f gfm -t html5 --standalone \
                    --template scripts/db-docs-html.template \
                    -M title="$title" \
                    -o "${md%.md}.html"
            done
        '
    # 4) Rewrite Markdown cross-links to HTML so the pages navigate to each other.
    find docs/db -name "*.html" -exec sed -i -E 's/\.md([#"])/.html\1/g' {} +
    # 5) Mirror README.html → index.html so `open docs/db/` lands on the home page.
    cp docs/db/README.html docs/db/index.html
    echo "Generated docs/db/index.html — open it in a browser."

# Fail if docs/db/ is out of date with the live DB. Runs in the pre-push hook.
db-docs-check:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    set -a; source .env; set +a
    DSN="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable"
    if ! docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network "${COMPOSE_PROJECT_NAME}_default" \
        -v "$(pwd)":/work -w /work \
        -e TBLS_DSN="$DSN" \
        ghcr.io/k1low/tbls \
        diff -c /work/.tbls.yml "$DSN" docs/db; then
        echo "" >&2
        echo "  error: docs/db/ is out of date with the live database." >&2
        echo "" >&2
        echo "  Regenerate and commit the result:" >&2
        echo "      just db-docs" >&2
        echo "      git add docs/db" >&2
        echo "" >&2
        exit 1
    fi

# Install prek hooks (pre-commit + pre-push) into .git/hooks.
install-hooks:
    uv run --project backend prek install

# Run frontend TypeScript typecheck inside the worktree's frontend container.
typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f "$PREVIEW_COMPOSE_FILE" exec -T frontend bun run typecheck

# Run frontend Vitest suite. Forwards extra args to vitest.
frontend-test *args:
    cd frontend && bun run test -- {{args}}

# Run frontend Vitest with v8 coverage. Writes report to frontend/coverage/.
frontend-coverage *args:
    cd frontend && bun run test -- --coverage {{args}}

# Run every test suite: backend pytest, frontend Vitest, SDK pytest.
# Fails fast on the first failing suite.
test-all:
    #!/usr/bin/env bash
    set -euo pipefail
    just pytest
    just frontend-test
    just sdk-test

# ─── Marketing site (website/) → Cloudflare Pages ───────────────────────
# Full set of website recipes lives in website/justfile:
#   just -f website/justfile dev       # local preview server on tailnet
#   just -f website/justfile render    # open index.html in browser
#   just -f website/justfile deploy    # push to Cloudflare Pages

[group('Deploy')]
web-deploy:
    just -f website/justfile deploy

# ─── Release / build / deploy ────────────────────────────────────────────
#
# `release` comes from release.just (release-kit cut: preflight, git-cliff
# CHANGELOG, LLM notes, tag, push, GH release). `build` and `deploy` are
# inline because they reference repo-specific paths.

# Build Dockerfile.prod and push to GHCR as :<tag> and :sha-<short>.
# Image name is "kindred" (the container brand), repo is "personal-crm".
[group('Deploy')]
build tag:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! [[ "{{tag}}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
        echo "ERROR: tag must match v<MAJOR>.<MINOR>.<PATCH>[-prerelease], got: {{tag}}" >&2
        exit 1
    fi
    if ! git rev-parse --verify "refs/tags/{{tag}}" >/dev/null 2>&1; then
        echo "ERROR: git tag {{tag}} doesn't exist locally — run 'just release patch' first" >&2
        exit 1
    fi
    # Deref annotated tag to its underlying commit; bare `git rev-parse <tag>`
    # returns the tag-object SHA for annotated tags, not the commit it points to.
    SHA=$(git rev-parse "{{tag}}^{}")
    SHORT=${SHA:0:7}
    IMAGE=ghcr.io/pike00/kindred
    echo "▶ Building $IMAGE for tag {{tag}} (commit $SHORT)..."
    docker buildx build \
        --platform linux/amd64 \
        --tag "$IMAGE:{{tag}}" \
        --tag "$IMAGE:sha-$SHORT" \
        --build-arg "APP_VERSION={{tag}}" \
        --build-arg "GIT_HASH=$SHORT" \
        --file Dockerfile.prod \
        --cache-from type=local,src=/tmp/buildx-cache-kindred \
        --cache-to   type=local,dest=/tmp/buildx-cache-kindred,mode=max \
        --push \
        .
    echo "✓ Built $IMAGE:{{tag}} and :sha-$SHORT"
    echo "  Deploy:  just deploy {{tag}}"

# Deploy: delegates to the homelab apps/kindred/justfile, which handles
# the mandatory pg-dump-before-bump + post-deploy healthcheck. Run on ares.
[group('Deploy')]
deploy tag:
    just -f ~/Documents/Homelab/apps/kindred/justfile bump {{tag}}

# End-to-end: cut a release AND build AND deploy.
[group('Deploy')]
ship level:
    #!/usr/bin/env bash
    set -euo pipefail
    just release {{level}}
    tag=$(git describe --tags --abbrev=0)
    just build "$tag"
    just deploy "$tag"

# ─── Python SDK (sdk/) ───────────────────────────────────────────────────

# Regenerate sdk/src/kindred/_generated/ from frontend/openapi.json.
# Run after any backend schema change; commit the result.
[group('SDK')]
sdk-regen:
    cd sdk && ./scripts/regen.sh

# Run the SDK's pytest suite.
[group('SDK')]
sdk-test *args:
    cd sdk && uv sync --frozen --quiet && uv run pytest {{args}}

# Build a wheel + sdist into sdk/dist/.
[group('SDK')]
sdk-build:
    cd sdk && uv build

# Install the SDK as a global uv tool from this checkout (editable).
# After: `kindred --help` from anywhere.
[group('SDK')]
sdk-install-local:
    uv tool install --force --editable ./sdk

# Print the CLI help — sanity-check the install.
[group('SDK')]
sdk-help:
    cd sdk && uv run kindred --help
