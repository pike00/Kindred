---
title: Keyboard Shortcut Help Overlay
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Create hotkey registry hook and global Cmd+/ (or ?) keybinding
---

# Keyboard Shortcut Help Overlay

## Goal
Implement a modal cheat sheet that opens via Cmd+/ or ? and displays all active keyboard shortcuts grouped by category (navigation, actions, search). The registry serves as the single source of truth so shortcuts are self-documenting as new bindings are added throughout the app.

## Tasks
- [ ] Build hotkey registry pattern: a global context/hook that collects shortcuts from all features with { keys, description, group } metadata
- [ ] Create grouped modal renderer: display shortcuts in collapsible/tabbed groups (Navigation, Actions, Search, etc) with visual kbd elements
- [ ] Implement global Cmd+/ and ? keybinding with proper focus suppression (skip when cursor in input/textarea/contenteditable)
- [ ] Add chord support: register multi-key sequences like `g c` (go contacts) with 1.5s timeout between key presses
- [ ] Input-focus suppression: detect contenteditable, input, textarea and suppress hotkey triggers (allow Escape to close overlay regardless)
- [ ] Style kbd elements: render keys with Mac-friendly symbols (Cmd, Opt, Shift) and Windows fallback (Ctrl, Alt)
- [ ] Pair with command-palette and global-shortcuts (Cmd+Shift+N, Cmd+Shift+I) so overlay auto-updates

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

### 2026-04-23
- README written with template.

## Notes
- Registry as single source of truth: each feature defines its shortcuts in one place (e.g., `useRegisterShortcuts({ keys: 'g c', description: 'Go to Contacts', group: 'Navigation' })`), and the overlay auto-renders them without manual maintenance.
- Library choice: use react-hotkeys-hook for simple listeners or tinykeys for lower-level control. For chords, tinykeys has better timeout semantics; react-hotkeys-hook requires manual sequence tracking.
- Chord timeout: 1.5 seconds between key presses before the sequence resets (e.g., `g c` must be pressed within 1.5s or the first `g` is lost).
- Input-focus suppression: check `document.activeElement` against input/textarea/contenteditable before firing hotkey. Escape always closes overlay regardless of focus.
- Visual kbd styling: use <kbd> HTML element with small background/border; render Cmd symbol (U+2318) on Mac, Ctrl text on Windows/Linux. Shift renders as upward arrow (U+21E7) on Mac, "Shift" on Windows/Linux.
- Grouping strategy: group by feature (Navigation, Actions, Search, Help) in the UI. Modal can be a simple div with overflow-y-auto or a Radix Dialog if animations desired.
- Self-documentation: no hardcoded shortcut list in the overlay; all bindings declared in feature components via a useRegisterShortcuts hook that injects into global registry on mount.
- Consider pairing with command-palette (Cmd+K) for discoverability: overlay can show which shortcuts map to which palette commands.
