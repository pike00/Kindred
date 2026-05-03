# Janet ↔ Kindred Integration Spec

## Goal

Connect Janet (the Hermes AI agent) to kindred (personal-crm at `kindred.example.com`) via API-key auth so that:

1. **Reactive** — Janet can look up, create, and update CRM records when invoked from either Mattermost or OpenWebUI/hermes-workspace.
2. **Event hooks** — kindred events (interaction logged, contact updated, etc.) post directly to a Mattermost channel via incoming webhook, routed and formatted through n8n.
3. **Scheduled statements** — n8n cron workflows post daily reminders and weekly summaries to Mattermost, some LLM-flavored (via Janet), some pure-template.

## Architecture

```
                         ┌──────────────┐
            ┌──────────► │    Janet     │ ◄─────────┐
            │            │ (hermes-     │           │
            │            │  agent)      │           │
            │            └──────┬───────┘           │
   Mattermost                   │ MCP          OpenWebUI /
   (mattermost-                 │ tools       hermes-workspace
    bot ↔ hermes)               ▼                   │
            ▲          ┌────────────────┐            │
            │          │  kindred-mcp   │            │
            │          │   (sidecar)    │            │
            │          └────────┬───────┘            │
            │                   │ HTTP + API key     │
            │                   ▼                    │
            │          ┌────────────────┐            │
            │          │    kindred     │            │
            │          │ (FastAPI/Pg)   │            │
            │          └────────┬───────┘            │
            │                   │                    │
            │           webhook │                    │
            │           events  │                    │
            │                   ▼                    │
            │          ┌────────────────┐            │
            │          │     n8n        │ ───────────┘
            │          │  (router +     │  (statement posts
            │          │   formatter)   │   to channel)
            │          └───────┬────────┘
            │                  │
            ▼                  ▼
     #kindred-feed      #kindred-digest
     (events, daily)    (weekly summaries)
```

## Components

### 1. `kindred-mcp` sidecar (`ai/hermes/kindred-mcp/`)

A small Python MCP server mounted into hermes-agent. Authenticates to kindred via `KINDRED_API_KEY` header. Exposes 8 tools:

| Tool | HTTP call | Purpose |
|---|---|---|
| `kindred_search_contacts` | `GET /api/v1/contacts/?search=` | Full-text contact search |
| `kindred_get_contact` | `GET /api/v1/contacts/{id}` + interactions | Full contact detail |
| `kindred_log_interaction` | `POST /api/v1/interactions/` | Log a call/text/meeting/note |
| `kindred_add_note` | `POST /api/v1/notes/` | Attach freeform note to contact |
| `kindred_create_reminder` | `POST /api/v1/reminders/` | Schedule a follow-up |
| `kindred_losing_touch` | `GET /api/v1/contacts/?losing_touch=true` | Contacts overdue for contact |
| `kindred_upcoming_reminders` | `GET /api/v1/reminders/?due_within_days=N` | Reminders in next N days |
| `kindred_upcoming_life_events` | `GET /api/v1/life-events/?within_days=N` | Birthdays/anniversaries |

Env vars needed:
- `KINDRED_API_URL` — e.g. `http://crm-api:8000/api/v1` (internal, on `kindred-private`)
- `KINDRED_API_KEY` — service account key (added to `ai/hermes/.env.sops`)

### 2. hermes-agent compose changes (`ai/hermes/docker-compose.yml`)

- Add `kindred-mcp` service on `kindred-private` + `kindred-internal-hermes`
- Mount `./kindred-mcp:/opt/kindred-mcp:ro` into hermes-agent
- Add `KINDRED_API_URL` and `KINDRED_API_KEY` env vars to hermes-agent
- Add hermes-agent to kindred's Docker network (or rely on `kindred-private`)

### 3. kindred API key auth (in-flight)

Being built separately. This spec assumes:
- A `Bearer <token>` header path exists on all routes used above
- The token is scoped to a single service account owner (not superuser)
- Stored in `ai/hermes/.env.sops` as `KINDRED_API_KEY`

### 4. kindred webhook registration

No code changes to kindred. After deploy, seed via API:

```bash
POST /api/v1/webhooks/
{
  "name": "n8n-event-router",
  "url": "https://n8n.example.com/webhook/<uuid>",
  "direction": "outbound",
  "event_types": "contact.created,contact.updated,interaction.created,note.created,reminder.created,life_event.created",
  "is_active": true
}
```

n8n receives kindred's native payload and translates to Slack-JSON before posting to Mattermost.

### 5. n8n workflows (3)

| Workflow | Trigger | Endpoint | Channel | Flavor |
|---|---|---|---|---|
| `kindred-event-router` | Webhook (from kindred) | — | `#kindred-feed` | Template |
| `kindred-daily-reminders` | Cron 08:00 daily | `upcoming_reminders?days=3` | `#kindred-feed` | Template |
| `kindred-weekly-losingtouch` | Cron Sat 07:00 | `losing_touch` | `#kindred-digest` | Janet (LLM directive) |

### 6. Mattermost

Two incoming webhook URLs provisioned:
- `#kindred-feed` — high-frequency: events + daily reminders
- `#kindred-digest` — low-frequency: weekly Janet-written summary

Stored in n8n credentials (not in `.env.sops`).

## Data Flows

### Flow A: Reactive

```
User message (Mattermost DM / OpenWebUI chat)
  → mattermost-bot or OpenWebUI forwards to hermes-agent API
  → hermes-agent selects kindred-mcp tool
  → kindred-mcp: HTTP + Bearer token → kindred FastAPI
  → kindred persists or queries, returns JSON
  → hermes-agent formats natural-language reply
  → back to user surface
```

### Flow B: Event hooks

```
User action in kindred UI (new interaction, contact edit, etc.)
  → kindred dispatches to registered WebhookEndpoint rows
  → n8n webhook trigger receives native kindred payload
  → Code node formats to Mattermost Slack-JSON
    e.g. "Logged: coffee with **Sarah Park** — she mentioned her son started college"
  → HTTP Request → POST #kindred-feed incoming webhook
```

### Flow C: Scheduled statements

```
n8n cron fires (daily 08:00 or Sat 07:00)
  → HTTP Request: GET kindred API endpoint with Bearer token
  → [daily] Code node: template → #kindred-feed
  → [weekly] AI Agent node (Janet/gemma4): directive system prompt
      "List people I haven't talked to in 3+ weeks with one sentence about
       each and a suggested topic based on their last interaction."
    → HTTP Request → POST #kindred-digest incoming webhook
```

## Error Handling

- **kindred-mcp failures**: surface error text to Janet so she can tell the user "couldn't reach kindred — try again." Do not silently swallow.
- **n8n webhook events**: n8n retries failed HTTP requests 3x with backoff. Dead-letter to a `#n8n-errors` channel (already in place per agent-task-runner pattern).
- **kindred API key expiry**: n8n workflows log 401 responses; Janet reports auth failure. Monitor via existing n8n error alerting.
- **LLM unavailable (weekly statement)**: n8n workflow falls back to a template post tagging `@will` to review manually.

## Testing

- `kindred-mcp`: unit tests per tool using `httpx.MockTransport` against the kindred OpenAPI schema
- Reactive flow: smoke test — ask Janet "who am I losing touch with?" in Mattermost DM; verify kindred API was called
- Event hooks: trigger a test interaction creation in kindred; verify `#kindred-feed` post arrives within 30s
- Scheduled statements: manually trigger each n8n workflow in test mode before activating cron

## Out of Scope

- Bidirectional CardDAV sync (separate project)
- kindred UI changes
- Janet proactively sending Mattermost DMs unprompted (no user-initiated trigger)
