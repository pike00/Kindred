---
title: "@contact Autocomplete"
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Add caret-position detection and @-triggered popover to Note editor
---

# @contact Autocomplete

## Goal
Bring inline contact mentions to Note, Interaction, and JournalEntry bodies via an @ autocomplete picker. When a user types @, a popover appears showing contacts; selecting one inserts a `@[Name](contact_id)` token. This token renders as a clickable link in the UI and forms the capture side of the note mentions feature.

## Tasks
- [ ] **Verify (LLM-built, to_review):** confirm @mention autocomplete (commit 52edbc4) inserts `@[Name](contact_id)` tokens and renders as links across the Note/Journal/Interaction editors — it shipped & was archived with all tasks below still unchecked
- [ ] Add caret-position detection to plain textarea editors (or evaluate rich-text library: tiptap, lexical)
- [ ] Trigger popover on @ character and manage suggestion state (contact search query)
- [ ] Implement contact search API endpoint: GET /contacts/search?q=...&limit=10
- [ ] Reuse command.tsx primitive for the mention picker (CommandInput, CommandList, CommandItem)
- [ ] Serialize selected mention as `@[Name](contact_id)` token in note body
- [ ] Render token as styled link in Note, Interaction, JournalEntry display components
- [ ] Apply autocomplete to all three editor surfaces (Note.body, Interaction.note, JournalEntry.body)

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-05-31
- Housekeeping: status `archived` → `to_review`. Shipped by an LLM (commit 52edbc4) but archived with all tasks unchecked and no human verification. Pulled back into review with a verification task.

### 2026-04-24
- Project archived. @mention autocomplete shipped in commit 52edbc4: MentionTextarea inserts `@[Name](contact_id)` tokens, MentionText renders them as Link components. Wired into NotesCard quick-capture/edit, AddJournalDialog, Journal columns. The same textarea primitive also powers the Interaction notes field (landed with #1).

### 2026-04-21
- Project created.

## Notes

- **Command primitive**: The UI already has a cmdk-based command.tsx ([command.tsx](../../../frontend/src/components/ui/command.tsx)). This is a ComboBox built on Radix UI's command pattern—CommandInput filters, CommandList displays options, CommandItem handles selection. Reusing this for mention picker ensures visual consistency and reduces custom picker code.

- **Editor complexity**: Plain textarea has no concept of caret position or rich text. Three options:
  1. Query `textarea.selectionStart` and manipulate DOM directly (fragile but lightweight).
  2. Integrate tiptap (Headless editor, Vue roots, moderate overhead, mature ecosystem).
  3. Integrate lexical (Headless editor, React-native, Facebook-maintained, heavier).
  For MVP, detect @ via selectionStart + insert text after character; revisit if richer formatting lands.

- **Caret anchoring**: On @, measure caret position and open popover relative to textarea. Libraries like `textarea-caret-position` (npm) solve this cross-browser. Popover should follow caret as the user types the search query.

- **Token format**: `@[Contact Name](contact_id)` is markdown-like syntax, not standard markdown. On render, parse this pattern and swap for a `<a>` tag or styled `<span>`. Store as plain text in the database to keep schema simple; parsing happens at read time. Fallback: if contact_id is deleted/stale, display the literal token and log a warning.

- **Search API**: Implement GET /contacts/search?q=name&limit=10. Return JSON array of `{id, name, email}`. This drives the autocomplete dropdown. Consider fuzzy matching (fuse.js on frontend, or Postgres trigram search backend-side).

- **Idempotency and undoing**: Mention tokens are immutable text. If a contact is renamed, the token still contains the old name + ID. On display, resolve ID to current name. If a contact is deleted, the mention becomes a dead link—either gray it out, or show a tooltip "(contact deleted)".

- **Interaction.note vs Note.body**: Both are text fields in different models. JournalEntry.body is a third. Apply the same mention logic to all three to keep the feature cohesive.

- **UI state**: The mention picker is ephemeral—it appears when @ is typed, filters as the user types more characters, and closes when the user selects an item, presses Escape, or moves the caret away from the @ mention. Track the @ position and current search query in React state; cancel the popover on blur.
