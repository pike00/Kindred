# Personal CRM — dev recipes.
# Run `just --list` to see them all.

# Which compose file to target. Override per-invocation:
#   just compose=compose.yml seed
compose := "compose.dev.yml"

_dc := "docker compose -f " + compose

# Seed fake data for the FIRST_SUPERUSER. Safe to run repeatedly; adds more on top.
seed count="500" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} {{ if email == "" { "" } else { "--email " + email } }}

# Wipe this user's existing contacts/tags/groups/reminders, then reseed.
seed-reset count="500" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset {{ if email == "" { "" } else { "--email " + email } }}

# Deterministic seed — same data every run (good for screenshots/demos).
seed-fixed count="500" rng="42" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset --seed {{rng}} {{ if email == "" { "" } else { "--email " + email } }}

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
        --network pikenet-internal-crm \
        -v "$(pwd)":/work -w /work \
        -e TBLS_DSN="$DSN" \
        ghcr.io/k1low/tbls \
        doc -c /work/.tbls.yml "$DSN" docs/db --force --rm-dist
    # 2) Live DB schema → DBML (@dbml/cli). npm needs registry.npmjs.org
    # (default bridge), the DB only answers on pikenet-internal-crm (no
    # internet). Create on bridge, attach pikenet, then start.
    DBML_CID=$(docker create \
        --user "$(id -u):$(id -g)" \
        -v "$(pwd)":/work -w /work \
        -e HOME=/tmp \
        node:22-alpine \
        npx -y -p @dbml/cli@7.1.1 db2dbml postgres "$DSN" -o docs/db/schema.dbml)
    trap 'docker rm -f "$DBML_CID" >/dev/null 2>&1 || true' EXIT
    docker network connect pikenet-internal-crm "$DBML_CID"
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
        --network pikenet-internal-crm \
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
