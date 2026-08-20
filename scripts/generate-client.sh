#! /usr/bin/env bash

set -e
set -x

# Force local env so private (dev-only) routes — including PrivateService used
# by frontend/src/lib/seed.ts — are included in the OpenAPI export.
export ENVIRONMENT=local

cd backend
uv run python -c "import app.main; import json; print(json.dumps(app.main.app.openapi()))" > ../openapi.json
cd ..
mv openapi.json frontend/
if command -v bun >/dev/null 2>&1; then
  (cd frontend && bun run generate-client && bun run lint)
else
  pnpm --filter frontend generate-client
  pnpm run lint
fi

