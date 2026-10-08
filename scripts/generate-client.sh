#! /usr/bin/env bash

set -euo pipefail

# Force local env so private (dev-only) routes — including PrivateService used
# by frontend/src/lib/seed.ts — are included in the OpenAPI export.
export ENVIRONMENT=local

cd backend
uv run python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > ../openapi.json
cd ..
mv openapi.json frontend/
pnpm --filter frontend generate-client

# The legacy client generator leaves spaces on otherwise empty lines.
uv run --project backend python - <<'PY'
from pathlib import Path

for path in Path("frontend/src/client").glob("*.gen.ts"):
    path.write_text("\n".join(line if line.strip() else "" for line in path.read_text().splitlines()) + "\n")
PY
