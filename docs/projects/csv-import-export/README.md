---
title: CSV Import / Export
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Backend CSV parser with auto-column detection and validation
---

# CSV Import / Export

## Goal

Enable bulk contact data import via CSV with smart column mapping and duplicate detection. Export contacts with related tag and group names for external tooling and backup.

## Tasks

- [ ] Backend CSV parser with auto-column detection (heuristics for common headers)
- [ ] Mapping preview UI: drag-drop or select-based column assignment
- [ ] Dedupe check: email normalization and optional phone E.164 format matching
- [ ] Export endpoint: flatten tags/groups into comma-separated columns, UTF-8 BOM for Excel
- [ ] Encoding detection and handling (UTF-8, ISO-8859-1, Windows-1252)
- [ ] Multi-value field handling (email/phone lists split into separate rows or repeated columns)

## Session Log

### 2026-04-21
- Project created; README and handoffs structure initialized.

## Notes

- **Preview before commit:** Always show a sample of parsed rows and final row count before importing; let users cancel or fix mapping.
- **Dedupe by email:** Normalize to lowercase and trim whitespace; offer "skip duplicates" or "merge by email" strategies.
- **Dedupe by phone:** E.164 format (+1-555-0123 -> +15550123) for cross-regional matching; optional, disabled by default.
- **Provenance tagging:** Consider auto-tagging imported contacts with a hidden tag like "imported_2026-04-21" for audit trails; tie to CreatedAt group if available.
- **UTF-8 BOM for Excel:** Write BOM (`﻿`) on export for Excel compatibility; detect and strip on import.
- **Multi-value fields:** ContactField allows emails/phones as a list. CSV export can either: (a) concatenate into one column with semicolon separator, or (b) duplicate entire contact row per email/phone. Recommend (a) for simplicity, (b) for spreadsheet workflows.
- **Schema reference:** Contact fields at [models.py](../../../backend/app/models.py) lines 353-520 (Contact, ContactBase, ContactField). Tag (lines 161-212) and Group (lines 276-326) are simple name + owner; ContactTag and ContactGroup are many-to-many junctions (lines 217-348).
