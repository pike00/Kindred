# PR Sweep Orchestrator — Resume Prompt

> Paste the block below into a fresh Claude Code session in `~/projects/personal-crm` to pick up where 2026-05-07 left off. Self-contained — no need to remember previous context.

---

## Paste-ready prompt

```
I'm resuming work on the pr-sweep-orchestrator project at ~/projects/personal-crm. Use the project-load skill on slug `pr-sweep-orchestrator` first to verify state hasn't drifted, then continue from where we paused.

State as of last save (2026-05-07):

- 7 of 12 tasks committed locally on `main`, NOT pushed to origin (public repo, awaiting your push approval). Latest commit: 5c88de2 feat(pr-sweep): repair loop with bounded iterations and audit trail. We are 9 commits ahead of origin/main.
- Implementation script: scripts/run-pr-sweep.py (738 lines, md5 d49cbc6770bf52a1fc0553ec52abf7b6 — verify it hasn't been deduped/rewritten by `wc -l` and `md5sum` before continuing).
- Plan: docs/projects/pr-sweep-orchestrator/plan.md
- README: docs/projects/pr-sweep-orchestrator/README.md (project tracker with full session log and task checklist)

Architecture:
- Python orchestrator iterates 43 open draft PRs (`dirac/*` and `worktree-*`)
- Per PR: refresh worktree from origin → merge in main → bring up Docker stack → run gauntlet (precommit/typecheck/pytest/e2e) → on failure ask deepseek-v4-pro-cloud via homelab LiteLLM proxy for a unified-diff patch → apply, re-run, repeat (bounded by MAX_REPAIR_ITERS=3 per gate, MAX_TOTAL_ITERS=8 overall) → on green: commit auto-repairs, push --force-with-lease, gh pr ready
- Stops at "ready for review" — never auto-merges
- LiteLLM proxy at http://127.0.0.1:4000 (loopback only on ares); virtual key in gitignored .env (LITELLM_API_KEY, LITELLM_BASE_URL, LITELLM_MODEL)

Three concrete things I want you to know about before doing anything:
1. The local dirac/* branches are stale from the 2026-05-07 filter-repo public-release rewrite — `ensure_worktree` already handles this by hard-resetting to origin SHA when uncommitted-clean, refusing otherwise. Don't try to "fix" the stale-history thing yourself.
2. Compose files reference external networks `kindred-private` and `kindred-internal-crm` which were created on ares as part of last session's infra prep. If running on a different host, recreate via `docker network create kindred-private kindred-internal-crm`.
3. The 9 unpushed commits are the Tasks 1-7 deliverables. Don't push them without my explicit OK — the PR sweep itself does git push --force-with-lease later, but THESE commits are to main on a public repo.

Where we paused:
- Task 8 (disposition: push + gh pr ready, comment on failure) — I rejected the previous subagent dispatch because the smoke test would have force-pushed to PR #48 (public). Need to decide: dry-run-only commit + defer real push to Task 11, or authorize the dispatch to actually exercise --push end-to-end on PR #48.

Three open concerns from Task 7's first real LLM-driven repair on PR #48:
- LLM-reply isn't being saved to the audit trail — only the prompt. When extract_diff returns None we have no diagnostic. Worth fixing in the script before any large run.
- LLM declined repair on a `prek` precommit failure (3 ruff-format files). Need to inspect prompt and tune it. The saved prompt is at .pr-sweep-runner/prompts/48/iter-01-precommit.txt.
- Wall-clock estimate per PR worst case = 30-90 min (8 iterations × 4 gates with Docker overhead). 50 PRs = 25-75 hours sequential.

Please:
1. Run project-load to verify state.
2. Run `wc -l scripts/run-pr-sweep.py && md5sum scripts/run-pr-sweep.py` to confirm script integrity.
3. Run `git log --oneline origin/main..HEAD` to confirm the 9 unpushed commits are intact.
4. Then ask me whether to (a) proceed with Task 8 dry-run only, (b) authorize Task 8 with --push on PR #48 to validate end-to-end, (c) detour to fix the LLM-reply audit-trail gap first, or (d) something else.

Do NOT push anything to origin without explicit authorization. Do NOT run `gh pr ready`, `gh pr merge`, or any push to a dirac/* branch without explicit authorization. Do NOT run `git reset --hard`, `git clean`, or `rm -rf` against anything outside .pr-sweep-runner/ and .worktrees/sweep-*.
```

---

## Context bookkeeping (for me, not for the prompt)

- Last commit: `5c88de2` (Task 7)
- Tasks remaining: 8 (disposition), 9 (driver+state+MM), 10 (single-PR e2e), 11 (5-PR batch + tune), 12 (full 50-PR run)
- Critical fix to consider before Task 11: save LLM replies alongside prompts (currently only prompts are saved → diagnostic blind spot when `extract_diff` returns None)
- Mattermost webhook file `.pr-sweep-runner/mm-webhook` not yet created (Task 9 will reuse `.dirac-runner/mm-webhook` if present)
- LiteLLM proxy on ares is loopback-only; if running orchestrator from willbook, set up `ssh -L 4000:127.0.0.1:4000 ares` and override `LITELLM_BASE_URL`
