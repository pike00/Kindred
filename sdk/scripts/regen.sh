#!/usr/bin/env bash
# Regenerate src/kindred/_generated/ from ../frontend/openapi.json.
#
# Run after any backend schema change. The generated tree is committed to git
# so the package is self-contained when installed from a git URL.
set -euo pipefail

cd "$(dirname "$0")/.."
SDK_ROOT="$(pwd)"
SPEC="${KINDRED_OPENAPI_SPEC:-$SDK_ROOT/../frontend/openapi.json}"
OUT="$SDK_ROOT/src/kindred/_generated"

if [[ ! -f "$SPEC" ]]; then
    echo "ERROR: OpenAPI spec not found at $SPEC" >&2
    echo "Set KINDRED_OPENAPI_SPEC to override, or run from a tree that has frontend/openapi.json." >&2
    exit 1
fi

echo "→ regenerating from $SPEC"
uvx openapi-python-client generate \
    --path "$SPEC" \
    --meta none \
    --output-path "$OUT" \
    --overwrite

# openapi-python-client drops a .ruff_cache; we don't want it in the package.
rm -rf "$OUT/.ruff_cache"

echo "→ done. Review the diff with: git diff --stat src/kindred/_generated/"
