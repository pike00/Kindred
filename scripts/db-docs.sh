#!/usr/bin/env bash
# Generate or validate docs/db against the database for the active preview
# stack. The running DB container is the source of truth for the connection
# credentials: .env may have changed since that container was created.

set -euo pipefail

mode="${1:-}"
case "$mode" in
  generate|check) ;;
  *)
    echo "usage: $0 generate|check" >&2
    exit 2
    ;;
esac

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
eval "$(just env | sed 's/^/export /')"

compose_file="${DB_DOCS_COMPOSE_FILE:-${PREVIEW_COMPOSE_FILE:-compose.dev.yml}}"
compose_project="${DB_DOCS_COMPOSE_PROJECT:-${COMPOSE_PROJECT_NAME:-}}"
compose_args=(-f "$compose_file")
if [ -n "$compose_project" ]; then
  compose_args=(-p "$compose_project" "${compose_args[@]}")
fi

db_container="$(docker compose "${compose_args[@]}" ps -q db 2>/dev/null | head -n 1)"
if [ -z "$db_container" ]; then
  echo "DB docs: no active compose db container for ${compose_project:-the current project}." >&2
  echo "DB docs: start the stack with 'just dev' and retry." >&2
  exit 1
fi

container_env="$(docker inspect "$db_container" --format '{{range .Config.Env}}{{println .}}{{end}}')"
env_value() {
  printf '%s\n' "$container_env" |
    awk -F= -v key="$1" '$1 == key { print substr($0, index($0, "=") + 1) }'
}

db_user="$(env_value POSTGRES_USER)"
db_password="$(env_value POSTGRES_PASSWORD)"
db_name="$(env_value POSTGRES_DB)"
if [ -z "$db_user" ] || [ -z "$db_password" ] || [ -z "$db_name" ]; then
  echo "DB docs: active DB container is missing POSTGRES_* credentials." >&2
  exit 1
fi

db_network="$(docker inspect "$db_container" --format '{{range $name, $config := .NetworkSettings.Networks}}{{println $name}}{{end}}' | head -n 1)"
if [ -z "$db_network" ]; then
  echo "DB docs: could not determine the DB container network." >&2
  exit 1
fi

url_encode() {
  python3 -c 'from urllib.parse import quote; import sys; print(quote(sys.argv[1], safe=""))' "$1"
}

dsn="postgres://$(url_encode "$db_user"):$(url_encode "$db_password")@db:5432/$(url_encode "$db_name")?sslmode=disable"
tbls_image="ghcr.io/k1low/tbls"
docker_workspace_args=(
  --user "$(id -u):$(id -g)"
  -v "$repo_root":/work
  -w /work
)

if [ "$mode" = "check" ]; then
  docker run --rm \
    "${docker_workspace_args[@]}" \
    --network "$db_network" \
    -e TBLS_DSN="$dsn" \
    "$tbls_image" \
    diff -c /work/.tbls.yml "$dsn" docs/db
  exit 0
fi

docker run --rm \
  "${docker_workspace_args[@]}" \
  --network "$db_network" \
  -e TBLS_DSN="$dsn" \
  "$tbls_image" \
  doc -c /work/.tbls.yml "$dsn" docs/db --force --rm-dist

# db2dbml needs registry access as well as DB access. Start on Docker's
# default bridge, then attach to the DB network before it runs.
dbml_cid="$(docker create \
  "${docker_workspace_args[@]}" \
  -e HOME=/tmp \
  node:22-alpine \
  npx -y -p @dbml/cli@7.1.1 db2dbml postgres "$dsn" -o docs/db/schema.dbml)"
cleanup() { docker rm -f "$dbml_cid" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker network connect "$db_network" "$dbml_cid"
docker start -a "$dbml_cid"
cleanup
trap - EXIT

docker run --rm \
  "${docker_workspace_args[@]}" \
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

find docs/db -name "*.html" -exec sed -i -E 's/\.md([#"])/.html\1/g' {} +
cp docs/db/README.html docs/db/index.html
echo "Generated docs/db/index.html — open it in a browser."
