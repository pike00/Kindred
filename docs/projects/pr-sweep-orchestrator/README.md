---
title: PR Sweep Orchestrator
status: active
repos: [personal-crm]
started: 2026-05-07
last_updated: 2026-05-07
next_step: Implement Task 1 (project scaffolding + auth bootstrap)
---

# PR Sweep Orchestrator

## Goal

Land the 50 open `[dirac]` draft PRs on this repo by iterating through them sequentially: rebase against `main`, run the sanity gauntlet (pre-commit / typecheck / pytest / e2e), hand each failure to **DeepSeek-V4-Pro on Ollama Cloud** for repair, retry until green, then `git push --force-with-lease` and `gh pr ready`. Stop short of merging — humans review the ready queue.

## Why this shape

- **LLM as code-doctor, not agent.** The Python script is the agent; the LLM is a pure text-in/text-out repair function (failure log + diff → unified patch). No tool use, no MCP, no ReAct loop. Vastly simpler than wiring Ollama Cloud into an agent harness, and exactly what's needed.
- **Sequential.** Two PRs can't share loopback ports 5173/8001, and ares can't reasonably run 2× full Docker stacks at once.
- **Mirrors `scripts/run-dirac-projects.sh`.** Same state-file shape, same Mattermost notification pattern, same `.dirac-runner/`-style log layout, same resumable semantics. If the dirac runner pattern works for generating PRs, the same skeleton works for landing them.
- **Stops at "ready for review".** Auto-merge is rejected — landing 50 unreviewed feature additions (carddav-server, voice-to-text, twilio webhooks, organizations-as-first-class) would be reckless on a personal CRM. The human reviews the queue.

## Tasks

- [ ] Project scaffolding + state dir + Ollama Cloud auth (Task 1)
- [ ] PR discovery + filtering (Task 2)
- [ ] Worktree management + branch checkout (Task 3)
- [ ] Rebase handler with LLM conflict-resolution fallback (Task 4)
- [ ] Sanity gauntlet runner — pre-commit, typecheck, pytest, e2e (Task 5)
- [ ] Ollama Cloud client + repair-prompt construction (Task 6)
- [ ] Repair loop — apply patch, re-run cheapest-first, cap iterations (Task 7)
- [ ] Disposition — push, mark ready, comment on failure (Task 8)
- [ ] Top-level driver + Mattermost integration + summary (Task 9)
- [ ] Smoke-test against one mergeable PR (Task 10)
- [ ] First batch run against 5 PRs, observe, tune prompts (Task 11)
- [ ] Run against the remaining queue (Task 12)

See [plan.md](plan.md) for the full implementation steps.

## Session Log

### 2026-05-07
- Project created. Plan drafted via `writing-plans` skill.
- Decision: stop at `gh pr ready`, no auto-merge.
- Decision: `deepseek-v4-pro` on Ollama Cloud (direct, not via the homelab LiteLLM proxy).
- Decision: Python `uv`-inline single-file script under `scripts/run-pr-sweep.py`, mirroring shape of `scripts/run-dirac-projects.sh`.

## Notes

- **PR landscape (snapshot 2026-05-07):** 50 open draft PRs branched as `dirac/<slug>` or `worktree-<slug>`. ~25 are `MERGEABLE`, ~25 are `CONFLICTING`. Most fail `pre-commit` and `test-backend` GHA checks. All authored by the dirac runner with `--no-verify` on commits.
- **Existing dirac worktrees** at `.worktrees/dirac-<slug>/` may be reusable — skip re-creating where a worktree already exists for the branch.
- **E2E gate** at [scripts/run-e2e-prepush.sh](../../../scripts/run-e2e-prepush.sh) brings up `compose.dev.yml + compose.dev.override.yml` on loopback ports 8001/5173 and runs 9 puppeteer specs. Reuse as-is from inside each worktree.
- **Loopback port conflict** = the orchestrator must `just down-clean` between PRs (or rely on `--force-recreate` to swap stacks). Tear down between every PR.
- **Pre-commit hooks** are managed by `prek` (see `just install-hooks`). Run `prek run --all-files` to surface what's broken.
- **Backend tests** via `just pytest -x -q` (runs inside the worktree's backend container).
- **Frontend typecheck** via `docker compose -f compose.worktree.yml exec -T frontend bun run typecheck` from the worktree root.
- **Auth:** `OLLAMA_API_KEY` lives in `.env.sops`. Surface via `just env`.
- **Mattermost:** webhook URL stored in `.dirac-runner/mm-webhook` — reuse the same file (or a parallel `.pr-sweep-runner/mm-webhook`).
- **Output layout** under `.pr-sweep-runner/`:
  - `state.json` — per-PR outcome map (resumable)
  - `logs/<pr_number>.log` — full per-PR runner output
  - `patches/<pr_number>/iter-N.diff` — every patch the LLM proposed (audit trail)
  - `prompts/<pr_number>/iter-N.txt` — every prompt sent (audit trail)
  - `runner.log` — top-level driver log

## Out of scope

- Auto-merging into `main` (deliberately).
- Running PRs concurrently (port conflicts; ares load).
- Re-authoring the PR if it's structurally broken (e.g. wrong feature, missing migration scaffold). The LLM only patches surface failures; if a PR can't be brought green in N iterations, it's flagged and skipped.
- Replacing `dirac/` for net-new PR generation (that's a separate workflow).
