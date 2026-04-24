---
title: Floating Quick-Log FAB
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Implement FAB component in app shell with popover form
---

# Floating Quick-Log FAB

## Goal
Add a persistent floating action button (FAB) in the bottom-right corner for rapidly logging interactions without navigating away. Compact popover form with contact autocomplete, channel selection, one-line note, and Cmd+Enter submit for power users.

## Tasks
- [ ] FAB component in app shell (persistent, bottom-right, safe-area aware)
- [ ] Compact popover form with input fields
- [ ] Contact typeahead/autocomplete
- [ ] Channel picker (call, in_person, text, email, video, social, other)
- [ ] Cmd+Enter submit pattern
- [ ] Mobile safe-area-inset-bottom padding for notch/home indicator

## Session Log

### 2026-04-21
- Project created.

## Notes
- Mobile-first sizing: popover should resize gracefully on small screens (iPhone SE).
- iOS safe-area-inset-bottom: account for notch/home indicator; test on device.
- Two-key submit: Cmd+Enter (desktop) or Cmd+Return (Mac); consider Ctrl+Enter fallback for Linux.
- Channel values from [models.py](../../../backend/app/models.py): call, in_person, text, email, video, social, other.
- Reuse @mentions autocomplete component from contact form if available; avoid duplication.
- Pairing opportunity: hold-to-record voice-to-text could feed the note field; future extension.
- Default occurred_at to now; allow manual date/time picker if needed.
- Test form submission and error states (missing contact, invalid channel).
