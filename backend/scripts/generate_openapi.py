"""Generate OpenAPI spec from the FastAPI app with mocked settings."""

import json
import os
import sys
import warnings

# Suppress warnings to avoid corrupting JSON output
warnings.filterwarnings("ignore")

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
from fastapi import FastAPI  # noqa: E402

from app.api.main import api_router  # noqa: E402

app = FastAPI()
app.include_router(api_router)

# Generate OpenAPI spec
spec = app.openapi()

# Output to stdout
sys.stdout.write(json.dumps(spec, indent=2))
sys.stdout.write("\n")
