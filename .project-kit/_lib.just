# .project-kit/_lib.just, generated shared helpers for kindred

# Resolve the real execution host before any host-dependent action. Named
# targets are generic and can be reused by any managed subsystem.
context TARGET="":
    #!/usr/bin/env bash
    set -euo pipefail
    execution_host="$(hostname -s | tr '[:upper:]' '[:lower:]')"
    requested_target="{{TARGET}}"
    printf 'host=%s\nrepo=%s\n' "$execution_host" "$(pwd)"
    matched=false
    if [ -n "$requested_target" ] && [ "$matched" != true ]; then
        printf 'error=unknown execution target: %s\n' "$requested_target" >&2
        exit 2
    fi

[private]
_skip LABEL:
    @echo "[skip] {{LABEL}} not configured for this repo"

[private]
_step N TOTAL MSG:
    @echo "[{{N}}/{{TOTAL}}] {{MSG}}..."
