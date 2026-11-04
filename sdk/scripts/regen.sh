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
uv run --frozen openapi-python-client generate \
    --path "$SPEC" \
    --meta none \
    --output-path "$OUT" \
    --overwrite

# openapi-python-client drops a .ruff_cache; we don't want it in the package.
rm -rf "$OUT/.ruff_cache"

# Preserve the pre-method-path operation module imports for one release. The
# generator owns the canonical method/path modules; these aliases are generated
# from the reviewed rename map on every regeneration.
compat_map="$SDK_ROOT/compat-operations.tsv"
compat_count=0
while IFS=$'\t' read -r old_path new_path; do
    old_rel="${old_path#sdk/src/kindred/_generated/api/}"
    new_rel="${new_path#sdk/src/kindred/_generated/api/}"
    old_dir="$(dirname "$old_rel")"
    new_dir="$(dirname "$new_rel")"
    if [[ "$old_dir" != "$new_dir" ]]; then
        echo "ERROR: compatibility operation moved packages: $old_rel -> $new_rel" >&2
        exit 1
    fi
    new_module="$(basename "$new_rel" .py)"
    cat >"$OUT/api/$old_rel" <<EOF
"""Compatibility alias for the pre-method-path operation ID."""

from .${new_module} import *  # noqa: F403
EOF
    compat_count=$((compat_count + 1))
done <"$compat_map"

echo "→ done ($compat_count compatibility aliases). Review the diff with: git diff --stat src/kindred/_generated/"
