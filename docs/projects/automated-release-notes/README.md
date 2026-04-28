---
title: Automated Release Notes in GitHub
status: active
repos: [personal-crm]
started: 2026-04-28
last_updated: 2026-04-28
next_step: pick trigger (tag push vs workflow_dispatch) and tooling (gh CLI script, release-please, semantic-release, or custom action)
---

# Automated Release Notes in GitHub

## Goal
Automate generation and publishing of release notes for personal-crm on GitHub. Collect commit subjects (or conventional-commit groupings) since the previous tag, format them into a release-notes block, and publish via GitHub Releases.

## Tasks
- [ ] Decide release trigger (tag push, workflow_dispatch, or both)
- [ ] Choose tooling (gh CLI + script, release-please, semantic-release, custom Action)
- [ ] Define grouping rules (Features / Fixes / Chores / Breaking)
- [ ] Wire the chosen flow into a GitHub Actions workflow
- [ ] Decide whether to backfill notes for existing tags

## Session Log

### 2026-04-28
- Project scaffolded for tracking — no implementation work yet

## Notes
