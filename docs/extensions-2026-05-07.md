# Extension Ideas: personal-crm (Kindred)

Date: 2026-05-07
Context: Self-hosted personal CRM (FastAPI + SQLModel + React/TanStack + Meilisearch + Radicale CardDAV) deployed at `kindred.khanpikehome.com`, behind Traefik. Single-tenant today; multi-user roadmap locked in via tag-based sharing + Zitadel/Authelia.

## Homelab integration surface

Kindred sits in an unusually rich neighborhood:

- `ai/litellm` (LiteLLM proxy with cloud + local models incl. `deepseek-v4-pro-cloud`) — RAG, embeddings, AI summaries.
- `ai/hermes` (job orchestrator/scheduler) — already runs the Janet finance scheduler; perfect home for digest jobs.
- `ai/mempalace` — long-running knowledge graph that already mirrors people/projects.
- `apps/davis` (CalDAV/CardDAV) and `apps/cal` (Cal.com) — calendar/scheduling.
- `apps/mattermost` + the `interactivebot` integration — chat surface for nudges, slash commands, approvals.
- `automation/n8n`, `automation/agent-tasks`, `automation/home-assistant` — event hooks.
- `apps/seaweedfs` — already hardened S3 for blob storage (avatars, attachments).
- `apps/plaid-sync` and `apps/monica` — adjacent records that overlap with debts/contacts.

That mix is what makes Kindred different from off-the-shelf CRMs: every "would be nice if it…" already has a service one tailnet hop away.

## Quick wins

### Drop the dead `items` template table
- **Effort:** S · **Impact:** med
- **Anchor:** `README.md:45` — "model + Alembic table remain"; `backend/app/models.py:1861` (53 KB single file makes orphans easy to miss)
- **Why:** Public release happened (LICENSE + SECURITY.md landed at `a8f2ce0` / `4872da8`); shedding template debt before more eyes look at it is cheap.

### Wire OpenAPI examples for the orphan routes
- **Effort:** S · **Impact:** low
- **Anchor:** `backend/app/api/routes/{addresses,pets,life_events,custom_fields,webhooks,import_export}.py`
- **Why:** Tests + `scripts/generate-client.sh` already cover them, but `frontend/openapi.json` ships skeletal request bodies — examples make the SDK self-documenting and improve any future LLM-driven extension flows (you already do `claude -p --json-schema` for drape).

### Strip remaining `fastapi-full-stack-template` residue
- **Anchor:** `README.md:141` admits `backend/README.md` and `frontend/README.md` are still upstream content; `package.json:2` says `"name": "personal-crm"` while the public repo is `Kindred`.
- **Effort:** S · **Impact:** med
- **Why:** Now that `pike00/Kindred` is public, the README mismatch is the first thing a visitor sees.

### Ship the `media_recommendations` UI
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/api/routes/media_recommendations.py` (3.4 KB, fully implemented), `MediaCategory` enum at `backend/app/models.py`, no entry in `frontend/src/routes/_layout/`.
- **Why:** "Recommend a book to X" is a concrete, low-controversy UI surface that exercises tags + contacts and proves the orphan-route filling pattern.

### Bulk-merge contacts UI
- **Effort:** M · **Impact:** high
- **Anchor:** memory: `personal-crm-contact-merge-pattern` (the merge logic is already designed); seeded data has dupes via `just seed-fixed`
- **Why:** Easiest single thing that turns Kindred from "scratchpad" into "system of record" for someone with messy iCloud + Google export imports.

## New features

### Daily birthday/anniversary digest
- **Effort:** M · **Impact:** high
- **Anchor:** `backend/app/api/routes/life_events.py` exists with no UI; `apps/mattermost` `interactivebot` token already in `.env.sops`
- **Why:** The data is there; missing only an `arq` cron job + Mattermost POST. Gives the journal/life_events tables a daily reason to exist.

### Email-to-interaction inbox
- **Effort:** L · **Impact:** high
- **Anchor:** `backend/app/api/routes/interactions.py:1`, `worker.py` (ARQ already running), no SMTP listener in compose stack
- **Why:** Bcc `kindred+<contact-uuid>@…` on a thread → an interaction lands automatically. This is the single feature that flips "I should log that" into "it logs itself," and you already use `apps/mattermost` for similar inbound webhooks.

### Photo attachments for contacts and interactions
- **Effort:** M · **Impact:** med
- **Anchor:** no media model in `backend/app/models.py`; `apps/seaweedfs` already hardened with S3 access keys
- **Why:** Contacts need faces. Don't bake storage into Kindred — presigned PUT against the existing S3 endpoint, store URL + dimensions only. Same shape will work for journal entries and gifts later.

### Map view for contacts with addresses
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/api/routes/addresses.py` (read-only on detail page today), MapLibre/protomaps already in your taste profile (no Mapbox key needed, OSS tile build trivial in homelab)
- **Why:** "Who's near me when I travel to X" is high-value and zero-cost once addresses get geocoded once at write time.

### "Conversation starters" panel using LiteLLM
- **Effort:** M · **Impact:** med
- **Anchor:** `frontend/src/routes/_layout/contacts/` detail page; LiteLLM at `127.0.0.1:4000` with `deepseek-v4-pro-cloud` already wired (memory: `drawer_homelab_deepseek_v4pro_cloud_registration.md`)
- **Why:** Feed the contact's recent interactions + life events, get 3 questions to ask next time. Reuses the exact prompt-cache pattern from drape's release-notes script.

### Voice memo → interaction note
- **Effort:** L · **Impact:** med
- **Anchor:** `backend/app/api/routes/interactions.py` accepts `notes` text; `ai/qwen-tts` (memory: `qwen-tts-janet`) plus a Whisper or distil-whisper sidecar
- **Why:** You already invested in Janet voice cloning; Whisper for capture is the inverse and a notebook-grade install. Mobile PWA + voice memo → text note is the lowest-friction logging UX shy of email.

### Gift idea inbox (browser bookmarklet)
- **Effort:** S · **Impact:** med
- **Anchor:** `backend/app/api/routes/gifts.py:1`, `GiftStatus` enum already includes draft/given states
- **Why:** A 30-line bookmarklet that POSTs `{contact_id, url, title}` to `/api/gifts` removes the only failure mode of the gifts module: forgetting to log the idea before the moment passes.

## New Docker services

### `kindred-smtpd` (maddy or postfix-relay) for email-in
- **Effort:** L · **Impact:** high
- **Anchor:** existing compose stacks at `~/Documents/Homelab/apps/mattermost/compose.yml` show the pattern; `homelab-new-service` skill enforces hardening
- **Why:** No mail-in container exists in the homelab. A maddy instance bound to `mail.kindred.khanpikehome.com:25` (or just LMTP from a relay) feeds the inbox feature above and sets up future "forward this newsletter to journal" flows.

### `kindred-geocoder` (Nominatim or Photon)
- **Effort:** M · **Impact:** med
- **Anchor:** addresses model has lat/lng nullable today (`backend/app/models.py`); compose pattern proven by `apps/davis`, `apps/seaweedfs`
- **Why:** One read-only Nominatim with the planet-extract for the US gives offline geocoding for the map view and any future "near me" feature without leaking contact addresses to a SaaS.

### `kindred-whisper` (faster-whisper + tiny REST shim)
- **Effort:** M · **Impact:** med
- **Anchor:** GPU on `ares` already used for `yolo_finetune`; LiteLLM proxy pattern lets the rest of the homelab share it
- **Why:** Turns the voice-memo idea into a dependency the homelab generally benefits from (Mattermost voice posts, journal dictation, OCR pipeline narration). Single GPU sidecar, idle most of the time.

## Integrations

### Mattermost slash command surface
- **Effort:** M · **Impact:** high
- **Anchor:** `apps/mattermost` + `mattermost-bot-integration` skill; `backend/app/api/routes/api_keys.py` already exists for token auth
- **Why:** `/kindred remind 'call Mom' tomorrow 5pm`, `/kindred log @aleisha lunch`, `/kindred who am I losing touch with` — your two daily-driver clients (Mattermost on phone + laptop) become Kindred clients without a frontend round-trip.

### Davis CalDAV ↔ life_events two-way sync
- **Effort:** L · **Impact:** high
- **Anchor:** `backend/app/carddav/` (Radicale already mounted), `apps/davis` runs Sabre/Dav with per-device app passwords (memory: `davis-per-device-app-password-flow`)
- **Why:** Birthdays/anniversaries become real iCal events that show up in iOS/macOS Calendar without a Kindred app on the phone. Kindred → Davis is one-way today (none); making it bidirectional means edits in iOS Calendar flow back.

### Cal.com "schedule a coffee with this contact" deep link
- **Effort:** S · **Impact:** med
- **Anchor:** `apps/cal` already self-hosted; contact detail page at `frontend/src/routes/_layout/contacts/`
- **Why:** Anchor a Cal.com booking link on each contact card with the contact's email pre-filled; auto-creates an interaction when the booking confirms via Cal's webhook into `backend/app/api/routes/webhooks.py`.

### Hermes nightly job: "losing touch" Mattermost digest
- **Effort:** S · **Impact:** high
- **Anchor:** `ai/hermes` already runs `janet_finance_scheduler` (memory: `janet_finance_scheduler_completion`); contacts.py has the OverdueContact endpoint
- **Why:** Hermes is the right home for cross-service scheduled work; this is "Janet for relationships" and reuses the same Mattermost posting glue.

### Plaid-sync → debts auto-settle
- **Effort:** M · **Impact:** med
- **Anchor:** `apps/plaid-sync`; Kindred `backend/app/api/routes/debts.py:1` with `DebtDirection` enum
- **Why:** Plaid already sees Venmo/Zelle settlement; matching by amount + counterparty memo within ±3 days lets Kindred auto-flip a debt to settled. `feedback_plaid_sync_preferences` says you'd rather see "candidates to confirm" than auto-applied — make it a review queue.

### MemPalace mirror: each interaction → a triple
- **Effort:** M · **Impact:** med
- **Anchor:** `mempalace_kg_add` already exposed; `backend/app/audit.py` already hooks every write
- **Why:** Sending `(contact_name, last_interaction, ISO_DATE)` into MemPalace makes the same data queryable from any future LLM session via `mempalace_kg_query`. Kindred becomes a writer to the household memory graph rather than an island.

### n8n trigger on new-contact: enrich + dedup-suggest
- **Effort:** M · **Impact:** low
- **Anchor:** `automation/n8n` exists; `webhooks.py` registration pattern at `backend/app/api/routes/webhooks.py`
- **Why:** New contact → n8n looks for existing fuzzy matches via Meilisearch + LiteLLM "is this the same person?" call; flags a merge candidate. Bridges the merge-UI work above with the multi-source import pain.

## Architectural improvements

### Split `backend/app/models.py` (53 KB, 1861 lines)
- **Effort:** L · **Impact:** med
- **Anchor:** `backend/app/models.py:1861` — every entity in one file
- **Why:** SDK regen times will keep climbing as fields land; the e2e timeout extension (commit `5bca98f9`) is a downstream symptom. Per-domain modules (`models/contact.py`, `models/interaction.py`, …) keep imports scoped and shrink Alembic diffs.

### Same for `crud.py` (552 lines today, growing)
- **Effort:** M · **Impact:** med
- **Anchor:** `backend/app/crud.py:552`
- **Why:** Already at the threshold where new contributors can't grep for "the contact create logic" without scanning whole file.

### Prometheus `/metrics` + Grafana dashboard
- **Effort:** S · **Impact:** med
- **Anchor:** `monitoring/grafana` runs full stack; `backend/app/middleware/` has request/audit middleware ready for instrumentation
- **Why:** Right now you only know Kindred is up via Uptime-Kuma. Per-route p95, ARQ queue depth, and Meilisearch sync lag are 30 lines of `prometheus-fastapi-instrumentator` and a JSON dashboard.

### Structured audit log shipping
- **Effort:** S · **Impact:** low
- **Anchor:** `backend/app/audit.py` (11 KB — already write-side complete)
- **Why:** Current sink is logs/DB only. Same shape would feed `monitoring/loki` with zero new dependencies.

### Replace Meilisearch with pgvector + `text-embedding-3-small` via LiteLLM
- **Effort:** L · **Impact:** med
- **Anchor:** `compose.yml` Meilisearch container; LiteLLM proxy embedding endpoint already in use by `ai/memory-stack`
- **Why:** Meilisearch is a separate stateful service to back up; `pgvector` collapses it into the existing Postgres backup story, and embeddings unlock semantic search on journal/notes ("when did I last talk about kayaking?"). The same embeddings power the RAG idea below.

### Move from JWT-only to Authelia OIDC
- **Effort:** L · **Impact:** high
- **Anchor:** memory: `personal-crm-multi-user` locked in Zitadel/tag-sharing decisions; `homelab-pattern` Authelia already deployed (`authelia-lldap-deployment`)
- **Why:** Multi-user is the reason Authelia/LLDAP exists in the homelab. Doing OIDC-first instead of bolting on Zitadel later avoids a second migration. Pairs with the `tag-based sharing model` decision (memory: `personal-crm` 2026-04-19).

## Wild ideas / spin-offs

### "Ask Kindred" — RAG over interactions, notes, journal
- **Effort:** L · **Impact:** high
- **Anchor:** existing LiteLLM + pgvector path above; journal entries already in `backend/app/api/routes/journal.py`
- **Why:** "When did Aleisha and I last talk about the Tahoe trip" should be answerable in natural language. Kindred has the corpus other RAG demos lack: longitudinal, personal, structured. Reuses the chat-bot pattern from your drape release-notes script (one prompt, JSON-schema-bound output, LiteLLM as the only network dep).

### Spin out the `audit.py` middleware as `fastapi-relate`
- **Effort:** L · **Impact:** low
- **Anchor:** `backend/app/audit.py` (11 KB), `backend/app/middleware/` — already a clean separation
- **Why:** Per-row audit log + PII-aware diffing is rare in FastAPI extensions. Enough surface for a standalone PyPI package with Kindred as its reference consumer; pairs with your drape PyPI publish workflow (memory: `drawer_pypi_api_verification_pattern.md`).

### Memorial mode
- **Effort:** M · **Impact:** low
- **Anchor:** `Contact` table; would add a status flag and a journal subtype
- **Why:** When someone passes, freeze writes, surface a different detail-page chrome, and convert reminders into anniversary nudges. The reason a personal CRM eventually earns its weight is because it preserves the texture of relationships you can't ask anyone else about.

### Public profile pages (opt-in, per-tag)
- **Effort:** L · **Impact:** low
- **Anchor:** `tag_shares.py` already encodes per-tag visibility; `apps/cal` patterns for public booking pages
- **Why:** Spin a contact you've tagged "public" out as a `kindred.khanpikehome.com/p/<slug>` page (think: vCard + Cal.com link + recent public posts). Optional flank: stretches Kindred toward Folk-style external surfaces without committing to multi-tenant SaaS.

### Aleisha-shared "household" view (when multi-user lands)
- **Effort:** M · **Impact:** high
- **Anchor:** memory: 2026-04-19 lock-in (clean-slate cutover, on-demand tag sharing)
- **Why:** The single feature that turns Kindred from "Will's tool" into "the household's relationship memory" — already designed, gated only on the OIDC migration above.

### Voice-cloned reminder readouts via Janet
- **Effort:** M · **Impact:** low
- **Anchor:** `ai/qwen-tts` Janet integration (memory: `janet_voice_extraction`)
- **Why:** "Hey, you've got a reminder to call Mom" voiced by a familiar voice through Home Assistant's TTS. Pure delight, near-zero new infra given Janet already runs.

---

Report at `/home/will/projects/personal-crm/docs/extensions-2026-05-07.md`. Want me to dig deeper on any of these?
