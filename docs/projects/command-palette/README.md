---
title: Global Command Palette (Cmd+K)
status: to_review
repos: [personal-crm]
started: 2026-04-23
last_updated: 2026-08-04
next_step: Set up keyboard listener and command registry pattern (hook + context)
---

# Global Command Palette (Cmd+K)

## Goal
Implement a global keyboard-invoked command palette (Cmd+K on Mac, Ctrl+K on Windows/Linux) that provides fast navigation and bulk actions across the app. Support fuzzy-search over contacts + recent interactions/notes, quick-jump to any contact, create new interaction/note, toggle tag filters, and open settings.

## Tasks
- [ ] **Verify (LLM-built, to_review):** confirm the Cmd+K/Ctrl+K palette (commit 7237b8e) opens, fuzzy-searches contacts, and every command group navigates correctly — it shipped & was archived with all tasks below still unchecked
- [ ] Set up global Cmd+K (Ctrl+K) keyboard listener and focus management (suppress text input when palette is open)
- [ ] Create command registry pattern: a hook that collects commands from all features (contacts, notes, interactions, settings)
- [ ] Implement contact/interaction/note fuzzy-search via existing /search endpoint (pair with full-text-search project)
- [ ] Wire recent items section: top 5 contacts by last_interaction_date + last 5 interactions/notes
- [ ] Add action commands: new interaction, new note, toggle tag filter, open settings, open help
- [ ] Keyboard navigation (arrow keys, Enter, Escape) and screen reader support (aria-activedescendant)
- [ ] Add command keyboard shortcuts in UI (e.g., "Cmd+Shift+N for new note") and help panel

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-05-31
- Housekeeping: status `archived` → `to_review`. Shipped by an LLM (commit 7237b8e) but archived without a human verifying it, and the task list was never checked off. Pulled back into review with a verification task.

### 2026-04-24
- Project archived. Palette shipped in commit 7237b8e: Cmd+K/Ctrl+K opens a dialog with Contacts / Quick actions / Navigate groups, wired via CommandPaletteProvider in _layout.

### 2026-04-23
- Project created. command.tsx and popover.tsx primitives exist in frontend/src/components/ui/.

## Notes
- The cmdk library (used in command.tsx) provides fuzzy-search, grouping, and keyboard nav out of the box; CommandGroup and CommandItem handle aria-activedescendant automatically.
- PopoverContent from @radix-ui/react-popover will anchor the palette to viewport; set sideOffset=0 and position: fixed for center-screen placement (or use Modal instead).
- Hotkey library choice: use native KeyboardEvent listener on document with Cmd+K (metaKey) / Ctrl+K (ctrlKey) check; or bring in tiny-hotkeys/hotkeys.js if multi-key chords (Cmd+Shift+N, etc) scale to 10+ commands.
- Command registry: store commands in React Context { label, description, icon, action(), keywords } array. Features register their commands via a hook (e.g., useRegisterCommand) on mount, cleanup on unmount.
- Text input suppression: when palette is open, preventDefault on keydown events in input fields so Escape/Arrow keys work for navigation, not field editing.
- Recent items: fetch last 5 via `/api/recent?type=contact,interaction,note&limit=5` endpoint (may need to create this). Sorted by recency; clear on logout.
- Pair with full-text-search endpoint (/search?q=...) for search results; display Contact, Interaction, Note, JournalEntry types with type badges and result counts.
- Accessibility: <Popover> should have role=dialog, aria-label="Command Palette", aria-modal=true; CommandPrimitive manages aria-activedescendant internally for list items.
- Consider keyboard shortcuts (Cmd+Shift+N, Cmd+Shift+I, etc) for quick-create commands; register them as separate commands alongside their label.
