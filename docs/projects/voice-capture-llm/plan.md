# LLM-Augmented Voice Capture Implementation Plan

> For agentic workers: use subagent-driven-development, test-driven-development, and the task brief for your assigned task. The user explicitly authorized implementation, publication, merge, deployment, production smoke tests, and fixes. Luna agents are requested. Worktree and publication base must be resolved before implementation.

**Goal:** Turn a voice recording into preserved source text, contextual corrections, and an editable set of correctly targeted CRM records that save together exactly once.

**Architecture:** ASR remains a replaceable local service. The backend persists an owner-scoped capture immediately after transcription, then uses a configured OpenAI-compatible LLM gateway to propose typed actions using visible contact and relationship context. A review screen edits or deselects actions; a dedicated backend transaction validates permissions and writes the accepted set, preserving the source and a replayable receipt.

**Tech stack:** Existing FastAPI, SQLModel, Alembic, Pydantic v2/settings, httpx, rapidfuzz, Postgres; React/TanStack Query/shadcn; faster-whisper; generated TypeScript and Python SDKs.

## Global constraints

- Preserve immutable original ASR text and separate corrected text. Never reduce or overwrite source to produce a summary.
- No audio persistence after transcription; temporary audio must be removed on success and failure.
- The LLM proposes data, never invokes tools or directly writes application entities.
- Use relevant visible contacts, nicknames, and relationship edges as context. Do not expose unrelated hidden contacts.
- Distinguish participants from people mentioned and future intentions from completed interactions. Unknown interaction channel is `other`, never an invented in-person encounter.
- Resolve relative dates against capture time plus IANA timezone. Require an explicit date/time before saving a reminder or dated event.
- Ambiguous identities and unsupported ASR changes remain visible for review. Do not confidently guess a person from one shared first name.
- Five action kinds: interaction, note, contact_update, life_event, reminder. No automatic relationship creation or contact deletion.
- Contact-update allowlist: company, department, title, nickname, pronouns, birthday, how_we_met. Do not alter identity, ownership, sharing, login, cadence, archive, DNC, or stage settings.
- Future employment belongs in a note or dated life event; do not overwrite current employer before a known transition.
- All accepted actions commit in one database transaction; retries return the same result and never duplicate writes. Differing retry payloads conflict.
- Preserve existing resource-level permissions, audit hooks, note mentions, last_contacted_at, FTS, and post-commit contact indexing.
- All app tests/builds/deploys use just recipes. Use uv for Python; new configuration uses BaseSettings, typed values, SecretStr, and existing SOPS injection. No secret contents in logs or source.
- Application artifacts and tests use invented people and facts. Do not commit the user's actual dinner note, salary, contact IDs, or other personal data.
- No browser/computer-use automation: user requested smoke tests, not browser use. Exercise UI through component tests and service APIs through smoke scripts.
- No direct push to main/master, force-push, or hook bypass. Preserve unrelated work. Git mutations use gitop, commits gcommit with explicit paths.

## Acceptance cases

1. A single dinner recording proposes an interaction with location, a note about one participant's prospective job/living arrangements, and a separate note about a mentioned spouse. Mentioned people are not attendees.
2. Two contacts named Sarah remain ambiguous until relationship context resolves one or the reviewer selects one.
3. A misrecognized name never causes sentence deletion. Raw text stays available after analysis failure, closing/reopening, editing, and confirmation.
4. "I need to call Nora tomorrow" proposes a reminder, not a completed in-person interaction. Unspecified reminder time is flagged for the reviewer.
5. "Nora prefers tea" proposes a personal note; it does not change contact engagement metrics.
6. A provider timeout or malformed JSON leaves the capture recoverable and manually editable, with a visible status.
7. An inaccessible target, invalid datetime, concurrent stale revision, or one failed action causes zero partial CRM writes.
8. Repeated confirmation returns the same saved IDs; a differing payload for the same committed capture returns conflict.
9. Real audio reaches ASR, a real configured LLM returns validated suggestions, accepted records can be read back, and a production smoke test cleans only its own synthetic data.

## API contract

Preserve `POST /api/v1/transcribe/` compatibility (`text`, `language`, `duration`) and add a durable `capture_id`. Accept a timezone form field and bounded optional contact-name prompt. The backend derives permitted name hints; arbitrary client UUIDs are never trusted.

New owner-scoped `/api/v1/voice-captures` API:

- `POST /`: create a capture from `{raw_text, timezone}` for text retry and API/SDK use. Creation validates text length and timezone.
- `GET /`: paginated captures for the caller, newest created first; used to resume a draft.
- `GET /{id}`: retrieve source, draft, warnings, revision, and committed receipt.
- `POST /{id}/analyze`: `{revision, text?}`; optional edited text is distinct from original raw_text. Read candidate contacts/relationships, call provider outside a write lock, validate the result, then write only if revision is still current. Persist a recoverable provider failure and never lose source.
- `PUT /{id}`: save reviewed draft `{revision, corrected_text, actions}` for resume.
- `POST /{id}/commit`: same reviewed payload; validate all actions first, lock capture, write in a single transaction, record payload hash + exact saved result IDs. Identical committed replay returns prior receipt; changed replay returns 409.
- `DELETE /{id}`: remove an uncommitted caller-owned capture; refuse committed capture deletion until a separately designed undo workflow exists. Smoke cleanup must delete its created records by existing APIs, then may retain a synthetic receipt if committed capture deletion is intentionally forbidden.

Capture response: `id`, immutable `raw_text`, `corrected_text`, `timezone`, `recorded_at`, `created_at`, `updated_at`, `status` (`draft`, `ready`, `committed`), monotonically increasing `revision`, `actions`, `warnings`, optional `analysis_error`, optional `committed_at`, and `results`.

Each action has a stable ID, kind discriminator, `enabled`, exact source evidence quote, and an optional review warning. Its payload uses typed fields and forbids extras. Missing target/date/channel may appear in draft but enabled actions must be complete at commit. Disabled actions do not write. All facts remain in source regardless of action selection.

Interaction payload: `attendee_ids`, nullable `channel`, nullable aware `occurred_at`, `notes`, nullable `duration_minutes`, nullable `location_label`.
Note payload: nullable `contact_id`, `body`.
Contact-update payload: nullable `contact_id`, `fields` restricted to the allowlist above; include current field values in review context so overrides are visible.
Life-event payload: nullable `contact_id`, `event_type`, `title`, `description`, nullable `occurred_at` date; `create_annual_reminder=false` unless an explicit separate reminder action is reviewed.
Reminder payload: optional `contact_id`, `title`, `description`, nullable aware `remind_at`, frequency using the existing enum. New reminders must be active; reject contact-targeted reminders where existing DNC semantics prohibit them.

The implementer may simplify endpoint/model names while preserving this behavioral contract, but must notify the parent before frontend dispatch so one exact generated contract is used.

## Task 1: Context-aware configurable ASR

**Owner:** Luna ASR worker in its own managed worktree.
**Files:** whisper-service/app.py, whisper-service/Dockerfile, whisper-service/requirements.txt, new whisper-service/tests/test_app.py; a new isolated whisper-service/justfile if needed for test/build recipes. No backend/frontend/production infrastructure edits.

**Interfaces:** `POST /transcribe` multipart file plus optional bounded `initial_prompt`; output keeps text/language/duration and adds segment timing/avg_logprob/no_speech_prob metadata without persisting audio. Settings include model/device/compute type/cache path/beam size/language and bounded upload/prompt limits.

- [ ] Write and run failing tests for model settings, prompt propagation, segment metadata, empty/oversized input, non-English configurability, provider failure cleanup, and no event-loop blocking.
- [ ] Implement typed Pydantic settings with no import-time model download. Load the configured model during lifespan, and offload CPU work from async endpoints. Preserve English as the default language, permit optional auto detection.
- [ ] Use uv in the Docker build. Bake the exact configurable model selected by build argument into the image; its runtime default must match that artifact. Expose enough health metadata to confirm configured and loaded model without secrets.
- [ ] Pin compatible dependencies after consulting authoritative current faster-whisper docs. Keep unit tests model-free through dependency injection.
- [ ] Run tests, lint, and coverage above 90% for the changed ASR application. Compare base.en and small.en on synthetic audio in the integration stage before selecting production configuration.
- [ ] Commit with explicit paths, no push; report commit, commands, results, remaining concerns.

Example regression assertion:

```python
response = client.post('/transcribe', files={'file': ('sample.wav', b'audio', 'audio/wav')}, data={'initial_prompt': 'Nora Taylor, Lucas Maeda'})
assert response.json()['text'] == 'Nora Taylor prefers tea.'
assert fake_model.options['initial_prompt'] == 'Nora Taylor, Lucas Maeda'
assert not temporary_audio.exists()
```

## Task 2: Durable LLM capture and atomic persistence

**Owner:** Luna backend worker, new worktree based on integrated Task 1.
**Files:** backend/app/voice_capture/{schemas,context,analysis,service}.py (or equivalent focused modules), backend/app/api/routes/voice_captures.py, transcribe.py, api/main.py, models.py, core/config.py, one Alembic revision, relevant backend tests. Parent owns SDK regeneration, deployment recipes, and infrastructure configuration.

**Interfaces:** API contract above. Use existing httpx and Pydantic validation instead of introducing an agent framework. Root wires provider URL/key/model into deployment; worker exposes typed settings with safe unconfigured behavior and bounded provider timeout.

- [ ] Add behavior tests against an isolated Postgres test database and observe failures before implementation. Include action-specific permissions, raw preservation, scope-limited context, ambiguity/future tense, provider error/malformed output, transaction rollback, stale revision, exact replay, differing replay, and concurrent commit handling.
- [ ] Add owner-scoped capture model/migration with raw source, draft JSON, metadata, revision, receipt, and deterministic commit hash. Do not put raw transcripts in generic audit logs.
- [ ] Implement candidate retrieval using visible names/nicknames, rapidfuzz, and relationship edges with bounded context. Resolve IDs only against authorized candidates. Avoid the old first-200-contact limitation.
- [ ] Implement one structured-output LLM call, explicit preservation/correction instructions, no invented facts, source evidence and questions, and validation of every action. Provider failures return a useful recoverable capture.
- [ ] Implement API routes, ASR persistence integration, and transaction service. Never call existing commit-owning CRUD helpers in the atomic transaction. Preserve automatic audit/FTS and explicit engagement/note-mention/indexing semantics.
- [ ] Validate migration through upgrade and route consumption. Run backend regression suites and measure coverage above 90% for the new feature modules.
- [ ] Commit explicit owned paths, no push; report exact endpoint/schema contract for frontend integration.

Example critical test:

```python
before = count_crm_records(session)
response = client.post(f'/api/v1/voice-captures/{capture.id}/commit', headers=user_headers, json=proposal_with_one_inaccessible_target)
assert response.status_code in (403, 404, 422)
assert count_crm_records(session) == before
assert session.get(VoiceCapture, capture.id).raw_text == original_text
```

## Task 3: Editable voice review and draft recovery

**Owner:** Luna frontend worker, separate worktree after backend SDK generation.
**Files:** frontend/src/components/VoiceRecorder/**, corresponding component tests, minimal layout integration if necessary. Do not hand-edit generated SDKs.

- [ ] Write failing component tests for recording -> persisted capture -> analysis -> editable multi-action review -> commit, provider failure fallback, raw/corrected separation, action deselection, ambiguous person selection, required date/time validation, draft resume, and save retry without duplicates.
- [ ] Replace regex-driven review with the generated capture API. Keep raw source read-only and corrections editable. Show action cards using ordinary user-facing labels and contacts; no JSON editor or model jargon.
- [ ] Support all five action kinds, editable destinations and fields, source evidence, warnings, and explicit keep/skip choices. Search contacts through backend pagination/search rather than a capped global list.
- [ ] Save draft/reopen latest incomplete capture, display processing/failure states, preserve in-progress edits on failures, disable double submit, and invalidate every affected query after successful commit.
- [ ] Correct datetime-local handling with browser timezone; never display UTC text as local wall time. Use the capture timezone/reference for relative-date interpretation.
- [ ] Remove destructive parser from the active flow; either delete its unused module/tests or preserve only a non-destructive manually chosen fallback.
- [ ] Run frontend tests/typecheck/build and feature coverage above 90%; commit only owned paths, no push.

## Task 4: Integration, delivery, and production validation

**Owner:** Parent with Luna review/fix agents. Infrastructure changes receive a separate Homelab branch/PR if needed.

- [ ] Integrate each reviewed worker commit using gitop. Run the code-simplifier after each logical chunk and re-run affected validation after changes.
- [ ] Regenerate both SDKs through `just regen-client` and `just sdk-regen`; add Python CLI commands and tests for new voice endpoints. Update DB documentation through its recipe.
- [ ] Add only necessary durable just recipes for isolated test/coverage/evaluation and release/deploy/smoke paths; preserve the configured workflow and never use the legacy direct-main-push release path.
- [ ] Configure a scoped LLM credential via the approved secret workflow and typed settings. Build ASR with chosen benchmarked model. Keep all credentials out of source/logs and do not copy secrets into a worktree.
- [ ] Run relevant full suites, lint/typecheck/build, measured feature coverage >90%, ASR fixture evaluation, live LLM extraction evaluation on anonymized examples, and migration verification.
- [ ] Start the repository dev server using an isolated database and Tailnet-only listener; exercise its health and representative API/UI component flow. No browser automation without explicit user instruction.
- [ ] Obtain requirements and quality review for each task, then final branch review. Fix all critical/important findings before publication; preserve reports and exact tested SHAs.
- [ ] Publish one application PR to the user-selected authoritative remote and attach it to the chat. Wait for normal CI/mergeability, fix failures, and merge via the approved workflow.
- [ ] Publish a versioned release from the merged commit, build app and ASR artifacts, update canonical deployment source, run backup and guarded deployment.
- [ ] Verify production URL and container health, deployed version, schema migration, real audio transcription, real LLM suggestions, accepted synthetic record readback, and idempotent replay. Clean only exact synthetic test records created by this run. Fix and repeat any failed stage.
- [ ] Record release, PRs, production evidence, test/coverage results, and any unavoidable limitations. Archive only this task's no-longer-needed worker worktrees.

## Current checkpoint

- Initial reviewed checkout and production: 57b6d9b, v0.2.123.
- User selected GitHub. Feature branch was fast-forwarded to GitHub main 3b4a9b6 and merged local main 57b6d9b to preserve the deployed release history. Publication must target GitHub, never stale Gitea.
- Root feature branch codex/voice-capture-llm; ASR branch codex/voice-asr starts from that verified integrated history. Both were clean before implementation.
- Root checkout: /Users/will/.codex/worktrees/6ddd/kindred.
- ASR checkout: /Users/will/.codex/worktrees/voice-asr/kindred.
- Local Docker works through an approved sandbox escalation (29.5.2).
- Two Luna read-only scouts complete. New GitHub main already contains project-kit 0.2.0 with separate release-prepare/release-publish, which must be inspected against the selected remote before use.
