# Personal CRM — TODOs & Planned Improvements

Status: draft — review & edit freely.
Last updated: 2026-04-21

## How to use this file

- **TODOs** — work you've committed to. Short, actionable, with enough acceptance notes to drop into a branch.
- **Planned Improvements** — a backlog of candidate ideas. Not committed. Promote items up to TODOs as they mature, or delete them outright.

Tags in brackets on each item indicate the primary layer affected:

- `[schema]` — database model / migration
- `[api]` — backend route, service, or integration
- `[ui]` — frontend component, route, or interaction
- `[infra]` — deployment, build, auth, ops

---

## TODOs

- [ ] **E2E coverage for contact-scoped CRUD flows** `[ui]` — Add Playwright / Bun-runner tests under `frontend/e2e/` covering the add/edit/delete dialogs for each contact card (ContactFields, Addresses, Pets, Relationships, LifeEvents, CustomFields). Dev stack (`docker compose up`) must be running; tests should seed via the fake-data script (`just seed`) and assert both UI state and API round-trip. Originally surfaced in the 2026-04-13 post-card-refactor handoff — nothing has been verified end-to-end since; only the TypeScript build.

---

## Planned Improvements

Grounded in the current schema ([backend/app/models.py](backend/app/models.py)) and frontend layout ([frontend/src/components/](frontend/src/components/)). Items are phrased as change proposals, not requirements.

### Data model

1. **Multi-party interactions** `[schema][api]` — Replace `Interaction.contact_id` with an `interaction_attendee` junction table so one dinner, group call, or meeting logs once and attaches to every participant. Keeps `last_contacted_at` accurate for all attendees.

2. **Note mentions** `[schema][api][ui]` — Add a `note_mention` table (`note_id`, `contact_id`, `offset`, `length`) so `@Alice` inside a note surfaces on Alice's timeline. Enables cross-linking without duplicating text.

3. **Full-text search** `[schema][api][ui]` — Postgres `tsvector` GIN index over `Contact` (names, company, how_we_met), `Note.body`, `Interaction.notes`, `JournalEntry.body`. One global `/search` endpoint, one keyboard-invoked search UI.

4. **Contact merge with history** `[schema][api][ui]` — `contact_merge` log table capturing `(surviving_id, absorbed_id, merged_at, merged_by)`. Cascade all FKs to surviving contact, but keep the absorbed row (soft-deleted) so merges are reversible and audit-visible.

5. **Soft delete across mutable entities** `[schema][api]` — Add `deleted_at` to Contact, Interaction, Note, Gift, Debt, LifeEvent, Reminder. Query layer filters `WHERE deleted_at IS NULL` by default. Enables undo, recovery, and honest audit.

6. **Attachments** `[schema][api][ui]` — A generic `attachment` table polymorphic over Contact / Interaction / Note (or three thin tables if you'd rather avoid polymorphism). Store blobs outside Postgres (object store bucket), keep only the URL + metadata in the DB.

7. **Interaction location** `[schema][ui]` — Add `location_label` (free text) and optional `latitude/longitude` to `Interaction`. Maps to "where did we have coffee" and enables a lifetime-of-meetups map.

8. **Contact timezone + pronouns** `[schema][ui]` — Two small fields on `Contact`. Timezone converts `contact_frequency_days` reminders into "today at 9am *their* time"; pronouns show up in summaries and auto-generated messages.

9. **Communication preferences** `[schema][ui]` — Structured replacement for the current free-text dance around `how_we_met`: `preferred_channel` (enum reusing `InteractionChannel`), `best_time_local` (HH:MM range), `do_not_contact` bool + reason. Filters feed into scheduling recommendations.

10. **Relationship inverse mapping** `[schema][api]` — When a user creates `Alice → spouse → Bob`, auto-create `Bob → spouse → Alice`. Mapping table of inverses (`parent↔child`, `manager↔report`, `friend↔friend`). Use a self-referential FK trigger or enforce in the service layer.

11. **Household/family aggregate view** `[api][ui]` — No new table: derive a household from chains of `spouse`, `child`, `parent`, `sibling` edges. Show on a contact: "Household: Alice, Bob, Max (13), Riley (7)". Makes gift occasions and visit planning much cleaner.

12. **Contact stage history** `[schema][api]` — `contact_stage_event (contact_id, from_stage, to_stage, occurred_at, note)`. Current `Contact.stage` is the latest row. Kanban drags become auditable and you get a "time in stage" metric.

13. **Audit log for shared data** `[schema][api]` — `activity_log (owner_id, actor_id, entity_type, entity_id, action, changes_json, occurred_at)` scoped to shared rows via `TagShare`. Anyone sharing a tag can see who edited what and when.

15. **Debt partial payments** `[schema][api][ui]` — `debt_payment (debt_id, amount, paid_at, note)`. Current `is_settled` bool becomes a derived check (sum of payments ≥ debt amount). Enables IOU tracking that matches real life.

16. **Interaction drafts** `[schema][api][ui]` — Add `is_draft` and `draft_source` (`"voice_memo"`, `"email_suggestion"`, etc.) to `Interaction`. Drafts don't affect `last_contacted_at` until confirmed. Pairs well with voice-to-text capture (item 47).

17. **Contact provenance** `[schema][api]` — `source` (enum: `manual`, `vcard_import`, `carddav`, `google`, `webhook`) and `source_external_id` on `Contact`. Makes re-syncs idempotent and lets you show "imported from Google on 2025-12-03".

18. **Organizations as first-class** `[schema][api][ui]` — Promote `Contact.company` (free text) into an `Organization` entity with its own record: address, domain, industry, notes. Migration: dedupe by exact string, link. Enables "everyone at Acme Co."

19. **Journal ↔ contact join** `[schema][ui]` — Optional `journal_entry_contact` join so a journal entry can reference people without duplicating the note content. Different from note mentions — this is your own reflection about them, not facts about them.

20. **Reminder snooze history** `[schema]` — Append-only `reminder_snooze (reminder_id, snoozed_at, snoozed_until, reason)` instead of overwriting `snoozed_until`. Reveals "I've snoozed calling Mom four times" — useful signal.

### Backend features & integrations

21. **CardDAV server mode** `[api][infra]` — Expose `/carddav/{user}/contacts/` so iPhone / macOS Contacts sync bidirectionally. The `vcard_raw` and `vcard_etag` columns already anticipate this.

22. **ICS calendar export** `[api]` — Per-user `/calendar.ics` feed combining birthdays (from `Contact.birthday`), `LifeEvent` anniversaries with `create_annual_reminder=true`, and all active `Reminder`s. Subscribable URL, token-auth.

23. **vCard round-trip hash verification** `[api]` — On every `vcard_raw` write, store `sha256(vcard_raw)`. On CardDAV PUTs compare; if drift exceeds tolerance, flag for user review instead of blindly overwriting.

24. **CSV import/export** `[api][ui]` — Import: column-mapping UI (first_name → First Name, etc.), dedupe-by-email check. Export: one-click, includes related tag/group names.


27. **iCal importer (backfill)** `[api][ui]` — One-shot: upload an `.ics`, heuristically extract past events with people's names, propose as `LifeEvent` or historical `Interaction` rows. Manual confirmation before insert.

28. **Google / iCloud OAuth contact import** `[api][ui]` — Start-of-life seeding. Use provenance (item 17) so re-running doesn't create duplicates.

### UI / UX

29. **Global command palette (Cmd+K)** `[ui]` — The new `command.tsx` and `popover.tsx` in `ui/` are clearly scaffolding for this — wire it up. Actions: jump to contact, new interaction, new note, toggle a tag filter, open settings. Fuzzy-search over contacts + recent entities.

30. **@contact autocomplete** `[ui]` — Inline mention picker (reusing the command primitive) inside Note bodies, Interaction notes, JournalEntry bodies. Inserts a `@[Name](contact_id)` token that backs item 2.

31. **Unified contact timeline** `[ui]` — On the contact detail page, interleave Interactions, Notes, Gifts, LifeEvents, Debts, stage changes in one reverse-chronological feed. Each card colored by type. Filters along the top.

32. **"Stay in touch" dashboard widget** `[ui]` — Already hinted at in commit `4588a2f`. Make it richer: overdue contacts sorted by days-over, one-click "log interaction" per row, "skip this week" option that pushes the due date forward without logging.

33. **Birthday & anniversary calendar** `[ui]` — Month view with birthdays (from `Contact.birthday`) and annual life-event dots. Click a day → see people, jump to contact.

34. **Map view of contacts** `[ui]` — Plot `Address.latitude/longitude`. Cluster by city. Useful for "who can I have lunch with when I'm in Boston next week?"

35. **Relationship graph** `[ui]` — Force-directed graph of contacts with `Relationship` edges typed by label. Zoom to a contact, see their immediate network, jump through edges. Great for rediscovery.

36. **Floating quick-log FAB** `[ui]` — Persistent bottom-right button with a compact form: contact autocomplete, channel picker, one-line note, occurred_at defaulting to now. Two-key submit.

37. **Bulk operations on contacts list** `[ui]` — Multi-select checkboxes → add/remove tag, add/remove group, archive, export. The list view is where most triage happens; bulk turns minutes into seconds.

38. **Saved filters / smart lists** `[schema][ui]` — `SavedFilter (owner_id, name, filter_json)`. Examples: "colleagues overdue > 30d", "family with birthdays next month", "anyone in stage=prospect". Surface as a sidebar section.

39. **Interaction heatmap per contact** `[ui]` — GitHub-style 52-week grid on the contact detail page, cell intensity = interaction count that week. Instantly visible "we've been drifting".

40. **Printable contact one-pager** `[api][ui]` — PDF export of a contact: key fields, last 5 interactions, active debts/gifts, relationships. Useful as pre-meeting prep. Server-side render (WeasyPrint) or client-side (react-pdf).

41. **Contacts Kanban board** `[ui]` — The `Contact.stage` column is already there but there's no board view — add one. Drag between columns to update stage, with item 12 providing the audit trail.

42. **Gift Kanban (Idea → Purchased → Wrapped → Given)** `[schema][ui]` — Extend `GiftStatus` enum beyond `idea/given/received` so it can model a real pipeline. Per-column counts, overdue warnings (e.g. birthday in 3 days and still `idea`).

43. **Reminders bell + badge** `[ui]` — Persistent header icon, badge = count of reminders due today + overdue. Dropdown lists them with snooze / log-as-interaction / dismiss actions.

44. **Empty-state illustrations** `[ui]` — Every list page (Contacts, Interactions, Debts, Gifts, Journal, Notes, Reminders, Tags) should have a first-run empty state that teaches what goes here and includes a one-click demo-data seed button (gated in dev only).

45. **Undo toast on destructive actions** `[ui]` — 5-second toast with Undo after delete-contact, delete-note, delete-gift, settle-debt. Backed by item 5 (soft delete).

46. **TagShare scope warning** `[ui]` — The current `TagShare` silently grants access to every row bearing a tag. The grant modal should spell out exactly how many contacts (and which nested rows — notes, interactions) the grantee will see, before confirming.

47. **Voice-to-text interaction capture** `[ui][api]` — Hold-to-record button on the FAB (item 36) → Whisper / local `faster-whisper` → draft `Interaction` (item 16). Confirm before save. Good for post-call logging while the details are fresh.

48. **Avatar cropper with face-aware crop** `[ui]` — When uploading an avatar, run a face detector in-browser (MediaPipe / face-api.js), default the crop square to the face. Matches the `ContactAvatar` display-face aesthetic that commit `d148625` introduced.

49. **PWA installability + offline note drafting** `[infra][ui]` — Service worker, manifest, cache-first for the app shell. Notes composed offline are queued and synced on reconnect. iOS A2HS + Android install banner.

---
