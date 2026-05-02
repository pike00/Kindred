"""Generate OpenAPI spec from the FastAPI app with mocked settings."""

import json
import os

# Mock environment variables before importing the app
os.environ.setdefault("PROJECT_NAME", "Personal CRM")
os.environ.setdefault("POSTGRES_SERVER", "localhost")
os.environ.setdefault("POSTGRES_USER", "postgres")
os.environ.setdefault("POSTGRES_PASSWORD", "postgres")
os.environ.setdefault("POSTGRES_DB", "personal_crm")
os.environ.setdefault("FIRST_SUPERUSER", "admin@example.com")
os.environ.setdefault("FIRST_SUPERUSER_PASSWORD", "changethis")
os.environ.setdefault("OIDC_JIT_ACTIVE", "false")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("MEILI_URL", "http://localhost:7700")
os.environ.setdefault("MEILI_MASTER_KEY", "test")

# Now import and generate
# Create a minimal FastAPI app to get the OpenAPI spec
from fastapi import FastAPI

from app.api.main import api_router

app = FastAPI()
app.include_router(api_router)

# Generate OpenAPI spec
spec = app.openapi()

# Output to stdout
print(json.dumps(spec, indent=2))
