# Janet ↔ Kindred Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Janet (hermes-agent) to kindred (personal-crm) via an MCP sidecar, then add Mattermost event hooks and scheduled statements via n8n.

**Architecture:** A new stdio MCP server (`kindred-mcp/server.py`) runs as a subprocess inside the hermes-agent container — same pattern as `mcp-server/search_server.py`. It wraps kindred's REST API with a synchronous httpx client, authenticating via `CRM_API_KEY` (already in `.env.sops`). n8n handles the push side: an event router webhook and two cron workflows post into `#kindred-feed` and `#kindred-digest` Mattermost channels.

**Tech Stack:** Python 3.12, `mcp` (FastMCP), `httpx`, `respx` (test mocking), n8n MCP tools (`mcp__n8n-mcp__*`), Mattermost incoming webhooks.

---

## File Map

```
ai/hermes/
  kindred-mcp/
    server.py          NEW — FastMCP stdio server; 8 @mcp.tool() handlers
    client.py          NEW — KindredClient (httpx.Client); one method per API call
    tests/
      test_client.py   NEW — client unit tests (respx mocks)
      test_server.py   NEW — server tool tests (patch client)
  Dockerfile           MOD — add httpx + respx to system pip install
  config/config.yaml   MOD — add kindred_crm entry under mcp_servers:
  docker-compose.yml   MOD — mount ./kindred-mcp + add KINDRED_API_URL + KINDRED_API_KEY to hermes-agent
```

n8n workflows (created via n8n MCP tools, no files):
- `kindred-event-router` — webhook trigger, receives kindred outbound webhooks, posts to #kindred-feed
- `kindred-daily-reminders` — cron 08:00, lists active upcoming reminders, posts to #kindred-feed
- `kindred-weekly-losingtouch` — cron Sat 07:00, calls losing-touch, Janet LLM formats, posts to #kindred-digest

---

## Phase 1 — kindred-mcp MCP sidecar

### Task 1: Verify API key and Mattermost webhook URLs

> No code. Setup steps only.

- [ ] **Step 1: Check if CRM_API_KEY is already set**

```bash
cd ~/Documents/Homelab
just sopsx ai/hermes/.env.sops -d | grep CRM_API_KEY
```

Expected: a value like `crm_...` or similar. If missing, continue to Step 2. If present, skip to Step 4.

- [ ] **Step 2: Get a superuser JWT from kindred**

```bash
# Get access token (replace with actual superuser credentials from .env)
cd ~/projects/personal-crm
FIRST_USER=$(just sopsx .env.sops -d 2>/dev/null | grep FIRST_SUPERUSER= | cut -d= -f2 || grep FIRST_SUPERUSER .env | cut -d= -f2)
FIRST_PASS=$(just sopsx .env.sops -d 2>/dev/null | grep FIRST_SUPERUSER_PASSWORD= | cut -d= -f2 || grep FIRST_SUPERUSER_PASSWORD .env | cut -d= -f2)
TOKEN=$(curl -s -X POST https://kindred.khanpikehome.com/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${FIRST_USER}&password=${FIRST_PASS}" | jq -r .access_token)
echo "TOKEN acquired: ${TOKEN:0:20}..."
```

- [ ] **Step 3: Create a Janet service API key**

```bash
API_KEY=$(curl -s -X POST https://kindred.khanpikehome.com/api/v1/users/me/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "janet-agent", "description": "Hermes AI agent read+write access"}' \
  | jq -r .plaintext_key)
echo "Key prefix: ${API_KEY:0:12}..."
```

- [ ] **Step 4: Store the API key in .env.sops**

```bash
cd ~/Documents/Homelab
NEW_KEY="<value from step 3, or existing value>"
just sopsx ai/hermes/.env.sops -d \
  | grep -v "^CRM_API_KEY=" \
  | { cat; echo "CRM_API_KEY=$NEW_KEY"; } \
  | just sopsx ai/hermes/.env.sops -e
```

- [ ] **Step 5: Provision two Mattermost incoming webhook URLs**

In Mattermost: Main Menu → Integrations → Incoming Webhooks → Add Incoming Webhook.
Create two webhooks:
- Channel: `#kindred-feed`, display name: `Kindred Events`
- Channel: `#kindred-digest`, display name: `Kindred Digest`

Save both webhook URLs — you will need them in Tasks 6–8.

---

### Task 2: kindred HTTP client

**Files:**
- Create: `ai/hermes/kindred-mcp/client.py`
- Create: `ai/hermes/kindred-mcp/tests/__init__.py`
- Create: `ai/hermes/kindred-mcp/tests/test_client.py`

- [ ] **Step 1: Write the failing tests**

Create `ai/hermes/kindred-mcp/tests/__init__.py` (empty).

Create `ai/hermes/kindred-mcp/tests/test_client.py`:

```python
"""Tests for KindredClient — all HTTP calls are mocked with respx."""
import pytest
import respx
import httpx

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from client import KindredClient

BASE = "http://crm-test:8000/api/v1"
KEY = "test-key"


@pytest.fixture
def client():
    c = KindredClient(base_url=BASE, api_key=KEY)
    yield c
    c.close()


@respx.mock
def test_search_contacts(client):
    respx.get(f"{BASE}/contacts/").mock(return_value=httpx.Response(200, json={
        "data": [{"id": "abc", "first_name": "Sarah", "last_name": "Park"}],
        "count": 1,
    }))
    result = client.search_contacts("Sarah")
    assert result["data"][0]["first_name"] == "Sarah"
    assert respx.calls.last.request.headers["authorization"] == f"Bearer {KEY}"


@respx.mock
def test_get_contact(client):
    cid = "abc-123"
    respx.get(f"{BASE}/contacts/{cid}").mock(return_value=httpx.Response(200, json={
        "id": cid, "first_name": "Sarah", "last_name": "Park",
    }))
    respx.get(f"{BASE}/interactions/").mock(return_value=httpx.Response(200, json={
        "data": [{"id": "i1", "channel": "CALL", "description": "quick check-in"}],
        "count": 1,
    }))
    result = client.get_contact(cid)
    assert result["id"] == cid
    assert len(result["recent_interactions"]) == 1


@respx.mock
def test_log_interaction(client):
    respx.post(f"{BASE}/interactions/").mock(return_value=httpx.Response(201, json={
        "id": "i2", "channel": "IN_PERSON", "description": "coffee",
    }))
    result = client.log_interaction("abc", "IN_PERSON", "had coffee")
    assert result["channel"] == "IN_PERSON"


@respx.mock
def test_add_note(client):
    respx.post(f"{BASE}/notes/").mock(return_value=httpx.Response(201, json={
        "id": "n1", "content": "loves hiking",
    }))
    result = client.add_note("abc", "loves hiking")
    assert result["content"] == "loves hiking"


@respx.mock
def test_create_reminder(client):
    respx.post(f"{BASE}/reminders/").mock(return_value=httpx.Response(201, json={
        "id": "r1", "body": "call her", "remind_at": "2026-06-01T09:00:00Z",
    }))
    result = client.create_reminder("abc", "2026-06-01T09:00:00Z", "call her")
    assert result["body"] == "call her"


@respx.mock
def test_losing_touch(client):
    respx.get(f"{BASE}/contacts/losing-touch").mock(return_value=httpx.Response(200, json={
        "data": [{"id": "abc", "first_name": "Sarah", "last_name": "Park"}],
        "count": 1,
    }))
    result = client.losing_touch()
    assert result["count"] == 1


@respx.mock
def test_upcoming_reminders(client):
    respx.get(f"{BASE}/reminders/").mock(return_value=httpx.Response(200, json={
        "data": [
            {"id": "r1", "body": "call", "remind_at": "2999-01-01T09:00:00+00:00", "is_active": True},
            {"id": "r2", "body": "old",  "remind_at": "2020-01-01T09:00:00+00:00", "is_active": True},
        ],
        "count": 2,
    }))
    result = client.upcoming_reminders(days=7)
    # r2 is in the past; r1 is far future (outside 7-day window); both excluded
    assert result["count"] == 0


@respx.mock
def test_upcoming_life_events(client):
    respx.get(url__regex=r".*/calendar/month/\d{4}-\d{2}").mock(return_value=httpx.Response(200, json={
        "days": {
            "2026-05-15": [{"contact_id": "abc", "name": "Sarah Park", "type": "birthday"}]
        }
    }))
    result = client.upcoming_life_events(months=1)
    assert result["count"] == 1
```

- [ ] **Step 2: Run tests — verify they all fail (ImportError: client)**

```bash
cd ~/Documents/Homelab/ai/hermes
uv run --with "respx httpx pytest" pytest kindred-mcp/tests/test_client.py -v 2>&1 | tail -20
```

Expected: `ImportError: No module named 'client'` or `ModuleNotFoundError`.

- [ ] **Step 3: Implement client.py**

Create `ai/hermes/kindred-mcp/client.py`:

```python
"""Thin httpx client for kindred (personal-crm) REST API."""
import logging
import sys
from datetime import datetime, timedelta, timezone

import httpx

logging.disable(logging.CRITICAL)  # stdio MCP — never write to stdout

log = logging.getLogger(__name__)


class KindredClient:
    def __init__(self, base_url: str, api_key: str, timeout: float = 15.0) -> None:
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )

    # --- Read tools ---

    def search_contacts(self, query: str, limit: int = 10) -> dict:
        return self._http.get(
            "/contacts/", params={"search": query, "limit": limit}
        ).raise_for_status().json()

    def get_contact(self, contact_id: str) -> dict:
        contact = self._http.get(
            f"/contacts/{contact_id}"
        ).raise_for_status().json()
        interactions = self._http.get(
            "/interactions/", params={"contact_id": contact_id, "limit": 5}
        ).raise_for_status().json()
        return {**contact, "recent_interactions": interactions.get("data", [])}

    def losing_touch(self, limit: int = 20) -> dict:
        return self._http.get(
            "/contacts/losing-touch", params={"limit": limit}
        ).raise_for_status().json()

    def upcoming_reminders(self, days: int = 7) -> dict:
        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(days=days)
        result = self._http.get(
            "/reminders/", params={"is_active": "true", "limit": 100}
        ).raise_for_status().json()
        in_window = [
            r for r in result.get("data", [])
            if r.get("remind_at")
            and now.isoformat() <= r["remind_at"] <= cutoff.isoformat()
        ]
        return {"data": in_window, "count": len(in_window)}

    def upcoming_life_events(self, months: int = 2) -> dict:
        from datetime import date
        results = []
        today = date.today()
        for i in range(months):
            raw_month = today.month + i
            year = today.year + (raw_month - 1) // 12
            month = ((raw_month - 1) % 12) + 1
            data = self._http.get(
                f"/calendar/month/{year:04d}-{month:02d}"
            ).raise_for_status().json()
            for day_events in data.get("days", {}).values():
                results.extend(day_events)
        return {"data": results, "count": len(results)}

    # --- Write tools ---

    def log_interaction(
        self,
        contact_id: str,
        kind: str,
        summary: str,
        occurred_at: str | None = None,
    ) -> dict:
        """kind: CALL | EMAIL | IN_PERSON | OTHER | SOCIAL | TEXT | VIDEO"""
        payload: dict = {
            "attendee_ids": [contact_id],
            "channel": kind.upper(),
            "description": summary,
        }
        if occurred_at:
            payload["occurred_at"] = occurred_at
        return self._http.post(
            "/interactions/", json=payload
        ).raise_for_status().json()

    def add_note(self, contact_id: str, content: str) -> dict:
        return self._http.post(
            "/notes/", json={"contact_id": contact_id, "content": content}
        ).raise_for_status().json()

    def create_reminder(
        self, contact_id: str, remind_at: str, body: str
    ) -> dict:
        return self._http.post(
            "/reminders/",
            json={"contact_id": contact_id, "remind_at": remind_at, "body": body},
        ).raise_for_status().json()

    def close(self) -> None:
        self._http.close()
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd ~/Documents/Homelab/ai/hermes
uv run --with "respx httpx pytest" pytest kindred-mcp/tests/test_client.py -v
```

Expected:
```
test_client.py::test_search_contacts PASSED
test_client.py::test_get_contact PASSED
test_client.py::test_log_interaction PASSED
test_client.py::test_add_note PASSED
test_client.py::test_create_reminder PASSED
test_client.py::test_losing_touch PASSED
test_client.py::test_upcoming_reminders PASSED
test_client.py::test_upcoming_life_events PASSED
8 passed
```

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Homelab
git add ai/hermes/kindred-mcp/
git commit -m "feat(kindred-mcp): kindred HTTP client + tests"
```

---

### Task 3: FastMCP server

**Files:**
- Create: `ai/hermes/kindred-mcp/server.py`
- Create: `ai/hermes/kindred-mcp/tests/test_server.py`

- [ ] **Step 1: Write the failing tests**

Create `ai/hermes/kindred-mcp/tests/test_server.py`:

```python
"""Tests for kindred MCP server tools — patches KindredClient."""
import pytest
from unittest.mock import MagicMock, patch
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

FAKE_CONTACTS = {
    "data": [{"id": "abc", "first_name": "Sarah", "last_name": "Park"}],
    "count": 1,
}
FAKE_CONTACT = {
    "id": "abc", "first_name": "Sarah", "last_name": "Park",
    "recent_interactions": [{"channel": "CALL", "description": "quick chat"}],
}
FAKE_INTERACTION = {"id": "i1", "channel": "IN_PERSON", "description": "coffee"}
FAKE_NOTE = {"id": "n1", "content": "loves hiking"}
FAKE_REMINDER = {"id": "r1", "body": "call her", "remind_at": "2026-06-01T09:00:00Z"}
FAKE_LOSING = {"data": [{"id": "abc", "first_name": "Sarah"}], "count": 1}
FAKE_UPCOMING = {"data": [{"id": "r1", "body": "call"}], "count": 1}
FAKE_EVENTS = {"data": [{"type": "birthday", "name": "Sarah Park"}], "count": 1}


def make_mock_client(**overrides):
    m = MagicMock()
    m.search_contacts.return_value = overrides.get("search", FAKE_CONTACTS)
    m.get_contact.return_value = overrides.get("get_contact", FAKE_CONTACT)
    m.log_interaction.return_value = overrides.get("log_interaction", FAKE_INTERACTION)
    m.add_note.return_value = overrides.get("add_note", FAKE_NOTE)
    m.create_reminder.return_value = overrides.get("create_reminder", FAKE_REMINDER)
    m.losing_touch.return_value = overrides.get("losing_touch", FAKE_LOSING)
    m.upcoming_reminders.return_value = overrides.get("upcoming_reminders", FAKE_UPCOMING)
    m.upcoming_life_events.return_value = overrides.get("life_events", FAKE_EVENTS)
    return m


def test_search_contacts_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_search_contacts("Sarah")
    assert "Sarah" in result


def test_get_contact_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_get_contact("abc")
    assert "Sarah" in result
    assert "quick chat" in result


def test_log_interaction_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_log_interaction("abc", "IN_PERSON", "had coffee")
    assert "IN_PERSON" in result or "coffee" in result


def test_add_note_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_add_note("abc", "loves hiking")
    assert "hiking" in result


def test_create_reminder_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_create_reminder("abc", "2026-06-01T09:00:00Z", "call her")
    assert "call her" in result


def test_losing_touch_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_losing_touch()
    assert "Sarah" in result


def test_upcoming_reminders_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_upcoming_reminders()
    assert "call" in result


def test_upcoming_life_events_tool():
    import server
    with patch("server._client", make_mock_client()):
        result = server.kindred_upcoming_life_events()
    assert "birthday" in result or "Sarah" in result
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd ~/Documents/Homelab/ai/hermes
uv run --with "respx httpx pytest" pytest kindred-mcp/tests/test_server.py -v 2>&1 | tail -5
```

Expected: `ImportError: No module named 'server'`.

- [ ] **Step 3: Implement server.py**

Create `ai/hermes/kindred-mcp/server.py`:

```python
#!/usr/bin/env python3
"""Kindred CRM MCP server — stdio transport, runs as subprocess in hermes-agent.

IMPORTANT: Uses stdio transport. Never print() to stdout.
Use sys.stderr for all logging.

Environment variables:
  KINDRED_API_URL  — kindred FastAPI base (default: http://crm-api:8000/api/v1)
  KINDRED_API_KEY  — Bearer token (plaintext API key from /api/v1/users/me/api-keys)
"""
import json
import logging
import os
import sys

logging.disable(logging.CRITICAL)  # protect stdio JSON-RPC stream

from mcp.server.fastmcp import FastMCP
from client import KindredClient

KINDRED_API_URL = os.environ.get("KINDRED_API_URL", "http://crm-api:8000/api/v1")
KINDRED_API_KEY = os.environ["KINDRED_API_KEY"]

mcp = FastMCP("Kindred CRM")
_client = KindredClient(base_url=KINDRED_API_URL, api_key=KINDRED_API_KEY)


def _fmt(data: dict) -> str:
    return json.dumps(data, indent=2, default=str)


@mcp.tool()
def kindred_search_contacts(query: str, limit: int = 10) -> str:
    """Search kindred contacts by name, company, or nickname."""
    return _fmt(_client.search_contacts(query, limit))


@mcp.tool()
def kindred_get_contact(contact_id: str) -> str:
    """Get full contact detail plus 5 most recent interactions."""
    return _fmt(_client.get_contact(contact_id))


@mcp.tool()
def kindred_log_interaction(
    contact_id: str,
    kind: str,
    summary: str,
    occurred_at: str = "",
) -> str:
    """Log an interaction with a contact.

    kind: CALL | EMAIL | IN_PERSON | OTHER | SOCIAL | TEXT | VIDEO
    occurred_at: ISO 8601 datetime string (optional, defaults to now)
    """
    return _fmt(_client.log_interaction(
        contact_id, kind, summary, occurred_at or None
    ))


@mcp.tool()
def kindred_add_note(contact_id: str, content: str) -> str:
    """Attach a freeform note to a contact."""
    return _fmt(_client.add_note(contact_id, content))


@mcp.tool()
def kindred_create_reminder(contact_id: str, remind_at: str, body: str) -> str:
    """Schedule a follow-up reminder for a contact.

    remind_at: ISO 8601 datetime string, e.g. '2026-06-01T09:00:00Z'
    """
    return _fmt(_client.create_reminder(contact_id, remind_at, body))


@mcp.tool()
def kindred_losing_touch(limit: int = 20) -> str:
    """List contacts overdue for a check-in (contact_frequency_days exceeded)."""
    return _fmt(_client.losing_touch(limit))


@mcp.tool()
def kindred_upcoming_reminders(days: int = 7) -> str:
    """List active reminders due within the next N days (default 7)."""
    return _fmt(_client.upcoming_reminders(days))


@mcp.tool()
def kindred_upcoming_life_events(months: int = 2) -> str:
    """List birthdays and annual life events in the next N months (default 2)."""
    return _fmt(_client.upcoming_life_events(months))


if __name__ == "__main__":
    mcp.run()
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd ~/Documents/Homelab/ai/hermes
uv run --with "respx httpx pytest" pytest kindred-mcp/tests/ -v
```

Expected: 16 passed (8 client + 8 server).

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/Homelab
git add ai/hermes/kindred-mcp/
git commit -m "feat(kindred-mcp): FastMCP server with 8 kindred tools"
```

---

### Task 4: Hermes integration

**Files:**
- Modify: `ai/hermes/Dockerfile`
- Modify: `ai/hermes/config/config.yaml`
- Modify: `ai/hermes/docker-compose.yml`

- [ ] **Step 1: Add httpx to Dockerfile system install**

In `ai/hermes/Dockerfile`, find the `uv pip install --system` line and append `httpx`:

```dockerfile
RUN uv pip install --system --no-cache --break-system-packages mcp chromadb ollama pdfplumber pymupdf openlit mcp-proxy loguru beancount beanquery httpx \
    && uv pip install --python /opt/hermes/.venv/bin/python3 --no-cache openlit
```

- [ ] **Step 2: Add kindred_crm MCP server entry to config.yaml**

In `ai/hermes/config/config.yaml`, under `mcp_servers:`, after the `mempalace:` block, add:

```yaml
  kindred_crm:
    command: "/usr/bin/python3"
    args: ["/opt/kindred-mcp/server.py"]
    timeout: 30
    connect_timeout: 10
    env:
      KINDRED_API_URL: "http://crm-api:8000/api/v1"
      KINDRED_API_KEY: "${KINDRED_API_KEY}"
    tools:
      include:
        - kindred_search_contacts
        - kindred_get_contact
        - kindred_log_interaction
        - kindred_add_note
        - kindred_create_reminder
        - kindred_losing_touch
        - kindred_upcoming_reminders
        - kindred_upcoming_life_events
      prompts: false
      resources: false
```

- [ ] **Step 3: Mount kindred-mcp and add env vars to hermes-agent in docker-compose.yml**

In the `hermes-agent:` service in `ai/hermes/docker-compose.yml`:

Add to `volumes:`:
```yaml
      - ./kindred-mcp:/opt/kindred-mcp:ro
```

Add to `environment:`:
```yaml
      - KINDRED_API_URL=http://crm-api:8000/api/v1
      - KINDRED_API_KEY=${KINDRED_API_KEY}
```

- [ ] **Step 4: Validate compose**

```bash
cd ~/Documents/Homelab
just config hermes 2>&1 | grep -E "kindred|error|Error" | head -20
```

Expected: kindred-mcp volume and env vars appear in config output; no errors.

- [ ] **Step 5: Rebuild and restart hermes-agent**

```bash
hl rebuild hermes hermes-agent
```

- [ ] **Step 6: Verify MCP tool appears in hermes-agent logs**

```bash
hl logs hermes hermes-agent 2>&1 | grep -i "kindred\|mcp" | head -10
```

Expected: log lines showing kindred_crm MCP server started or tools registered.

- [ ] **Step 7: Smoke test from Mattermost**

In Mattermost, DM `@janet`:

```
@janet who am I losing touch with?
```

Expected: Janet returns a list of contacts from kindred (may be empty if no contacts have `contact_frequency_days` set). Verify no error about "kindred tool not available."

```
@janet search for [a contact name you know is in kindred]
```

Expected: Janet returns contact details.

- [ ] **Step 8: Commit**

```bash
cd ~/Documents/Homelab
git add ai/hermes/Dockerfile ai/hermes/config/config.yaml ai/hermes/docker-compose.yml
git commit -m "feat(hermes): mount kindred-mcp + wire into hermes-agent MCP loader"
```

---

## Phase 3 — n8n webhook router (kindred events → Mattermost)

### Task 5: kindred-event-router workflow

> Uses n8n MCP tools. Have the two Mattermost incoming webhook URLs from Task 1 Step 5 ready.

- [ ] **Step 1: Register kindred's outbound webhook to n8n**

First, deploy the n8n workflow (next step) to get the webhook path, then register it. For now, note the placeholder path — n8n will assign a UUID on creation.

- [ ] **Step 2: Create the n8n workflow via MCP**

```
Use mcp__n8n-mcp__n8n_create_workflow with:

name: "kindred-event-router"

nodes:
  1. Webhook trigger (nodes-base.webhook):
     - httpMethod: POST
     - path: kindred-events
     - responseMode: onReceived

  2. Code node (nodes-base.code):
     - JavaScript — maps kindred event payload to Slack-JSON for Mattermost
     - Code:
       const event = $input.first().json;
       const eventType = event.event_type || "unknown";
       const contactName = event.data?.full_name || event.data?.first_name || "A contact";

       const messages = {
         "contact.created": `➕ **${contactName}** added to kindred`,
         "contact.updated": `✏️ **${contactName}** updated in kindred`,
         "interaction.created": `💬 Interaction logged with **${contactName}**: ${event.data?.description || ""}`,
         "note.created": `📝 Note added for **${contactName}**: ${event.data?.content?.slice(0, 120) || ""}`,
         "reminder.created": `⏰ Reminder set for **${contactName}**: ${event.data?.body || ""} at ${event.data?.remind_at || ""}`,
         "life_event.created": `🎂 Life event for **${contactName}**: ${event.data?.name || event.data?.event_type || ""}`,
       };

       return [{ json: { text: messages[eventType] || `📌 kindred event: ${eventType} for ${contactName}` } }];

  3. HTTP Request node (nodes-base.httpRequest):
     - method: POST
     - url: <KINDRED_FEED_MATTERMOST_WEBHOOK_URL>
     - body: JSON
     - body content: {{ $json }}

connections:
  Webhook → Code → HTTP Request
```

- [ ] **Step 3: Activate the workflow and get the webhook URL**

```
Use mcp__n8n-mcp__n8n_update_partial_workflow with:
  operations: [{ type: "activateWorkflow" }]
```

Then get the webhook URL:
```
Use mcp__n8n-mcp__n8n_get_workflow
```

The webhook URL will be: `https://n8n.khanpikehome.com/webhook/kindred-events`

- [ ] **Step 4: Register webhook in kindred**

```bash
TOKEN=$(curl -s -X POST https://kindred.khanpikehome.com/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=<FIRST_SUPERUSER>&password=<FIRST_SUPERUSER_PASSWORD>" | jq -r .access_token)

curl -s -X POST https://kindred.khanpikehome.com/api/v1/webhooks/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n-event-router",
    "url": "https://n8n.khanpikehome.com/webhook/kindred-events",
    "direction": "outbound",
    "event_types": "contact.created,contact.updated,interaction.created,note.created,reminder.created,life_event.created",
    "is_active": true
  }' | jq .
```

- [ ] **Step 5: Smoke test**

Create a new contact in kindred UI. Within 30 seconds, `#kindred-feed` in Mattermost should receive a `➕ <name> added to kindred` message.

---

## Phase 4 — n8n scheduled statements

### Task 6: Daily reminders workflow

- [ ] **Step 1: Create the workflow**

```
Use mcp__n8n-mcp__n8n_create_workflow with:

name: "kindred-daily-reminders"

nodes:
  1. Schedule trigger (nodes-base.scheduleTrigger):
     - rule: { interval: [{ field: "cronExpression", expression: "0 8 * * *" }] }

  2. HTTP Request node — fetch upcoming reminders:
     - method: GET
     - url: https://kindred.khanpikehome.com/api/v1/reminders/
     - queryParameters: { is_active: "true", limit: "50" }
     - headers: { Authorization: "Bearer <KINDRED_API_KEY>" }

  3. Code node — filter to next 3 days + format:
     - JavaScript:
       const now = new Date();
       const cutoff = new Date(now.getTime() + 3 * 86400000);
       const reminders = $input.first().json.data || [];
       const upcoming = reminders.filter(r => {
         if (!r.remind_at) return false;
         const d = new Date(r.remind_at);
         return d >= now && d <= cutoff;
       });

       if (upcoming.length === 0) return [];

       const lines = upcoming.map(r => {
         const d = new Date(r.remind_at);
         const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
         return `• **${label}** — ${r.body}`;
       });

       return [{ json: { text: `⏰ **Upcoming reminders:**\n${lines.join("\n")}` } }];

  4. HTTP Request node — post to Mattermost:
     - method: POST
     - url: <KINDRED_FEED_MATTERMOST_WEBHOOK_URL>
     - body: JSON
     - body content: {{ $json }}

connections:
  Schedule → Fetch reminders → Code → Post to Mattermost
```

- [ ] **Step 2: Activate and manually trigger to verify**

```
Use mcp__n8n-mcp__n8n_test_workflow with workflowId = <id from step 1>
```

Expected: `#kindred-feed` receives either a reminders list or silence (no errors). If no reminders in the next 3 days, the Code node returns `[]` and nothing is posted — this is correct.

- [ ] **Step 3: Activate on cron**

```
Use mcp__n8n-mcp__n8n_update_partial_workflow:
  operations: [{ type: "activateWorkflow" }]
```

---

### Task 7: Weekly losing-touch summary (Janet-flavored)

- [ ] **Step 1: Create the workflow**

```
Use mcp__n8n-mcp__n8n_create_workflow with:

name: "kindred-weekly-losingtouch"

nodes:
  1. Schedule trigger (nodes-base.scheduleTrigger):
     - rule: { interval: [{ field: "cronExpression", expression: "0 7 * * 6" }] }
       (Saturday 07:00)

  2. HTTP Request node — fetch losing-touch contacts:
     - method: GET
     - url: https://kindred.khanpikehome.com/api/v1/contacts/losing-touch
     - queryParameters: { limit: "25" }
     - headers: { Authorization: "Bearer <KINDRED_API_KEY>" }

  3. HTTP Request node — fetch upcoming life events (this month):
     - method: GET
     - url: https://kindred.khanpikehome.com/api/v1/calendar/month/{{ $now.format("yyyy-MM") }}
     - headers: { Authorization: "Bearer <KINDRED_API_KEY>" }

  4. Code node — combine into prompt context:
     - JavaScript:
       const losing = $('Fetch losing-touch').first().json.data || [];
       const calData = $('Fetch life events').first().json.days || {};

       const losingLines = losing.slice(0, 10).map(c => {
         const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
         const last = c.last_contacted_at
           ? new Date(c.last_contacted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
           : "never";
         return `- ${name} (last: ${last})`;
       }).join("\n");

       const events = Object.entries(calData).flatMap(([date, evts]) =>
         evts.map(e => `- ${e.name}: ${e.type} on ${date}`)
       ).join("\n");

       const prompt = `You are Janet, a personal relationship assistant. Write a warm, concise weekly relationship digest for Will.

People to reconnect with this week (haven't been contacted in a while):
${losingLines || "None — you're all caught up!"}

Upcoming birthdays and life events this month:
${events || "None"}

Write 3-5 sentences max. Be warm but not sycophantic. Suggest one specific person to reach out to first and a conversation starter based on their history if possible. Sign off as Janet.`;

       return [{ json: { prompt } }];

  5. HTTP Request node — call LiteLLM (Janet):
     - method: POST
     - url: http://litellm:4000/v1/chat/completions
     - headers: { Authorization: "Bearer <LITELLM_API_KEY>", Content-Type: "application/json" }
     - body: JSON
     - body content:
       {
         "model": "gemma4-31b-cloud",
         "messages": [{ "role": "user", "content": "{{ $json.prompt }}" }],
         "max_tokens": 400
       }

  6. Code node — extract text + format for Mattermost:
     - JavaScript:
       const text = $input.first().json.choices?.[0]?.message?.content || "Janet couldn't generate a digest this week.";
       return [{ json: { text: `📬 **Weekly relationship digest from Janet:**\n\n${text}` } }];

  7. HTTP Request node — post to #kindred-digest:
     - method: POST
     - url: <KINDRED_DIGEST_MATTERMOST_WEBHOOK_URL>
     - body: JSON
     - body content: {{ $json }}

connections:
  Schedule → Fetch losing-touch → Code (combine) → Call LiteLLM → Code (format) → Post to Mattermost
  Schedule → Fetch life events → Code (combine)  [merge into combine node]
```

Note: n8n's merge pattern — both HTTP Request nodes feed into the Code node. Use the node names as shown in the Code node's `$('node name').first()` syntax.

- [ ] **Step 2: Manually trigger and verify**

```
Use mcp__n8n-mcp__n8n_test_workflow with workflowId = <id from step 1>
```

Expected: `#kindred-digest` receives a Janet-written weekly digest. Verify the LLM call succeeds (check n8n execution logs if Mattermost post doesn't arrive).

- [ ] **Step 3: Activate on cron**

```
Use mcp__n8n-mcp__n8n_update_partial_workflow:
  operations: [{ type: "activateWorkflow" }]
```

- [ ] **Step 4: Update Homelab tracking README**

Update `~/Documents/Homelab/docs/projects/janet-kindred/README.md`:
- Flip all 4 phase checkboxes to `[x]`
- Update `status: completed`
- Add session log entry

```bash
cd ~/Documents/Homelab
git add docs/projects/janet-kindred/README.md
git commit -m "projects: complete janet-kindred integration"
```

---

## Self-review notes

- API key auth already shipped in kindred — Phase 2 is done; no blocker.
- `CRM_API_KEY` already has a slot in `.env.sops` from crm-indexer; Task 1 just verifies or fills it.
- `httpx` added to Dockerfile as explicit dep (it's likely transitive already, but explicit is safer).
- Life events route is contact-scoped in kindred; `upcoming_life_events` uses the `/calendar/month/` endpoint instead — avoids N+1 queries and matches the UX-friendly month view.
- Reminders route has no `due_within_days` param — client-side filtering in `upcoming_reminders()` handles this; test covers the edge case.
- The LiteLLM call in Task 7 uses the internal Docker hostname `http://litellm:4000` — this is only reachable from within n8n's container network. Verify n8n is on `pikenet-private` (it is per `automation/n8n/docker-compose.yml`).
- n8n's merge pattern for Task 7 (two HTTP nodes into one Code node): use `$('node name')` syntax to reference each upstream node by name — do not use `$input` when multiple inputs exist.
