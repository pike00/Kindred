---
title: PR Sweep Orchestrator
status: active
repos: [personal-crm]
started: 2026-05-07
last_updated: 2026-05-07
next_step: Resume Task 8 (disposition — push + gh pr ready, comment on failure). Paused for user authorization on --push to public PRs.
progress: 7/12
---

# PR Sweep Orchestrator

## Goal

Land the 50 open `[dirac]` draft PRs on this repo by iterating through them sequentially: rebase against `main`, run the sanity gauntlet (pre-commit / typecheck / pytest / e2e), hand each failure to **`deepseek-v4-pro-cloud` via the homelab LiteLLM proxy** for repair, retry until green, then `git push --force-with-lease` and `gh pr ready`. Stop short of merging — humans review the ready queue.

## Why this shape

- **LLM as code-doctor, not agent.** The Python script is the agent; the LLM is a pure text-in/text-out repair function (failure log + diff → unified patch). No tool use, no MCP, no ReAct loop. Vastly simpler than wiring Ollama Cloud into an agent harness, and exactly what's needed.
- **Sequential.** Two PRs can't share loopback ports 5173/8001, and ares can't reasonably run 2× full Docker stacks at once.
- **Mirrors `scripts/run-dirac-projects.sh`.** Same state-file shape, same Mattermost notification pattern, same `.dirac-runner/`-style log layout, same resumable semantics. If the dirac runner pattern works for generating PRs, the same skeleton works for landing them.
- **Stops at "ready for review".** Auto-merge is rejected — landing 50 unreviewed feature additions (carddav-server, voice-to-text, twilio webhooks, organizations-as-first-class) would be reckless on a personal CRM. The human reviews the queue.

## Tasks

- [x] Project scaffolding + state dir + Ollama Cloud auth (Task 1) — `575f142`
- [x] PR discovery + filtering (Task 2) — `f749525`
- [x] Worktree management + branch checkout (Task 3) — `6657746`
- [x] Rebase handler with LLM conflict-resolution fallback (Task 4) — `7be0fb8` + `c4c4b5a` (revised: rebase → merge)
- [x] Sanity gauntlet runner — pre-commit, typecheck, pytest, e2e (Task 5) — `7fa3f93`
- [x] Ollama Cloud client + repair-prompt construction (Task 6) — `1c8b949` (LiteLLM proxy, not direct)
- [x] Repair loop — apply patch, re-run cheapest-first, cap iterations (Task 7) — `5c88de2`
- [ ] Disposition — push, mark ready, comment on failure (Task 8) — paused, needs `--push` authorization
- [ ] Top-level driver + Mattermost integration + summary (Task 9)
- [ ] Smoke-test against one mergeable PR (Task 10)
- [ ] First batch run against 5 PRs, observe, tune prompts (Task 11)
- [ ] Run against the remaining queue (Task 12)

See [plan.md](plan.md) for the full implementation steps.

## Session Log

### 2026-05-07
- Project created. Plan drafted via `writing-plans` skill.
- Tasks 1–7 of 12 committed in one session (575f142 → 5c88de2). Script at `scripts/run-pr-sweep.py` is 738 lines, md5 `d49cbc6770bf52a1fc0553ec52abf7b6`, intact.
- **Auth:** minted LiteLLM virtual key (alias `personal-crm-pr-sweep-v2`), allowlisted to `deepseek-v4-pro-cloud` + flash/glm5/kimi fallbacks. Stored in gitignored `.env`. Smoke-test pong came back 200 OK in 42 tokens.
- **Discovery:** finds 43 draft PRs (`dirac/*` + `worktree-*`), MERGEABLE-first sort.
- **Strategy revision (Task 4):** rebase → merge. PRs have merge commits in their history, so rebase conflicts where merge wouldn't. Switched to `git merge origin/main --no-edit`, mirroring GitHub's "Update branch" button.
- **Worktree refresh:** local dirac branches were stale from the 2026-05-07 filter-repo public-release rewrite (different root commit from current main → `unrelated histories` error). `ensure_worktree` now fetches origin first and hard-resets stale clean worktrees to `origin/<head_ref>`. Refuses if uncommitted work is present.
- **Sanity gauntlet:** four gates (precommit/typecheck/pytest/e2e), cheapest-first, stop at first failure. Smoke-tested on PR #48 — precommit failed in 12s on 3 ruff-format files, stack torn down via `finally`.
- **LLM client:** `litellm_chat()` against `http://127.0.0.1:4000/v1/chat/completions`. Strict prompt format (single fenced `diff` block OR `DECLINE: <reason>`).
- **Repair loop:** `MAX_REPAIR_ITERS=3` per gate, `MAX_TOTAL_ITERS=8` overall. On green re-check, restart full gauntlet from cheapest. Audit trail: every prompt + patch saved to `.pr-sweep-runner/{prompts,patches}/<pr>/`.
- **Task 7 first real LLM run on PR #48:** LLM declined repair (returned reply but `extract_diff` got None — likely DECLINE or non-fenced text). 1m45s for one failed cycle. Worst-case wall-clock revised to 30–90 min/PR (50 PRs = 25–75 hours).
- **Infra prep on ares:** pruned 9 orphan `crm-dirac-*_default` networks (Docker pool exhaustion at 55 networks), created `kindred-private` and `kindred-internal-crm` bridges (compose declares them external; were missing).
- **Paused at Task 8.** Subagent dispatch rejected by user — Task 8's `--push` step would force-push to a public PR + flip its draft status, needs explicit authorization.

## Notes

### 2026-05-07
- **Decisions:** rebase → merge; LiteLLM proxy (not direct Ollama Cloud); stop at `gh pr ready` (no auto-merge); single-file Python orchestrator mirroring `run-dirac-projects.sh`.
- **Gotchas:** stale local dirac/* refs from filter-repo rewrite (handled by ensure_worktree refresh); `gh pr list` cold-cache UNKNOWN mergeable; LLM-reply not saved to audit trail (only prompt) — diagnostic blind spot when extract_diff returns None.
- **Issues:** Task 8 push step needs explicit user approval per PR or batch; LLM declined repair on first real PR (#48 precommit), root cause unknown without saved reply; pre-existing dirty state in some dirac worktrees aborts merge — needs auto-cleanup or manual sweep.
- **Accomplished:** 7/12 tasks committed. Script intact (`d49cbc6770bf52a1fc0553ec52abf7b6`). Auth wired. Repair loop end-to-end demonstrated on PR #48 (loop ran cleanly, exited red, audit trail captured).
- **Resume prompt** for the next session: see [RESUME.md](RESUME.md) — paste-ready.

- **PR landscape (snapshot 2026-05-07):** 50 open draft PRs branched as `dirac/<slug>` or `worktree-<slug>`. ~25 are `MERGEABLE`, ~25 are `CONFLICTING`. Most fail `pre-commit` and `test-backend` GHA checks. All authored by the dirac runner with `--no-verify` on commits.
- **Existing dirac worktrees** at `.worktrees/dirac-<slug>/` may be reusable — skip re-creating where a worktree already exists for the branch.
- **E2E gate** at [scripts/run-e2e-prepush.sh](../../../scripts/run-e2e-prepush.sh) brings up `compose.dev.yml + compose.dev.override.yml` on loopback ports 8001/5173 and runs 9 puppeteer specs. Reuse as-is from inside each worktree.
- **Loopback port conflict** = the orchestrator must `just down-clean` between PRs (or rely on `--force-recreate` to swap stacks). Tear down between every PR.
- **Pre-commit hooks** are managed by `prek` (see `just install-hooks`). Run `prek run --all-files` to surface what's broken.
- **Backend tests** via `just pytest -x -q` (runs inside the worktree's backend container).
- **Frontend typecheck** via `docker compose -f compose.worktree.yml exec -T frontend bun run typecheck` from the worktree root.
- **Auth:** `LITELLM_API_KEY` (virtual key, alias `personal-crm-pr-sweep-v2`) lives in gitignored `.env`. Allowlist: `deepseek-v4-pro-cloud`, `deepseek-v4-flash-cloud`, `glm-5-cloud`, `kimi-k2.6-cloud` (built-in fallback chain). Cost = $0/token (subscription tier). Re-mint via `~/Documents/Homelab` recipe in plan Task 1 Step 3 if the key is lost.
- **Runtime location:** the script needs network reach to the LiteLLM proxy at `127.0.0.1:4000`, which is bound loopback-only on ares. Either run the orchestrator on ares, or set up an SSH tunnel (`ssh -L 4000:127.0.0.1:4000 ares`) and override `LITELLM_BASE_URL`.
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
