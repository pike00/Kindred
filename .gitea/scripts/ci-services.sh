#!/usr/bin/env bash
# Only synthetic services in the disposable CI job container; no Docker access.
set -euo pipefail
[[ -f /.dockerenv && ${CI-} == true && $(id -u) == 0 && $(uname -m) == x86_64 ]]
[[ ${GITHUB_RUN_ID-} =~ ^[0-9]+$ ]]
[[ ${POSTGRES_SERVER-} == 127.0.0.1 && ${POSTGRES_PORT-} == 5432 ]]
[[ ${POSTGRES_USER-} == "kindred_ci_$GITHUB_RUN_ID" && ${POSTGRES_DB-} == "$POSTGRES_USER" ]]
[[ ${POSTGRES_TEST_DB-} == "kindred_ci_test_$GITHUB_RUN_ID" ]]
[[ ${POSTGRES_PASSWORD-} == synthetic-ci-password-0123456789 ]]
[[ ${REDIS_URL-} == redis://127.0.0.1:6379 && ${MEILI_URL-} == http://127.0.0.1:7700 ]]
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
# App settings must never fall back to a checkout's dotenv credentials.
for path in "$root/.env" "$root/backend/.env"; do
  [[ ! -e "$path" && ! -L "$path" ]]
done
action=${1-}
if [[ "$action" == install ]]; then
  state=$(mktemp -d /tmp/kindred-ci.XXXXXXXX)
  chmod 755 "$state"
  mkdir "$state/bin"
  curl --fail --show-error --silent --location --retry 3 \
    https://github.com/astral-sh/python-build-standalone/releases/download/20261026/cpython-3.14.10%2B20261026-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz \
    --output "$state/python.tar.gz"
  echo "4d3c16c59ed0802a3d1d34d8bce504b15ceeaff39d62dadecc6a9fa803412aed  $state/python.tar.gz" | sha256sum --check
  tar -xzf "$state/python.tar.gz" -C "$state"
  curl --fail --show-error --silent --location --retry 3 \
    https://github.com/astral-sh/uv/releases/download/0.13.5/uv-x86_64-unknown-linux-gnu.tar.gz \
    --output "$state/uv.tar.gz"
  echo "f68d291c75783122dad58ab77def0e13f3233f358731db5d6d7e8715603b928f  $state/uv.tar.gz" | sha256sum --check
  tar -xzf "$state/uv.tar.gz" -C "$state"
  install -m 755 "$state/uv-x86_64-unknown-linux-gnu/uv" "$state/bin/uv"
  curl --fail --show-error --silent --location --retry 3 \
    https://github.com/meilisearch/meilisearch/releases/download/v1.56.0/meilisearch-linux-amd64 \
    --output "$state/bin/meilisearch"
  echo "5a32e1d7a6a69e0ee5634a7456c421f59273d73f078b6f0d8f01384eafe79729  $state/bin/meilisearch" | sha256sum --check
  chmod 755 "$state/bin/meilisearch"
  "$state/python/bin/python3" -c 'import sys; assert sys.version_info[:3] == (3, 14, 10)'
  "$state/bin/meilisearch" --version
  "$state/bin/uv" --version
  printf 'KINDRED_CI_STATE=%s\nUV_PYTHON=%s/python/bin/python3\n' "$state" "$state" >> "${GITHUB_ENV:?}"
  printf '%s/bin\n' "$state" >> "${GITHUB_PATH:?}"
  exit 0
fi
# Install may not have run when an earlier Actions step fails.
if [[ "$action" == stop && -z ${KINDRED_CI_STATE-} ]]; then exit 0; fi
state=${KINDRED_CI_STATE:?}
[[ "$state" =~ ^/tmp/kindred-ci\.[a-zA-Z0-9]+$ && -d "$state" && ! -L "$state" ]]
[[ $(stat -c %u "$state") == 0 ]]
export PGPASSWORD=$POSTGRES_PASSWORD
# Service processes receive no inherited Actions credentials or job metadata.
service_env=(env -i PATH=/usr/lib/postgresql/18/bin:/usr/local/bin:/usr/bin:/bin HOME=/var/lib/postgresql LANG=C.UTF-8)
case "$action" in
  start)
    install -d -o postgres -g postgres -m 700 "$state/pgdata" "$state/socket" "$state/redis" "$state/meili"
    # The unprivileged inner shell expands its positional argument.
    # shellcheck disable=SC2016
    printf '%s\n' "$POSTGRES_PASSWORD" | gosu postgres "${service_env[@]}" sh -c \
      'umask 077; cat > "$1"' -- "$state/socket/init-password"
    gosu postgres "${service_env[@]}" initdb -D "$state/pgdata" \
      --username="$POSTGRES_USER" --pwfile="$state/socket/init-password" \
      --auth-local=trust --auth-host=scram-sha-256 > "$state/initdb.log"
    rm -- "$state/socket/init-password"
    gosu postgres "${service_env[@]}" pg_ctl -D "$state/pgdata" -l "$state/pgdata/server.log" \
      -o "-h 127.0.0.1 -p 5432 -k $state/socket" -w start
    gosu postgres "${service_env[@]}" createdb -h "$state/socket" -U "$POSTGRES_USER" "$POSTGRES_DB"
    gosu postgres "${service_env[@]}" redis-server --bind 127.0.0.1 --protected-mode yes --port 6379 \
      --dir "$state/redis" --save '' --appendonly no --daemonize yes \
      --pidfile "$state/redis/server.pid" --logfile "$state/redis/server.log"
    (
      cd "$state/meili"
      exec nohup gosu postgres "${service_env[@]}" "$state/bin/meilisearch" --http-addr 127.0.0.1:7700 \
        --db-path "$state/meili/data.ms" --env development --no-analytics \
        --max-indexing-memory 128MiB --max-indexing-threads 1
    ) > "$state/meili.log" 2>&1 < /dev/null &
    echo "$!" > "$state/meili.pid"
    for attempt in {1..60}; do
      kill -0 "$(cat "$state/meili.pid")"
      if curl -fsS http://127.0.0.1:7700/health > /dev/null 2>&1; then break; fi
      [[ "$attempt" != 60 ]]
      sleep 1
    done
    ;;
  verify)
    [[ $(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc 'SELECT current_database() || chr(58) || current_user') == "$POSTGRES_DB:$POSTGRES_USER" ]]
    [[ $(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc 'SHOW data_directory') == "$state/pgdata" ]]
    [[ $(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc 'SHOW listen_addresses') == 127.0.0.1 ]]
    [[ $(redis-cli -h 127.0.0.1 --raw CONFIG GET dir | tail -n 1) == "$state/redis" ]]
    [[ $(redis-cli -h 127.0.0.1 --raw CONFIG GET bind | tail -n 1) == 127.0.0.1 ]]
    [[ $(redis-cli -h 127.0.0.1 ping) == PONG ]]
    curl -fsS http://127.0.0.1:7700/health | "$state/python/bin/python3" -c 'import json,sys; assert json.load(sys.stdin) == {"status":"available"}'
    # Bind each service PID to this container's dedicated unprivileged account.
    for file in "$state/pgdata/postmaster.pid" "$state/redis/server.pid" "$state/meili.pid"; do
      pid=$(head -n 1 "$file")
      [[ "$pid" =~ ^[0-9]+$ && $(stat -c %u "/proc/$pid") == "$(id -u postgres)" ]]
    done
    "$state/python/bin/python3" - <<'PY'
from pathlib import Path
expected = {5432, 6379, 7700}
listeners = []
for table in ("/proc/net/tcp", "/proc/net/tcp6"):
    for line in Path(table).read_text().splitlines()[1:]:
        fields = line.split()
        address, port = fields[1].split(":")
        port = int(port, 16)
        if fields[3] == "0A" and port in expected:
            assert address == "0100007F", "CI service listens outside IPv4 loopback"
            listeners.append(port)
assert sorted(listeners) == sorted(expected), "Missing or duplicate CI listeners"
PY
    printf 'Verified job-local PostgreSQL, Redis and Meilisearch identities.\n'
    ;;
  stop)
    if [[ -f "$state/pgdata/postmaster.pid" ]]; then gosu postgres "${service_env[@]}" pg_ctl -D "$state/pgdata" -m fast -w stop; fi
    if [[ -f "$state/redis/server.pid" ]]; then redis-cli -h 127.0.0.1 shutdown nosave; fi
    if [[ -f "$state/meili.pid" ]]; then
      pid=$(cat "$state/meili.pid")
      [[ "$pid" =~ ^[0-9]+$ ]]
      if [[ -e "/proc/$pid/exe" ]]; then
        [[ $(readlink "/proc/$pid/exe") == "$state/bin/meilisearch" ]]
        kill "$pid"
      fi
    fi
    ;;
  *) printf 'Expected install, start, verify, or stop.\n' >&2; exit 2 ;;
esac
