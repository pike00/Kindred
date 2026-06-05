---
title: Merge Train v0.2.70 QA
status: active
repos: [personal-crm]
started: 2026-05-25
last_updated: 2026-06-05
next_step: Bring up dev stack and run setup steps, then work through feature checklist top to bottom
---

# Merge Train v0.2.70 QA

## Goal

Human-verify that all 29 features merged in the v0.2.42–v0.2.70 train are working end-to-end in the live dev stack. Each item below is a concrete UI or API action that exercises the feature. Check off each item as you confirm it works.

---

## Version bump sequence

Prod is at **v0.2.30**. All tags v0.2.42–v0.2.72 already exist. After each feature section passes QA, run `just deploy <tag>` to advance prod to that version.

| # | Feature | Tag | Command |
|---|---------|-----|---------|
| 1 | Contact fields (timezone/pronouns) | v0.2.42 | `just deploy v0.2.42` |
| 2 | CSV import/export | v0.2.43 | `just deploy v0.2.43` |
| 3 | Debt partial payments | v0.2.44 | `just deploy v0.2.44` |
| 4 | Email log ingestion | v0.2.45 | `just deploy v0.2.45` |
| 5 | Empty state illustrations | v0.2.46 | `just deploy v0.2.46` |
| 6 | Face-aware avatar crop | v0.2.47 | `just deploy v0.2.47` |
| 7 | Household aggregate view | v0.2.48 | `just deploy v0.2.48` |
| 8 | iCal importer backfill | v0.2.49 | `just deploy v0.2.49` |
| 9 | ICS calendar export | v0.2.50 | `just deploy v0.2.50` |
| 10 | Interaction draft saving | v0.2.51 | `just deploy v0.2.51` |
| 11 | Interaction frequency heatmap | v0.2.52 | `just deploy v0.2.52` |
| 12 | Interaction location | v0.2.53 | `just deploy v0.2.53` |
| 13 | Journal entries linked to multiple contacts | v0.2.54 | `just deploy v0.2.54` |
| 14 | Map view for contacts | v0.2.55 | `just deploy v0.2.55` |
| 15 | Organizations as first-class entities | v0.2.56 | `just deploy v0.2.56` |
| 16 | Printable contact one-pager | v0.2.57 | `just deploy v0.2.57` |
| 17 | PWA offline note drafting | v0.2.58 | `just deploy v0.2.58` |
| 18 | Relationship graph | v0.2.59 | `just deploy v0.2.59` |
| 19 | Automatic inverse relationship mapping | v0.2.60 | `just deploy v0.2.60` |
| 20 | Reminder bell badge | v0.2.61 | `just deploy v0.2.61` |
| 21 | Reminder snooze history | v0.2.62 | `just deploy v0.2.62` |
| 22 | Saved filters and smart lists | v0.2.63 | `just deploy v0.2.63` |
| 23 | Soft delete with restore | v0.2.64 | `just deploy v0.2.64` |
| 24 | Stay-in-touch dashboard widget | v0.2.65 | `just deploy v0.2.65` |
| 25 | Twilio webhook ingestion | v0.2.66 | `just deploy v0.2.66` |
| 26 | vCard hash verification | v0.2.67 | `just deploy v0.2.67` |
| 27 | Voice-to-text interaction | v0.2.68 | `just deploy v0.2.68` |
| 28 | iMessage sync | v0.2.69 | `just deploy v0.2.69` |
| 29 | Undo toast for destructive actions | v0.2.70 | `just deploy v0.2.70` |

After all 29 pass, run `just deploy v0.2.72` to bring prod fully current.

---

## Setup

Before testing, bring up the full dev stack:

```bash
cd ~/projects/personal-crm
just dev           # brings up backend, worker, db, redis, meilisearch, frontend
```

Or if the stack is already running but the frontend was stopped:

```bash
docker start crm-main-frontend-1
```

Wait for frontend to finish compiling (watch `just logs frontend`), then navigate to:

**https://main.kindred.khanpikehome.com**

Log in with the dev credentials from `.env` (`FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD`).

If you want fresh data run `just seed` first.

---

## Tasks

### End-of-train gates

- [ ] `just pytest` passes (run inside backend container — expect 300+ tests, no failures)
- [ ] `just typecheck` passes (tsc --noEmit, no type errors)
- [ ] Fresh DB migration: `just down-clean && just dev`, then confirm UI loads and contacts appear after seed

### Contact fields (v0.2.42)

- [ ] Edit any contact → confirm **Timezone** and **Pronouns** fields are present and saveable
- [ ] Save a value for both, reload the contact page, verify the values persist

### CSV import/export (v0.2.43)

- [ ] Go to Contacts page → find the Import/Export button or menu
- [ ] Export contacts as CSV → verify the downloaded file has correct headers and data
- [ ] Import the same CSV back (or a modified copy) → verify contacts are created/updated without duplicates

### Debt partial payments (v0.2.44)

- [ ] Open a contact → Debts tab → create a debt if none exist
- [ ] Click into the debt → add a payment (amount, date, note)
- [ ] Add a second payment → verify the running total and `is_settled` status update correctly

### Email log ingestion (v0.2.45)

- [ ] Settings → look for an **Email / Auto-log** configuration section
- [ ] Toggle `auto_log_email` on a contact → confirm the field is saved (check via contact edit or API: `GET /api/v1/contacts/{id}`)

### Empty state illustrations (v0.2.46)

- [ ] Navigate to Contacts, Interactions, Reminders, Tags, Journal with no data — confirm each shows an illustration and a helpful message instead of a blank list
- [ ] In dev mode, confirm the **Seed** button appears on empty lists

### Face-aware avatar crop (v0.2.47)

- [ ] Open any contact → upload a photo that contains a face
- [ ] Verify the avatar thumbnail is cropped to center on the face (not a mechanical top-left crop)

### Household aggregate view (v0.2.48)

- [ ] Open a contact that has relationships → look for a **Household** tab or panel on the detail page
- [ ] Confirm related contacts appear with their name and age (computed from birthday if set)

### iCal importer backfill (v0.2.49)

- [ ] Settings → iCal import → add a `.ics` feed URL (or use an existing one)
- [ ] Trigger a backfill → confirm past events are imported as calendar entries (check via Calendar page or `GET /api/v1/calendar/events`)

### ICS calendar export (v0.2.50)

- [ ] Calendar page (or Settings) → find an **Export ICS** button
- [ ] Download the `.ics` file → open in any calendar app and verify events appear

### Interaction draft saving (v0.2.51)

- [ ] Log an interaction → before submitting, save it as a **Draft**
- [ ] Navigate away → return and confirm the draft is listed (look for a Drafts section)
- [ ] Open the draft, edit it, then submit → verify it becomes a real interaction

### Interaction frequency heatmap (v0.2.52)

- [ ] Open a contact with several past interactions → look for a **Heatmap** or activity grid on the detail page
- [ ] Verify cells are filled in for months/weeks with recorded interactions

### Interaction location (v0.2.53)

- [ ] Log a new interaction → find the **Location** field
- [ ] Enter a location (address or venue name) and save
- [ ] Reload the interaction → verify location is shown; check for a map pin if a map component renders

### Journal entries linked to multiple contacts (v0.2.54)

- [ ] Journal → create a new entry → attach it to **two or more contacts**
- [ ] Save → verify the entry appears on both contacts' detail pages under Journal/Reflections
- [ ] Open one contact → Reflections tab → confirm the journal entry lists both contacts

### Map view for contacts (v0.2.55)

- [ ] Contacts page → switch to **Map** view (tab or toggle)
- [ ] Verify contacts with addresses appear as pins on the map
- [ ] Click a pin → confirm it shows the contact name and links to their detail page

### Organizations as first-class entities (v0.2.56)

- [ ] Sidebar → **Organizations** link
- [ ] Create a new organization (name, website, etc.)
- [ ] Link a contact to the organization → verify the contact card shows the org
- [ ] Organization detail page → confirm it lists linked contacts

### Printable contact one-pager (v0.2.57)

- [ ] Open a contact detail page → find a **Print** or **Download PDF** button
- [ ] Download the PDF → verify it contains the contact's key info (name, email, phone, relationships)

### PWA offline note drafting (v0.2.58)

- [ ] In browser DevTools → Network tab → set to **Offline**
- [ ] Create a note or interaction → confirm it queues locally (check for an offline indicator)
- [ ] Restore network → verify the queued note syncs automatically

### Relationship graph (v0.2.59)

- [ ] Sidebar → **Graph** link
- [ ] Confirm an interactive force-directed graph renders with contact nodes
- [ ] Click a node → confirm it highlights or links to the contact
- [ ] Use depth filter (1/2/3 hops) → confirm graph updates

### Automatic inverse relationship mapping (v0.2.60)

- [ ] Open a contact → Relationships tab → create a relationship "Parent of [another contact]"
- [ ] Navigate to the other contact → Relationships tab → confirm "Child of [first contact]" was auto-created
- [ ] Delete the relationship on one side → confirm the inverse is also removed

### Reminder bell badge (v0.2.61)

- [ ] Create a reminder due today or in the past
- [ ] Check the navigation header for a **bell icon with a count badge**
- [ ] Dismiss or complete the reminder → verify the badge count decrements

### Reminder snooze history (v0.2.62)

- [ ] Open a reminder → snooze it (pick a future time)
- [ ] Snooze it again with a different time
- [ ] Check for a **Snooze history** or **Snooze log** on the reminder → confirm both snooze events are recorded

### Saved filters and smart lists (v0.2.63)

- [ ] Contacts page → apply a filter (e.g., by city or tag)
- [ ] Save the filter with a name
- [ ] Reload the page → confirm the saved filter appears in a dropdown or sidebar under Smart Lists
- [ ] Select it → confirm the same filtered result appears

### Soft delete with restore (v0.2.64)

- [ ] Delete a contact
- [ ] An **undo toast** should appear — click Undo within the window → confirm the contact is restored
- [ ] Delete again without undoing → confirm the contact is gone from the list
- [ ] Optionally verify via API: `GET /api/v1/contacts/{id}` returns 404; a restore endpoint exists at `POST /api/v1/contacts/{id}/restore`

### Stay-in-touch dashboard widget (v0.2.65)

- [ ] Dashboard → look for a **Stay in Touch** widget
- [ ] It should show contacts who are overdue for contact based on their set frequency
- [ ] Click **Skip** on one → verify they leave the list temporarily
- [ ] Verify `do_not_contact` flag on a contact excludes them from the widget

### Twilio webhook ingestion (v0.2.66)

- [ ] Settings → look for a Twilio configuration section (webhook URL, credentials)
- [ ] Confirm a webhook URL is displayed for SMS/call ingestion
- [ ] (Optional) send a test SMS to the configured Twilio number → verify an interaction is created for the matching contact

### vCard hash verification (v0.2.67)

- [ ] Trigger a CardDAV sync (or POST to the sync endpoint)
- [ ] Check server logs or an admin page for vCard hash verification results
- [ ] Confirm contacts with clean round-trips are marked verified; any mismatches are flagged

### Voice-to-text interaction (v0.2.68)

- [ ] Log an interaction → look for a **microphone** button in the interaction form
- [ ] Record a short voice note → verify it is transcribed to text in the notes field
- [ ] Save and confirm the transcribed text is stored

### iMessage sync (v0.2.69)

- [ ] Settings → iMessage sync configuration
- [ ] Confirm `POST /api/v1/contacts/imessage-sync` endpoint exists (visible in API docs at `/docs`)
- [ ] Submit a mock payload → verify contacts are matched/created by `imessage_id`
- [ ] Check that co-mention edges (group chat participants) are created as relationships

### Undo toast for destructive actions (v0.2.70)

- [ ] Delete a contact, interaction, reminder, or other entity
- [ ] Confirm a **toast notification** appears with an Undo button within ~5 seconds
- [ ] Click Undo → confirm the entity is restored
- [ ] Verify the toast disappears after the window expires without action

---

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-05-25

- Created QA checklist from v0.2.42–v0.2.70 merge train (29 features across 29 releases).
- Dev stack: backend, worker, db, redis, meilisearch running. Frontend stopped (was stopped to allow releases). Restart with `docker start crm-main-frontend-1` or `just dev`.

## Notes

### 2026-05-25

- **Accomplished:** 29 PRs merged sequentially, one release cut after each. v0.2.42 through v0.2.70.
- **Issues:** Frontend container (`crm-main-frontend-1`) was stopped mid-session to prevent `routeTree.gen.ts` regeneration from dirtying the working tree for release-kit. Restart before UI testing.
- **Issues:** Many features have no backend-only smoke test — they require the UI. The API docs at `https://main.kindred.khanpikehome.com/docs` are useful for testing endpoints directly if a UI path isn't obvious.
- **Gotchas:** Several features (Twilio, iMessage, vCard, voice-to-text) require external services or credentials to fully exercise. Mark them as "verified API exists" if you can't test the full flow.
- **Gotchas:** Ghost tags: the GHA release workflow auto-creates a +1 patch tag after every release-kit push. These were deleted during the train. After any future `just release`, check `git fetch --tags && git tag --sort=-version:refname | head -3` and delete the ghost before proceeding.
