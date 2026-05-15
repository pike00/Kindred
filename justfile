# Personal CRM — dev recipes.
# Run `just --list` to see them all.

# Which compose file to target. Override per-invocation:
#   just compose=compose.yml seed
compose := "compose.dev.yml"

_dc := "docker compose -f " + compose

# `release` and changelog recipes come from release.just. `publish` and `bump`
# are inline below (repo-specific image name / homelab app).
# Note: image is "kindred" (running container brand); the repo is "personal-crm".
import 'release.just'

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
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} {{ if email == "" { "" } else { "--email " + email } }}

# Wipe this user's existing contacts/tags/groups/reminders, then reseed.
seed-reset count="500" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset {{ if email == "" { "" } else { "--email " + email } }}

# Deterministic seed — same data every run (good for screenshots/demos).
seed-fixed count="500" rng="42" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset --seed {{rng}} {{ if email == "" { "" } else { "--email " + email } }}

# Regenerate the frontend OpenAPI client AND restart the frontend container
# so Vite drops its cached SDK from node_modules/.vite/deps. Without the
# restart, the dev server keeps serving the stale client even though the
# source files on disk are current.
regen-client:
    bash scripts/generate-client.sh
    {{_dc}} restart frontend

# Regenerate docs/db/ from the live Postgres schema using tbls, then render
# each .md to a standalone .html via pandoc. Open docs/db/index.html in a
# browser — no server needed. Requires the `db` service to be running.
db-docs:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env; set +a
    DSN="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable"
    # 1) Live DB schema → Markdown (tbls).
    docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network kindred-internal-crm \
        -v "$(pwd)":/work -w /work \
        -e TBLS_DSN="$DSN" \
        ghcr.io/k1low/tbls \
        doc -c /work/.tbls.yml "$DSN" docs/db --force --rm-dist
    # 2) Live DB schema → DBML (@dbml/cli). npm needs registry.npmjs.org
    # (default bridge), the DB only answers on kindred-internal-crm (no
    # internet). Create on bridge, attach kindrednet, then start.
    DBML_CID=$(docker create \
        --user "$(id -u):$(id -g)" \
        -v "$(pwd)":/work -w /work \
        -e HOME=/tmp \
        node:22-alpine \
        npx -y -p @dbml/cli@7.1.1 db2dbml postgres "$DSN" -o docs/db/schema.dbml)
    trap 'docker rm -f "$DBML_CID" >/dev/null 2>&1 || true' EXIT
    docker network connect kindred-internal-crm "$DBML_CID"
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
    set -a; source .env; set +a
    DSN="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?sslmode=disable"
    if ! docker run --rm \
        --user "$(id -u):$(id -g)" \
        --network kindred-internal-crm \
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

# ---------------------------------------------------------------------------
# Per-worktree dev stack (compose.worktree.yml).
#
# `just up` from any worktree boots an isolated stack: own COMPOSE_PROJECT_NAME,
# own DB / Redis / Meili volumes, host ports offset deterministically from the
# worktree's directory name. Run from the main repo dir and you get the
# "personal-crm" project on the default offset.
# ---------------------------------------------------------------------------

# Print the env vars this worktree resolves to (project name, hostname, ports).
# Useful for sanity checks and for `eval "$(just env)"` in subshells.
env:
    #!/usr/bin/env bash
    set -euo pipefail
    slug="$(basename "$(git rev-parse --show-toplevel)")"
    offset=$((16#$(printf %s "$slug" | sha1sum | head -c 4) % 1000))
    # Resolve DOMAIN from .env (symlinked from main if needed) for WORKTREE_HOST.
    main_repo="$(dirname "$(git rev-parse --git-common-dir | xargs -I{} readlink -f {})")"
    domain="$(grep -E '^DOMAIN=' "$main_repo/.env" | cut -d= -f2- | tr -d '"')"
    echo "SLUG=$slug"
    echo "COMPOSE_PROJECT_NAME=crm-$slug"
    echo "WORKTREE_HOST=$slug.kindred.$domain"
    echo "BACKEND_PORT=$((8000 + offset))"
    echo "FRONTEND_PORT=$((5173 + offset))"
    echo "DB_PORT=$((15432 + offset))"
    echo "REDIS_PORT=$((16379 + offset))"
    echo "MEILI_PORT=$((17700 + offset))"

# Bring the worktree stack up. Symlinks .env from the main repo if missing.
up:
    #!/usr/bin/env bash
    set -euo pipefail
    toplevel="$(git rev-parse --show-toplevel)"
    main_repo="$(dirname "$(git rev-parse --git-common-dir | xargs -I{} readlink -f {})")"
    [ -f .env ] || ln -s "$main_repo/.env" .env
    # Source .env to pick up POSTGRES_USER/DB for the banner.
    set -a; . ./.env; set +a
    eval "$(just env | sed 's/^/export /')"
    slug="${COMPOSE_PROJECT_NAME#crm-}"
    offset=$((BACKEND_PORT - 8000))
    branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo 'detached')"
    head_line="$(git log -1 --format='%h %s' 2>/dev/null || echo 'unknown')"
    dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
    echo "▶ project:  $COMPOSE_PROJECT_NAME  (port offset $offset)"
    echo "  branch:   $branch"
    echo "  HEAD:     $head_line"
    if [ "$dirty" -gt 0 ]; then
        echo "  dirty:    $dirty file(s) uncommitted"
    fi
    echo "  worktree: $toplevel"
    if [ -L .env ]; then
        echo "  .env:     symlink → $(readlink .env)"
    else
        echo "  .env:     local file"
    fi
    echo
    echo "  app:      https://$WORKTREE_HOST           ← open this"
    echo "  api:      https://$WORKTREE_HOST/api/v1"
    echo "  docs:     https://$WORKTREE_HOST/docs"
    echo
    echo "  direct host-port access (offline / CLI use):"
    echo "    backend:  http://localhost:$BACKEND_PORT"
    echo "    frontend: http://localhost:$FRONTEND_PORT"
    echo "    db:       postgres://${POSTGRES_USER:-postgres}@localhost:$DB_PORT/${POSTGRES_DB:-crm}"
    echo "    redis:    redis://localhost:$REDIS_PORT"
    echo "    meili:    http://localhost:$MEILI_PORT"
    echo
    echo "▶ building images and starting containers..."
    docker compose -f compose.worktree.yml up -d --build
    echo
    echo "✓ stack up. Tail logs with 'just logs' or 'just logs backend'."

# Stop and remove containers but keep volumes (DB data survives).
down:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml down

# Stop and remove containers AND volumes (fresh DB on next up).
down-clean:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml down -v

# Tail logs across all services. Pass a service name to scope: just logs backend
logs *args:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml logs -f {{args}}

# Show worktree stack status.
ps:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml ps

# Run pytest inside the worktree's backend container. Pass extra args after --.
pytest *args:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml exec -T backend pytest {{args}}

# Run frontend TypeScript typecheck inside the worktree's frontend container.
typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml exec -T frontend bun run typecheck

# Open a bash shell inside the worktree's backend container.
shell:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    docker compose -f compose.worktree.yml exec backend bash

# Create-if-missing a worktree at .worktrees/<slug> on a new branch named
# <slug> (or resume if it already exists), then bring its stack up. Run from
# anywhere in the repo — main, another worktree, doesn't matter.
worktree slug:
    #!/usr/bin/env bash
    set -euo pipefail
    main_repo="$(dirname "$(git rev-parse --git-common-dir | xargs -I{} readlink -f {})")"
    wt_path="$main_repo/.worktrees/{{slug}}"
    base_branch="$(git -C "$main_repo" symbolic-ref --short HEAD 2>/dev/null || echo 'main')"
    if [ ! -d "$wt_path" ]; then
        echo "▶ Creating new worktree"
        echo "  path:   $wt_path"
        echo "  base:   $base_branch ($(git -C "$main_repo" log -1 --format='%h %s'))"
        echo "  branch: {{slug}}  (new)"
        echo
        git -C "$main_repo" worktree add "$wt_path" -b "{{slug}}"
    else
        echo "▶ Reusing existing worktree"
        echo "  path:   $wt_path"
        wt_branch="$(git -C "$wt_path" symbolic-ref --short HEAD 2>/dev/null || echo 'detached')"
        wt_head="$(git -C "$wt_path" log -1 --format='%h %s' 2>/dev/null || echo 'unknown')"
        ahead="$(git -C "$wt_path" rev-list --count "${base_branch}..HEAD" 2>/dev/null || echo '?')"
        behind="$(git -C "$wt_path" rev-list --count "HEAD..${base_branch}" 2>/dev/null || echo '?')"
        dirty="$(git -C "$wt_path" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
        echo "  branch: $wt_branch  (ahead $ahead, behind $behind vs $base_branch)"
        echo "  HEAD:   $wt_head"
        if [ "$dirty" -gt 0 ]; then
            echo "  dirty:  $dirty uncommitted file(s):"
            git -C "$wt_path" status --short | sed 's/^/            /'
        else
            echo "  dirty:  clean"
        fi
        echo
    fi
    cd "$wt_path"
    just up
    eval "$(just env | sed 's/^/export /')"
    echo
    echo "▶ Starting on https://$WORKTREE_HOST"

# Tear down a worktree's stack (with volumes) and remove the worktree itself.
worktree-rm slug:
    #!/usr/bin/env bash
    set -euo pipefail
    main_repo="$(dirname "$(git rev-parse --git-common-dir | xargs -I{} readlink -f {})")"
    wt_path="$main_repo/.worktrees/{{slug}}"
    if [ ! -d "$wt_path" ]; then
        echo "no worktree at $wt_path — nothing to do"
        exit 0
    fi
    (cd "$wt_path" && just down-clean) || true
    git -C "$main_repo" worktree remove "$wt_path" --force
    echo "✓ removed worktree '{{slug}}' (branch left intact — delete with 'git branch -D {{slug}}')"

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
    SHA=$(git rev-parse "{{tag}}")
    SHORT=${SHA:0:7}
    IMAGE=ghcr.io/pike00/kindred
    echo "▶ Building $IMAGE for tag {{tag}} (commit $SHORT)..."
    docker buildx build \
        --platform linux/amd64 \
        --tag "$IMAGE:{{tag}}" \
        --tag "$IMAGE:sha-$SHORT" \
        --build-arg "APP_VERSION={{tag}}" \
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
