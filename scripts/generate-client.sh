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
bun run --filter frontend generate-client
bun run lint
