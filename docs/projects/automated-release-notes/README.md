---
title: Automated Release Notes in GitHub
status: to_review
repos: [personal-crm]
started: 2026-04-28
last_updated: 2026-05-31
next_step: Released as v0.1.7. Backfilling notes for older tags remains a follow-up; script supports --since-tag.
---

# Automated Release Notes in GitHub

## Goal
Automate generation and publishing of release notes for personal-crm on GitHub. Collect commit subjects (or conventional-commit groupings) since the previous tag, format them into a release-notes block, and publish via GitHub Releases.

## Tasks
- [ ] **Verify (LLM-built, to_review):** run `scripts/generate-release-notes.py` against a real tag range; confirm v0.1.7 GH release notes group correctly and the workflow publishes
- [x] Decide release trigger (tag push, workflow_dispatch, or both)
- [x] Choose tooling (gh CLI + script, release-please, semantic-release, custom Action)
- [x] Define grouping rules (Features / Fixes / Chores / Breaking)
- [x] Wire the chosen flow into a GitHub Actions workflow
- [ ] Decide whether to backfill notes for existing tags

## Session Log

### 2026-05-31
- Housekeeping: status → `to_review`. Completed entirely by an LLM (Dirac agent, squash-merge `dirac/automated-release-notes`, commit `5cd6273`, shipped v0.1.7) with no human verification of the generated notes. Added a verification task.

### 2026-05-15
- Squash-merged `dirac/automated-release-notes` into main as commit `5cd6273`; tagged and released **v0.1.7**. Clean merge — no backend or model conflicts; only the squash brought along the unrelated `EditUser.test.tsx` `waitFor` hardening that the branch had picked up.
- Landed `scripts/generate-release-notes.py` (260 LOC) plus expanded `docs/projects/automated-release-notes/README.md` (this file).

### 2026-04-28
- Project scaffolded for tracking — no implementation work yet

### 2026-04-28 (Dirac Implementation)
- Decided on **both** triggers: `push: tags: ["v*"]` for automated releases + `workflow_dispatch` for manual control
- Chose **gh CLI + Python script** approach:
  - `scripts/generate-release-notes.py` handles conventional commit parsing, grouping, and markdown generation
  - Supports `--since-tag`, `--to-ref`, and `--version` arguments
  - Groups: Features ✨, Fixes 🐛, Documentation 📚, Styling 💄, Refactoring ♻️, Performance ⚡, Tests 🧪, Chores 🔧, CI/CD 🚀, Build 📦, Reverts ⏪, Breaking ⚠️
  - Handles scopes (e.g., `feat(auth): ...`) and non-conventional commits
- Fixed existing `.github/workflows/release.yml`:
  - Replaced buggy bash subshell logic (variable scoping bug prevented NOTES from accumulating)
  - Now delegates to `scripts/generate-release-notes.py` for reliable release notes generation
  - Version auto-increment from latest tag still works
  - Dry run mode preserved for testing
- Commit: `fix(release): use Python script for release notes generation`

## Notes

### 2026-05-15
- **Accomplished:** v0.1.7 shipped. The script now lives on main and is callable from any release workflow.

### Usage
```bash
# Generate notes since a specific tag
python3 scripts/generate-release-notes.py --since-tag v0.1.0 --version v0.2.0

# Generate notes for all commits (no previous tag)
python3 scripts/generate-release-notes.py --since-tag "" --version v0.1.0
```

### Backfilling
To backfill notes for existing tags, run the script manually for each tag range and edit the GitHub release:
```bash
git tag --sort=-v:refname  # list all tags
# For each tag pair, run the script and update the release manually
```
