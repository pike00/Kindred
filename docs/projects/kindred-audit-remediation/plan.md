# Kindred Audit Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development for every behavior change. Steps use checkbox syntax for tracking.

**Goal:** Fix every actionable finding from the Ponytail audit, including the ten lower-ranked findings, without regressing existing behavior.

**Architecture:** Keep the existing FastAPI, SQLModel, React, ARQ, SDK and Compose architecture. Add authorization checks, database constraints, deterministic token handling, bounded parsers, safer scheduling and account-scoped client state. Remove abandoned code rather than extending it.

**Tech Stack:** Python 3.14, FastAPI, SQLModel, PostgreSQL 18, Alembic, pytest, ARQ, Redis, React 19, TypeScript, Vitest, Playwright, pnpm, uv, Docker Compose.

## Global Constraints

- Work only in `/Users/will/projects/kindred/.worktrees/audit-remediation` on `codex/kindred-audit-remediation-20261102`.
- Do not edit `backend/app/api/deps.py`, `backend/app/api/routes/api_keys.py`, `backend/app/api/routes/contact_shares.py`, `backend/app/models.py`, sharing UI/tests, or generated clients until `codex/security-impersonation-escalation` lands.
- Every behavior change starts with a failing regression test.
- Preserve private user boundaries for every contact, note, interaction, tag, file, token and worker action.
- Prefer delete/reuse over new abstractions. No speculative configuration.
- Keep secrets out of logs, tests, API responses and generated artifacts.
- Run targeted tests after each task, then `just test-all` where the environment permits.

---

## Task 0: Coordinate the security branch

**Files:** None.

**Interfaces:**
- Consumes: branch `codex/security-impersonation-escalation` from session `jx70js1`.
- Produces: its reviewed commit range and final generated-client state.

- [ ] Check `cast sessions jx70js1 --json` until the session is no longer `working`.
- [ ] Inspect its branch and tests with `git -C .worktrees/security-impersonation-escalation log --oneline origin/main..HEAD` and `git -C .worktrees/security-impersonation-escalation diff origin/main...HEAD`.
- [ ] Rebase this branch onto the reviewed security branch before Task 6 and Task 12.

## Task 1: Close note authorization and idempotency holes

**Files:**
- Modify: `backend/app/api/routes/notes.py`
- Modify: `backend/app/api/routes/contacts.py`
- Modify: `backend/app/crud.py`
- Create: `backend/app/alembic/versions/r1s2t3u4v5w6_add_owner_scoped_note_client_id.py`
- Test: `backend/tests/api/routes/test_notes_authorization.py`
- Test: `backend/tests/api/routes/test_note_mentions.py`

**Interfaces:**
- Produces: `create_note(...)->Note` returns only a note owned by `owner_id`.
- Produces: `GET /notes/contact/{contact_id}`, `POST /notes/{note_id}/restore`, and `GET /contacts/{contact_id}/mentions` apply both note and contact ownership rules.

- [ ] **Step 1: Write failing tests**

```python
def test_restore_note_requires_auth(client):
    response = client.post(f"{settings.API_V1_STR}/notes/{uuid.uuid4()}/restore")
    assert response.status_code == 401


def test_restore_note_rejects_other_owner(client, user_headers, db):
    other = create_random_user(db)
    note = Note(body="private", contact_id=other_contact(db, other).id, owner_id=other.id, deleted_at=utcnow())
    db.add(note); db.commit()
    response = client.post(f"{settings.API_V1_STR}/notes/{note.id}/restore", headers=user_headers)
    assert response.status_code == 404


def test_note_mentions_do_not_leak_private_source_contacts(client, user_headers, db):
    # Share Bob with Mallory, then create Alice's note on Carol that mentions Bob.
    # Mallory must not receive Alice's note body or Carol's profile.
    assert mentions_response.json() == []
```

- [ ] **Step 2: Run tests and verify RED**

Run: `PROJECT_NAME=audit POSTGRES_SERVER=127.0.0.1 POSTGRES_PORT=55433 POSTGRES_USER=kindred_test POSTGRES_PASSWORD=kindred_test_password POSTGRES_DB=kindred_test POSTGRES_TEST_DB=kindred_test_test SECRET_KEY=0123456789abcdef0123456789abcdef FIRST_SUPERUSER=admin@example.com FIRST_SUPERUSER_PASSWORD=audit-admin-password EMAIL_TEST_USER=test@example.com REDIS_URL=redis://127.0.0.1:56379/0 ENVIRONMENT=local uv run pytest tests/api/routes/test_notes_authorization.py tests/api/routes/test_note_mentions.py -q`

Expected: FAIL on the unauthenticated restore and cross-owner mention cases.

- [ ] **Step 3: Implement minimal fixes**

```python
@router.post("/{note_id}/restore")
def restore_note(session: SessionDep, current_user: CurrentUser, note_id: uuid.UUID) -> Ok:
    note = session.exec(
        select(Note).where(Note.id == note_id, Note.owner_id == current_user.id)
    ).first()
    if note is None or note.deleted_at is None:
        raise HTTPException(status_code=404, detail="Note not found or not deleted")
    note.deleted_at = None
    session.add(note)
    session.commit()
    return Ok()
```

```python
def _visible_mention_contact_ids(session: Session, user: User) -> set[uuid.UUID]:
    return set(session.exec(select(Contact.id).where(Contact.id.in_(visible_contact_ids(user)))).all())
```

Filter mention writes and reads to visible contacts; scope `client_id` lookup by owner; add a nullable unique constraint on `(owner_id, client_id)` and retry on `IntegrityError`.

- [ ] **Step 4: Run tests and verify GREEN**

Run the Step 2 command. Expected: all pass.

## Task 2: Fix iCalendar tenant boundaries

**Files:**
- Modify: `backend/app/api/routes/ical.py`
- Test: `backend/tests/api/routes/test_ical.py`

**Interfaces:**
- Produces: every proposal contact ID is visible to `current_user`.

- [ ] **Step 1: Add a two-owner regression test**

```python
def test_ical_import_cannot_attach_another_users_contact(client, user_headers, db):
    victim = create_random_user(db)
    victim_contact = create_contact_for(victim, email="victim@example.com")
    proposals = upload_ics(client, user_headers, attendee="victim@example.com")
    assert proposals["proposals"][0]["attendees"][0]["matches"] == []
    forged = proposals["proposals"][0]
    forged["attendees"][0]["matches"] = [{"contact_id": str(victim_contact.id)}]
    result = client.post(f"{settings.API_V1_STR}/ical/confirm", headers=user_headers, json=[forged])
    assert result.json()["created_interactions"] == 0
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/api/routes/test_ical.py -q` with the test environment from Task 1.

Expected: FAIL because the victim contact is matched and attached.

- [ ] **Step 3: Implement**

Pass `visible_ids` into `_match_attendee_to_contacts()`, filter the exact-email query by `ContactField.contact_id.in_(visible_ids)`, and reject every confirmation contact ID not in the current visible set.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: all pass.

## Task 3: Repair Gmail OAuth storage and owner scoping

**Files:**
- Modify: `backend/app/api/routes/email.py`
- Modify: `backend/app/crud.py`
- Modify: `backend/app/email_service.py`
- Modify: `backend/app/models.py` after Task 0 only.
- Test: `backend/tests/api/routes/test_email_oauth.py`
- Test: `backend/tests/test_email_service.py`

**Interfaces:**
- Produces: `save_email_oauth_token(...)` stores ciphertext only.
- Produces: `EmailOAuthTokenPublic` omits access and refresh token values.
- Produces: `poll_all_emails(owner_id=current_user.id)` never processes another owner.

- [ ] **Step 1: Add failing tests for redaction, encryption, state rejection and owner scoping**

```python
def test_email_tokens_api_never_returns_credentials(client, user_headers):
    body = client.get(f"{settings.API_V1_STR}/email/tokens", headers=user_headers).json()
    assert "encrypted_access_token" not in json.dumps(body)
    assert "encrypted_refresh_token" not in json.dumps(body)


def test_poll_all_only_processes_current_owner(client, user_headers, monkeypatch):
    calls = []
    monkeypatch.setattr(email_service, "process_email_for_contact", lambda **kw: calls.append(kw["owner_id"]) or 1)
    client.post(f"{settings.API_V1_STR}/email/poll/all", headers=user_headers)
    assert set(calls) == {current_user_id(user_headers)}
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/api/routes/test_email_oauth.py tests/test_email_service.py -q`.

- [ ] **Step 3: Implement**

Encrypt with `app.core.encryption.encrypt_token`; redact token fields from the public model; require a random one-time state stored server-side with a short expiry; add `update_email_oauth_token`; pass and filter `owner_id` through both polling entry points; cap `max_results`.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: all pass.

## Task 4: Persist CardDAV creates

**Files:**
- Modify: `backend/app/carddav/storage.py`
- Test: `backend/tests/carddav/test_storage.py`

**Interfaces:**
- Produces: `upload()` persists a new contact before returning success.

- [ ] **Step 1: Add failing create-then-read test**

```python
def test_carddav_upload_persists_new_contact(storage, item, db):
    storage.upload("new.vcf", item)
    contacts = storage.get_multi()
    assert any(i.uid == item.uid for i in contacts)
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/carddav/test_storage.py -q`.

- [ ] **Step 3: Implement**

Assign the new `Contact`, set `source=ContactSource.CARDDAV` and `source_external_id`, call `session.add(contact)`, then commit.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 5: Make reminders and cadences reliable

**Files:**
- Modify: `backend/app/worker.py`
- Create: `backend/tests/test_worker.py`

**Interfaces:**
- Produces: `check_reminders(ctx)` advances a reminder only after `notify()` returns true.
- Produces: `check_cadences(ctx)` handles zero and many contacts and evaluates each at local 09:00.

- [ ] **Step 1: Write failing unit tests with fake sessions and notifier**

```python
async def test_failed_notification_keeps_once_reminder_due(monkeypatch):
    ctx = fake_ctx([contact_with_once_reminder()])
    monkeypatch.setattr(worker, "_get_apprise", lambda: FailingNotifier())
    await worker.check_reminders(ctx)
    assert ctx["reminders"][0].is_active is True


async def test_empty_cadence_set_does_not_raise(monkeypatch):
    await worker.check_cadences(fake_ctx([]))  # must complete


async def test_each_overdue_contact_notifies_once(monkeypatch):
    notifier = RecordingNotifier()
    await worker.check_cadences(fake_ctx([overdue("A"), current("B"), overdue("C")]))
    assert [n["title"] for n in notifier.items] == ["Losing touch: A", "Losing touch: C"]
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/test_worker.py -q`.

- [ ] **Step 3: Implement**

Use `SELECT ... FOR UPDATE SKIP LOCKED` or a Redis claim key for due reminders. Test the notifier result before changing reminder state. Filter deleted contacts. Move cadence notification handling inside the per-contact loop and add a per-contact/date sent marker.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 6: Fix authentication lifecycle after the security branch lands

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/core/security.py`
- Modify: `backend/app/api/deps.py`
- Modify: `backend/app/crud.py`
- Modify: `backend/app/models.py`
- Create: `backend/app/alembic/versions/s2t3u4v5w6x7_add_session_version.py`
- Test: `backend/tests/core/test_auth_lifecycle.py`

**Interfaces:**
- Produces: production settings reject missing `SECRET_KEY` and `INITIAL_ADMIN_TOKEN_PEPPER`.
- Produces: `session_version` is checked in local JWTs and incremented on logout, password change and reset.
- Produces: OIDC links require `email_verified is True`.

- [ ] **Step 1: Write failing tests**

```python
def test_production_settings_require_stable_secrets():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="production", PROJECT_NAME="x", POSTGRES_SERVER="db", POSTGRES_USER="u", POSTGRES_PASSWORD="secure-password", POSTGRES_DB="db")


def test_password_change_revokes_previous_access_token(client, user_headers):
    old_headers = dict(user_headers)
    assert client.patch(f"{settings.API_V1_STR}/users/me/password", headers=old_headers, json={"current_password": "old-password", "new_password": "new-password"}).status_code == 200
    assert client.get(f"{settings.API_V1_STR}/users/me", headers=old_headers).status_code == 401
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/core/test_auth_lifecycle.py -q`.

- [ ] **Step 3: Implement**

Add `session_version` to `User`; include it in local JWTs; increment it on logout-all, password change and password reset; require `email_verified is True` before linking an OIDC identity by email; require stable settings outside `local`.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 7: Fix frontend data loss and local time

**Files:**
- Modify: `frontend/src/components/Gifts/AddGift.tsx`
- Modify: `frontend/src/components/Interactions/AddInteractionDialog.tsx`
- Modify: `frontend/src/components/VoiceRecorder/VoiceReviewModal.tsx`
- Modify: `frontend/src/lib/utils.ts`
- Modify: `frontend/src/components/Interactions/InteractionTimeline.tsx`
- Modify: `frontend/src/routes/_layout/calendar.tsx`
- Modify: `frontend/src/components/Calendar/MonthCalendar.tsx`
- Modify: `frontend/src/client/types.gen.ts` only after regeneration
- Test: `frontend/src/__tests__/components/Gifts/AddGift.test.tsx`
- Test: `frontend/src/__tests__/components/Interactions/AddInteractionDialog.test.tsx`
- Test: `frontend/src/__tests__/components/VoiceRecorder/VoiceReviewModal.test.tsx`
- Test: `frontend/src/__tests__/lib/utils.test.ts`

**Interfaces:**
- Produces: `toLocalDateTimeInput(date)` and `localDateKey(date)` from `frontend/src/lib/utils.ts`.
- Produces: gift payload uses `gift_date`; interaction payload includes `location_label`, `latitude`, `longitude`.

- [ ] **Step 1: Change tests first**

```ts
expect(mockCreateGift).toHaveBeenCalledWith(expect.objectContaining({
  requestBody: expect.objectContaining({ gift_date: "2024-12-25" }),
}))
```

```ts
vi.setSystemTime(new Date("2026-11-02T04:00:00Z"))
expect(toLocalDateTimeInput(new Date())).toBe("2026-11-01T22:00")
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter frontend exec vitest run src/__tests__/components/Gifts/AddGift.test.tsx src/__tests__/components/Interactions/AddInteractionDialog.test.tsx src/__tests__/components/VoiceRecorder/VoiceReviewModal.test.tsx src/__tests__/lib/utils.test.ts`.

- [ ] **Step 3: Implement**

Remove the `GiftCreate` cast and send `gift_date`; extend interaction create/update models and generated types with location fields; use local helpers everywhere instead of `toISOString().slice(...)`.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: all pass.

## Task 8: Fix contact selection and search navigation

**Files:**
- Create: `frontend/src/lib/contactQueries.ts`
- Modify: `frontend/src/components/Common/QuickLogFAB.tsx`
- Modify: `frontend/src/components/CommandPalette/CommandPalette.tsx`
- Modify: `frontend/src/components/Interactions/AddInteractionDialog.tsx`
- Modify: `frontend/src/components/Mentions/MentionTextarea.tsx`
- Modify: `frontend/src/lib/queries.ts`
- Modify: `backend/app/api/routes/search.py`
- Test: `frontend/src/__tests__/components/Common/QuickLogFAB.test.tsx`
- Test: `frontend/src/__tests__/components/CommandPalette/CommandPalette.test.tsx`
- Test: `backend/tests/api/routes/test_search.py`

**Interfaces:**
- Produces: one canonical `contactSearchQueryOptions(query, limit)` with a unique key.
- Produces: search note results include `contact_id`.

- [ ] **Step 1: Add failing tests**

```ts
it("navigates note results to their contact", async () => {
  mockSearch.mockResolvedValue({ results: [{ id: "note-1", contact_id: "contact-1", type: "note", title: "Note" }] })
  await selectSearchResult("Note")
  expect(navigate).toHaveBeenCalledWith({ to: "/contacts/$contactId", params: { contactId: "contact-1" } })
})
```

```python
def test_note_search_result_exposes_contact_id(...):
    assert response.json()["results"][0]["contact_id"] == str(contact.id)
```

- [ ] **Step 2: Run RED**

Run the frontend test and `uv run pytest tests/api/routes/test_search.py -q`.

- [ ] **Step 3: Implement**

Use unique query keys, server-side search with debounce and cancellation, and correct QuickLog invalidation keys. Navigate note results through `contact_id`.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 9: Make note capture durable and idempotent

**Files:**
- Modify: `frontend/src/components/Notes/NotesCard.tsx`
- Modify: `frontend/src/lib/offline-db.ts`
- Modify: `frontend/src/lib/session.ts`
- Modify: `backend/app/crud.py` after Task 1
- Test: `frontend/src/__tests__/components/Notes/NotesCard.test.tsx`
- Test: `backend/tests/api/routes/test_notes_authorization.py`

**Interfaces:**
- Produces: every note gets a UUID and is persisted before network I/O.
- Produces: one account-scoped outbox retries each note independently.

- [ ] **Step 1: Add failing tests**

```ts
it("retries a committed note without duplicating it", async () => {
  mockCreateNote.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(note)
  await saveNote("hello")
  await syncNotes()
  expect(mockCreateNote.mock.calls[0][0].requestBody.client_id).toBe(mockCreateNote.mock.calls[1][0].requestBody.client_id)
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter frontend exec vitest run src/__tests__/components/Notes/NotesCard.test.tsx`.

- [ ] **Step 3: Implement**

Persist every draft before sending; include `client_id` always; run outbox replay independently of the mounted contact; preserve failed items and retry with backoff.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 10: Make webhooks replay-safe and fail closed

**Files:**
- Modify: `backend/app/api/routes/webhooks.py`
- Modify: `backend/app/models.py` after Task 0
- Create: `backend/app/alembic/versions/t3u4v5w6x7y8_add_webhook_delivery_id.py`
- Modify: `frontend/src/components/UserSettings/Webhooks.tsx`
- Test: `backend/tests/api/test_twilio_webhook.py`
- Test: `frontend/src/__tests__/components/UserSettings/Webhooks.test.tsx`

**Interfaces:**
- Produces: unique `(webhook_id, delivery_id)` rows for provider callbacks.
- Produces: PATCH preserves an existing secret when the secret field is omitted.

- [ ] **Step 1: Add failing replay and edit tests**

```python
def test_replaying_sms_message_is_idempotent(client, webhook_fixture):
    first = post_twilio(message_sid="SM123")
    second = post_twilio(message_sid="SM123")
    assert second.json()["interaction_id"] == first.json()["interaction_id"]
```

Expected: the second response reuses the first interaction.

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/api/test_twilio_webhook.py -q` and `pnpm --filter frontend exec vitest run src/__tests__/components/UserSettings/Webhooks.test.tsx`.

- [ ] **Step 3: Implement**

Persist delivery IDs, update call interactions by `CallSid`, require signatures for Twilio when configured, and preserve existing secrets on PATCH.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 11: Bound uploads and neutralize spreadsheet formulas

**Files:**
- Modify: `backend/app/csv_utils.py`
- Modify: `backend/app/api/routes/import_export.py`
- Modify: `backend/app/api/routes/ical.py`
- Modify: `backend/app/api/routes/transcribe.py`
- Create: `backend/app/core/uploads.py`
- Test: `backend/tests/test_csv_utils.py`
- Test: `backend/tests/api/routes/test_import_export.py`
- Test: `backend/tests/api/routes/test_transcribe.py`

**Interfaces:**
- Produces: `read_upload_bounded(file, *, max_bytes) -> bytes`.
- Produces: CSV exports prefix `= + - @` text cells with `'`.

- [ ] **Step 1: Add failing tests**

```python
def test_csv_export_escapes_formula_cells(...):
    assert "'=1+1" in exported_csv


async def test_upload_over_limit_returns_413(...):
    assert response.status_code == 413
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/test_csv_utils.py tests/api/routes/test_import_export.py tests/api/routes/test_transcribe.py -q`.

- [ ] **Step 3: Implement**

Add one bounded reader, route-specific byte and row caps, and formula escaping for text fields.

- [ ] **Step 4: Run GREEN**

Run Step 2. Expected: pass.

## Task 12: Repair generated clients, SDK behavior and locks

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/app/api/routes/contacts.py`
- Modify: `sdk/src/kindred/client.py`
- Modify: `sdk/tests/test_client.py`
- Modify: `justfile`
- Modify: `compose.worktree.yml`
- Delete after integration: `frontend/bun.lock`
- Regenerate after Task 0: `frontend/openapi.json`, `frontend/src/client/**`, `sdk/src/kindred/_generated/**`

**Interfaces:**
- Produces: `operation_id = method + path` for every route.
- Produces: `KindredClient.from_env()` reads `KINDRED_ON_BEHALF_OF`.

- [ ] **Step 1: Add failing SDK test**

```python
def test_from_env_reads_on_behalf_of(monkeypatch):
    monkeypatch.setenv("KINDRED_ON_BEHALF_OF", str(uuid.uuid4()))
    with KindredClient.from_env() as client:
        assert "x-on-behalf-of" in client.raw.get_httpx_client().headers
```

- [ ] **Step 2: Run RED**

Run: `cd sdk && uv run pytest tests/test_client.py -q`.

- [ ] **Step 3: Implement**

Read the env var in `from_env()`, make operation IDs unique, regenerate clients, switch worktree frontend installs to frozen pnpm, delete `frontend/bun.lock`, and add a regeneration diff gate.

- [ ] **Step 4: Run GREEN**

Run the SDK test, `just regen-client`, `just sdk-regen`, `just test-fast`, and compare live/stored operation sets.

## Task 13: Restore operational readiness

**Files:**
- Modify: `backend/app/api/routes/utils.py`
- Modify: `Dockerfile.prod`
- Modify: `compose.yml`
- Modify: `compose.dev.yml`
- Modify: `compose.worktree.yml`
- Create: `backend/scripts/migrate.sh`
- Test: `backend/tests/api/routes/test_utils.py`

**Interfaces:**
- Produces: `/health` is liveness and `/ready` checks Postgres and Redis.
- Produces: one-shot migration service gates backend and worker startup.

- [ ] **Step 1: Add failing readiness test**

```python
def test_ready_fails_when_database_check_fails(client, monkeypatch):
    monkeypatch.setattr(utils, "_database_ready", lambda: False)
    response = client.get(f"{settings.API_V1_STR}/utils/ready/")
    assert response.status_code == 503
```

- [ ] **Step 2: Run RED**

Run: `uv run pytest tests/api/routes/test_utils.py -q`.

- [ ] **Step 3: Implement**

Add readiness checks, a one-shot `migrate` service, and service dependencies on successful migration completion.

- [ ] **Step 4: Run GREEN**

Run Step 2 and `docker compose -f compose.worktree.yml config -q`.

## Task 14: Remove dead code and fix lower-ranked UI/performance findings

**Files:**
- Delete: `kindred-sdk/`, `add_endpoints.py`, `fix_reminders.py`, `types_backup.ts`, `update_frontend_types.py`, `NOT`, `NOTES`, `NOTES.md`, `tofix.txt`, `front`, `kind`, `kindred`, `frontend/src/components/Contacts/ContactsList.tsx.backup`, `backend/app/utils.py`, `backend/app/api/routes/contact_pdf.py`, `frontend/src/components/Debts/DebtPaymentsCard.tsx`
- Modify: `frontend/package.json`
- Modify: `frontend/src/lib/session-api.ts`
- Modify: `frontend/src/lib/queryClient.ts`
- Modify: `frontend/src/routes/_layout.tsx`
- Modify: `frontend/src/components/Contacts/ContactsList.tsx`
- Modify: `frontend/src/components/Contacts/ContactsMap.tsx`
- Modify: `frontend/src/components/Graph/GraphVisualization.tsx`
- Modify: `backend/app/api/routes/debts.py`
- Modify: `backend/app/crud.py`
- Test each affected existing test file.

**Interfaces:**
- Produces: only `401` clears authentication; `403` remains a local permission error.
- Produces: map bounds do not feed back into the viewport; lists paginate or virtualize; graph selection does not restart simulation.
- Produces: debt `is_settled` matches persisted settlement state.

- [ ] **Step 1: Add one failing test per behavior before edits**

```ts
it("does not log out on 403", async () => {
  await expect(request(OpenAPI, { method: "GET", url: "/api/v1/private" }, transport403)).rejects.toThrow(ApiError)
  expect(window.location.assign).not.toHaveBeenCalled()
})
```

```python
def test_settled_debt_remains_settled_without_payment_rows(...):
    assert listed["is_settled"] is True
```

- [ ] **Step 2: Run RED**

Run the affected Vitest and pytest files.

- [ ] **Step 3: Implement and delete**

Fix behavior, remove dead files, and remove `@tanstack/router`, `@tanstack/react-router-devtools`, `@tanstack/router-devtools`, and `playwright` from `frontend/package.json` if still unreferenced.

- [ ] **Step 4: Run GREEN**

Run the affected tests, `just lint`, and `just typecheck`.

## Task 15: Whole-repository verification and review

**Files:** None unless verification exposes a defect.

- [ ] Run `just test-all` after the security branch is integrated.
- [ ] Run `cd sdk && uv run pytest`.
- [ ] Run backend tests against the disposable Postgres and Redis containers.
- [ ] Run frontend coverage and the E2E suite.
- [ ] Run `pnpm audit --prod` and Trivy against the final locks.
- [ ] Run the runtime security image test.
- [ ] Dispatch an independent whole-branch review using `requesting-code-review`/`cast-review`.
- [ ] Fix all Critical and Important findings; re-review.
- [ ] Commit with `gcommit`, open the PR through `agent-workflow`, merge after checks, and verify the merged state.

