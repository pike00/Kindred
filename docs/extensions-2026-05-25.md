# Extension Ideas: personal-crm (Kindred)

Date: 2026-05-25
Context: Self-hosted personal CRM (FastAPI + React 19/TanStack + Meilisearch + ARQ + Twilio + Apprise) now at v0.2.70, with ~30 features shipped since the last extensions report on 2026-05-07.

## Context: what just shipped

Since the May 7 report, almost everything on the backlog landed in a merge train: soft-delete, saved filters, kanban, map view, household aggregate, relationship graph, organizations, interaction heatmap, ICS export, iCal importer, voice-to-text, Twilio SMS/call ingestion, email log ingestion, stay-in-touch widget, undo toast, iMessage sync, vCard hash verification, PWA offline notes, printable PDF, face-aware avatar crop, empty states. That's ~30 features in 18 days.

**What remains active (not shipped):** attachments, birthday/anniversary calendar, bulk contact operations, CardDAV server mode, command palette (WIP), communication preferences UI, contact autocomplete mentions, contact merge history, contact provenance tracking, contact stage history, e2e test coverage, full-text search UI (backend done, wiring WIP), gift kanban, Google/iCloud OAuth import, keyboard shortcut overlay, quick-log FAB, TagShare scope warning, unified contact timeline (WIP), kindred-sdk, kindred-web-presence.

This report focuses on ideas NOT already in the active project list or `docs/improvements.md`.

## Homelab integration surface

- `ai/litellm` (LiteLLM proxy: deepseek-v4-pro-cloud + local Ollama) — synthesis, RAG, embeddings. Every feature that says "summarize" or "suggest" routes through here.
- `ai/mempalace` — long-running knowledge graph. Kindred is the best-structured personal relationship data on the tailnet; none of it currently writes to the palace.
- `apps/mattermost` + `interactivebot` — token already in `.env.sops`; slack-style interface for proactive nudges without building a notification app.
- `apps/plaid-sync` — already tracks Venmo/Zelle/bank transactions; Kindred has debts with counterparties. They've never been wired together.
- `automation/home-assistant` — knows where Will is (device tracker, presence). Could trigger interaction prompts when someone leaves the house.
- `automation/n8n` — has webhook trigger support; could drive contact enrichment on new-contact events.
- `monitoring/grafana` + `monitoring/loki` — Kindred ships no metrics or structured log events today.

---

## Quick wins

### Wire activity log view to the contact detail page
- **Effort:** S · **Impact:** med
- **Anchor:** `backend/app/api/routes/activity_logs.py` is complete (supports `entity_type`, `entity_id`, `tag_id` filters); `ActivityLogsService.listActivityLogs` is in the SDK but unused per `docs/improvements.md:50`
- **Why:** The route already scopes shared-tag visibility correctly. A collapsible "History" section on the contact detail page costs ~60 lines of React and surfaces audit data that's already being collected but invisible.

### Orphan snooze analytics endpoints
- **Effort:** S · **Impact:** low
- **Anchor:** `backend/app/api/routes/reminders.py` exposes `getSnoozeHistory`, `getSnoozeStats`, `getChronicSnoozers`; none called per `docs/improvements.md:52`
- **Why:** "You've snoozed calling Mom 4 times" is a concrete signal for the stay-in-touch workflow. Add as a tooltip or badge on the reminders list — no new backend work.

### Show contact's local time on hover
- **Effort:** S · **Impact:** med
- **Anchor:** `frontend/src/components/Contacts/TimezoneInput.tsx` is a new untracked file (in git status); `Contact.timezone` field was just added in `feat: contact timezone and pronouns fields`
- **Why:** The timezone data is on disk but nothing renders "9:30 AM in NYC" anywhere. A small clock chip next to the name in the detail header — single component, zero API calls.

### Organizations sidebar entry
- **Effort:** S · **Impact:** med
- **Anchor:** `frontend/src/components/Organizations/OrganizationsList.tsx` exists (4.9k); no entry in `frontend/src/components/Sidebar/` or any `_layout` route
- **Why:** The `feat: organizations as first-class entities` commit shipped the backend and components but there's no way to navigate to the organizations list. One nav item.

### Communication preferences display in "stay in touch" widget
- **Effort:** S · **Impact:** med
- **Anchor:** `backend/app/api/routes/communication_preferences.py` exposes `preferred_channel` and `best_time_local`; `StayInTouchWidget.tsx` (`frontend/src/components/Dashboard/StayInTouchWidget.tsx`) doesn't use them
- **Why:** The widget already shows overdue contacts; adding "prefers text, mornings EST" alongside the contact name avoids the jarring "wait, how does Alice prefer to be contacted?" pause before logging the interaction.

---

## New features

### Relationship health score
- **Effort:** M · **Impact:** high
- **Anchor:** `Contact.last_contacted_at`, `Contact.contact_frequency_days`, the new interaction heatmap data (from `feat: interaction frequency heatmap`), `backend/app/api/routes/contacts.py:27k`
- **Why:** Kindred tracks frequency and recency separately; no synthesis. A simple score — `days_since_contact / contact_frequency_days`, clamped 0-100, surfaced as a colored indicator on the contacts list — turns raw data into a scannable health dashboard. No new schema, computable server-side in the list endpoint.

### Pre-meeting context brief
- **Effort:** M · **Impact:** high
- **Anchor:** `ai/litellm` with `deepseek-v4-pro-cloud`; contact detail page `frontend/src/routes/_layout/contacts/$contactId.tsx`; `backend/app/api/routes/interactions.py`, `notes.py`, `journal.py`
- **Why:** The "conversation starters" idea from the May 7 report asked LiteLLM for questions. This is different: a 3-bullet *briefing* auto-generated from recent interactions + notes + gifts + debts, rendered at the top of the contact detail page on load. "Last talked about the Tahoe trip. Borrowed $40 (unsettled). Birthday next week." Cache it with a 1-hour TTL in Redis; don't block the page load.

### Interaction sentiment tagging
- **Effort:** S · **Impact:** med
- **Anchor:** `backend/app/api/routes/interactions.py`; `Interaction` model in `backend/app/models.py`
- **Why:** An optional `sentiment` enum field (great / neutral / draining) on each interaction, settable in the log form. Aggregate on the contact page: "7 of your last 10 chats with Bob felt draining." Zero schema complexity; substantial signal for the relationship health story above.

### "Ask Kindred" — natural language query over interactions and notes
- **Effort:** L · **Impact:** high
- **Anchor:** `ai/litellm`; `backend/app/api/routes/search.py` (full-text search backend already exists); `backend/app/api/routes/journal.py`, `notes.py`, `interactions.py`
- **Why:** "When did I last talk about the Tahoe trip with Aleisha?" requires either full-text search plus reading or semantic search via embeddings. LiteLLM already proxies an embedding endpoint. Route: user types a question in the command palette, backend runs pgvector similarity search over embedded notes+interactions, returns ranked results with excerpts. The corpus is better than most RAG demos: longitudinal, personal, already structured.

### Recurring interaction templates
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/api/routes/interactions.py`; ARQ worker at `backend/app/worker.py` (already runs `check_reminders`); `Interaction.is_draft` (shipped in `feat: interaction draft saving`)
- **Why:** Reminders tell you to contact someone. Templates go further: "monthly coffee with Alice" automatically creates a draft interaction on the first Monday of each month, pre-filled with channel=in-person, so logging takes 10 seconds instead of 30. Different from a reminder — it produces the thing, not just the nudge.

### Gift wish list via browser bookmarklet
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/api/routes/gifts.py` (7k, full CRUD); `Gift` model with `source_url` column; `backend/app/api/routes/webhooks.py` (29k, has inbound webhook parsing patterns)
- **Why:** A single-file bookmarklet (`javascript:...`) POSTs the current page URL, title, and price (parsed from Amazon/target product pages) to `/api/v1/gifts/from-url` with a contact_id. Drop it in your bookmarks; when shopping for anyone, one click creates the gift idea. The bookmarklet itself is <50 lines of JS.

---

## New Docker services

### pgvector sidecar for embeddings-backed search
- **Effort:** L · **Impact:** high
- **Anchor:** `compose.worktree.yml` Postgres service; `ai/litellm` already routes embedding requests; Meilisearch is a separate stateful service with its own backup surface
- **Why:** Replacing Meilisearch with `pgvector` collapses two backup stories into one. The embedding endpoint via LiteLLM is already wired for `ai/memory-stack`. Semantic search over journal entries ("find when I talked about kayaking") requires embeddings; keyword search alone can't do it. Migration path: add `pgvector` extension to existing PG, embed on write via ARQ job, retire the Meilisearch container in compose.

### Mattermost bot: `/kindred` slash command
- **Effort:** M · **Impact:** med
- **Anchor:** `apps/mattermost` interactivebot token in `.env.sops`; `backend/app/api/routes/webhooks.py` already handles inbound POST payloads
- **Why:** `/kindred overdue` → DM back the contacts you haven't contacted in longest. `/kindred remind Alice in 3 days` → creates a reminder without opening the app. The interactive bot pattern is already in the homelab; Kindred just needs to handle the slash-command POST at a registered webhook URL.

---

## Integrations

### Plaid-sync debt reconciliation
- **Effort:** M · **Impact:** high
- **Anchor:** `apps/plaid-sync` (`~/projects/plaid-sync/`); `backend/app/api/routes/debts.py` with `DebtDirection` and `is_settled` (now derivable from partial payments per `feat: debt partial payment tracking`); `feedback_plaid_sync_preferences.md` — user prefers "candidates to confirm," not auto-apply
- **Why:** Plaid already sees Venmo/Zelle settlements. Matching by amount + counterparty memo within ±3 days lets Kindred surface "this $40 Venmo to 'Alice' looks like your lunch debt — mark settled?" as a review queue item. Bridge: Plaid-sync POSTs a candidate to Kindred's `/webhooks/inbound` or Kindred polls a new plaid-sync endpoint.

### MemPalace mirror of interactions
- **Effort:** M · **Impact:** med
- **Anchor:** `mempalace_kg_add` exposed via MCP; `backend/app/audit.py` hooks every write; the MemPalace async save queue (`mempalace_async_save_queue.md` in memory)
- **Why:** Every interaction logged in Kindred could push a triple `(contact_name, last_contacted, ISO_DATE)` to MemPalace. Future Claude sessions can then answer "when did I last talk to X?" without opening the app. Kindred becomes a *writer* to the household memory graph rather than an island.

### Home Assistant presence → interaction prompt
- **Effort:** M · **Impact:** med
- **Anchor:** `automation/home-assistant`; `backend/app/api/routes/webhooks.py` with inbound webhook pattern; Mattermost interactivebot for the prompt delivery
- **Why:** When HA's device tracker shows a non-household member departing (bluetooth/wifi guest), HA fires a webhook to Kindred with the person's phone or a tag. Kindred fuzzy-matches to a contact and fires a Mattermost DM: "Alice just left — log an interaction?" with a one-click confirm button. Zero new schema.

### Cal.com: subscribe Kindred ICS in your scheduler
- **Effort:** S · **Impact:** med
- **Anchor:** `apps/cal` (Cal.com homelab instance); `backend/app/api/routes/ical.py` (22k, generates per-user ICS feed); `backend/app/api/routes/ical.py` — the `/ical/export` endpoint produces birthdays + anniversaries + reminders
- **Why:** Cal.com supports subscribed external calendars. Adding the Kindred ICS URL as a "personal calendar" in Cal.com means birthday/anniversary events appear alongside your meeting availability automatically. Zero code change to Kindred — just document the URL format and wire it in Cal.com settings.

---

## Architectural improvements

### Split `backend/app/models.py` into domain modules
- **Effort:** L · **Impact:** med
- **Anchor:** `backend/app/models.py` — now significantly larger than the 53 KB / 1861 lines noted in the May 7 report, given 30 features have landed; `just regen-client` time is the leading symptom
- **Why:** The pre-push `db-docs-check` and SDK regen gates are the first things to slow down as the file grows. Splitting into `models/contact.py`, `models/interaction.py`, `models/social.py`, `models/financial.py` etc. is the one architectural change that multiplies developer velocity rather than building on top of the problem.

### Prometheus metrics via `prometheus-fastapi-instrumentator`
- **Effort:** S · **Impact:** med
- **Anchor:** `backend/app/middleware/` (existing middleware hooks); `monitoring/grafana` running full stack; no `/metrics` endpoint today
- **Why:** Right now you only know Kindred is up via Uptime-Kuma. Per-route p95, ARQ queue depth (reminders processed, emails ingested, Twilio events), and sync lag are ~30 lines of `prometheus-fastapi-instrumentator` + one JSON Grafana dashboard. The infra is there; Kindred just doesn't use it.

### Structured event shipping to Loki
- **Effort:** S · **Impact:** low
- **Anchor:** `backend/app/audit.py` (already write-side complete); `monitoring/loki` at `http://127.0.0.1:3100/loki/api/v1/push`; CLAUDE.md structured logging rules
- **Why:** Audit events go to DB and logs today but not to Loki. A `LokiHandler` on the FastAPI logger or a background thread that drains `audit.py` events into Loki makes every interaction, note, and reminder queryable via LogQL alongside other homelab services. Adds observability without changing the audit schema.

### API key rate limiting per-key
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/api/routes/api_keys.py` (3.6k); `ApiKey` model in `backend/app/models.py`; Redis already in the compose stack
- **Why:** The kindred-sdk project and `kindred-web-presence` both use API keys. Without rate limits, a bug in an SDK consumer can hammer the DB. Redis sliding-window counter (one incr + expire) per API key, with a configurable per-key quota, is the right primitive. Protects prod without requiring auth provider changes.

---

## Wild ideas / spin-offs

### Annual relationship review PDF
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/api/routes/contact_pdf.py` (17k, WeasyPrint already integrated); `backend/app/api/routes/interactions.py`; `backend/app/api/routes/gifts.py`; `backend/app/api/routes/journal.py`
- **Why:** A year-in-review PDF: "Top 10 people you spent time with in 2025, gifts given/received, milestones logged, journal themes." WeasyPrint is already there for the contact one-pager; the same infra generates a scrapbook-style summary. Natural calendar-year trigger via the ARQ cron job on Jan 1.

### Kindred as a MemPalace drawer writer (persistent memory for relationships)
- **Effort:** M · **Impact:** high
- **Anchor:** MemPalace MCP (`mempalace_kg_add`); `backend/app/audit.py`; CLAUDE.md MemPalace notes
- **Why:** Right now Kindred stores relationship data that can't be queried from Claude sessions. If every new contact, significant interaction, and life event pushed a structured triple into MemPalace, any Claude Code session could answer "what do I know about Alice?" from the palace — without opening the app. This makes Kindred the primary writer for personal-relationship memory, not just a standalone app.

### Finance-hub link: flag contacts who are also clients/contractors
- **Effort:** M · **Impact:** low
- **Anchor:** `~/projects/finance-hub/` (adjacent repo); `Contact.company`; `plaid-sync` tracks payees; Kindred has `Organization` entities now
- **Why:** If a contact appears both in Kindred (personal) and as a payee in the beancount ledger (contractor, client, venue), surfacing "you've paid Alice's business $12,400 this year" on her contact page collapses two mental models. Bridge: shared lookup by email or company name between finance-hub's payee data and Kindred's organizations.

### Memorial contact mode
- **Effort:** M · **Impact:** low
- **Anchor:** `Contact` model; `Contact.stage` enum; `backend/app/api/routes/contacts.py`
- **Why:** When someone passes, the right behavior is: freeze writes, convert reminders to annual anniversary nudges, preserve interactions and notes but dim them visually, surface a distinct contact-detail chrome. A `contact_stage = "memorial"` value + a `memorial_date` column + a distinct React treatment. The reason a personal CRM earns its weight over time is it preserves the texture of relationships you can no longer ask anyone about.

### SMS capture without Twilio (local SIP bridge)
- **Effort:** L · **Impact:** low
- **Anchor:** `feat: Twilio SMS and call webhook ingestion` (just shipped); `automation/home-assistant` has a Twilio integration pattern; Asterisk/FreeSWITCH run on ares
- **Why:** Twilio costs $0.01/SMS; a VoIP number for logging calls adds up. A local SIP server (Asterisk or Kamailio) registered to a personal VoIP provider (Voip.ms, ~$0.001/min) with a dial-plan that POSTs call records to the Kindred Twilio-compatible webhook would cut costs and keep the data fully on-tailnet. The webhook parsing code is already there.

---

Report at `/home/will/projects/personal-crm/docs/extensions-2026-05-25.md`. Want me to dig deeper on any of these?
