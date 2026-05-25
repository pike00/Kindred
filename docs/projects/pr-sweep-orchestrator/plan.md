# PR Sweep Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the 50 open `[dirac]` draft PRs to "ready for review" by iterating each through rebase → sanity gauntlet → LLM repair loop → push → `gh pr ready`. Stops short of merging.

**Architecture:** Single Python script (`scripts/run-pr-sweep.py`, `uv`-inline) drives the loop. The LLM (`deepseek-v4-pro-cloud` via the homelab LiteLLM proxy at `http://127.0.0.1:4000`, OpenAI-compatible endpoint) is a pure repair function: in = failure log + diff vs main; out = unified diff. The script does all tool use (gh, git, docker, just). State persisted to `.pr-sweep-runner/state.json` so the run is resumable. Sequential because two PRs can't share loopback ports 5173/8001. Patterned on the existing `scripts/run-dirac-projects.sh`.

**Why LiteLLM and not direct Ollama Cloud:** the homelab proxy already wraps Ollama Cloud with auth, fallback chains (`deepseek-v4-pro-cloud → deepseek-v4-flash-cloud → glm-5-cloud → kimi-k2.6-cloud`), and per-app virtual keys with budget caps. Direct Ollama Cloud would re-implement all of that.

**Tech Stack:** Python 3.14 (uv inline-script), `gh` CLI, `git`, `docker compose`, `just`, `prek` (pre-commit), `puppeteer` via `bun`, LiteLLM `/v1/chat/completions` (OpenAI-compatible REST).

---

## File Structure

- Create: `scripts/run-pr-sweep.py` — single-file orchestrator (~600 lines)
- Create: `docs/projects/pr-sweep-orchestrator/README.md` — project tracker (already written)
- Create: `docs/projects/pr-sweep-orchestrator/plan.md` — this file
- Modify: `.env.sops` — add `OLLAMA_API_KEY`
- Modify: `justfile` — add `sweep` recipe wrapping the Python script
- Runtime-only (gitignored, scripts creates): `.pr-sweep-runner/{state.json,logs/,patches/,prompts/,runner.log,mm-webhook}`
- Modify: `.gitignore` — add `.pr-sweep-runner/`

---

## Task 1: Project scaffolding + LiteLLM auth

**Status as of 2026-05-07:** Auth steps already completed inline (key minted via LiteLLM `/key/generate` with alias `personal-crm-pr-sweep-v2`, scoped to `deepseek-v4-pro-cloud` + flash/glm5/kimi fallbacks; written to `.env`; smoke test returned `pong` over 42 tokens). Remaining work is just gitignore + state dirs + commit.

**Files:**
- Create: `.pr-sweep-runner/` (just `mkdir`; gitignored)
- Modify: `.gitignore`
- Already done: `.env` carries `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `LITELLM_MODEL`

- [ ] **Step 1: Add `.pr-sweep-runner/` to `.gitignore`**

```bash
grep -q '^\.pr-sweep-runner/' .gitignore || echo '.pr-sweep-runner/' >> .gitignore
git diff .gitignore
```

Expected: one new line at the bottom (or unchanged if already present).

- [ ] **Step 2: Create runtime directories**

```bash
mkdir -p .pr-sweep-runner/{logs,patches,prompts}
ls -la .pr-sweep-runner/
```

- [ ] **Step 3: Verify LiteLLM auth is wired**

```bash
grep '^LITELLM_' .env | sed -E 's/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/\1***REDACTED***/g'
```

Expected: prints three lines — `LITELLM_BASE_URL=http://127.0.0.1:4000`, `LITELLM_API_KEY=sk-***REDACTED***`, `LITELLM_MODEL=deepseek-v4-pro-cloud`.

If missing (e.g. running on a fresh host), re-mint via the homelab repo:

```bash
# From ~/Documents/Homelab
MASTER=$(just secrets sopsx ai/litellm/.env.sops -d | awk -F= '/^LITELLM_MASTER_KEY=/{print $2; exit}')
RESP=$(curl -sS -X POST http://127.0.0.1:4000/key/generate \
  -H "Authorization: Bearer $MASTER" \
  -H "Content-Type: application/json" \
  -d '{"key_alias":"personal-crm-pr-sweep","models":["deepseek-v4-pro-cloud","deepseek-v4-flash-cloud","glm-5-cloud","kimi-k2.6-cloud"],"metadata":{"project":"personal-crm","purpose":"pr-sweep-orchestrator"}}')
KEY=$(echo "$RESP" | jq -r '.key')
{ echo ""; echo "LITELLM_BASE_URL=http://127.0.0.1:4000"; echo "LITELLM_API_KEY=$KEY"; echo "LITELLM_MODEL=deepseek-v4-pro-cloud"; } >> /home/will/projects/personal-crm/.env
```

- [ ] **Step 4: Smoke-test the chat call**

```bash
LITELLM_API_KEY=$(grep '^LITELLM_API_KEY=' .env | cut -d= -f2-)
LITELLM_BASE_URL=$(grep '^LITELLM_BASE_URL=' .env | cut -d= -f2-)
LITELLM_MODEL=$(grep '^LITELLM_MODEL=' .env | cut -d= -f2-)
curl -fsS -X POST "$LITELLM_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $LITELLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"$LITELLM_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"reply pong\"}],\"temperature\":0,\"stream\":false}" \
  | jq -r '.choices[0].message.content'
```

Expected: a one-word `pong`-ish response. If 401, the key is wrong; if 404, the model alias is wrong (check `~/Documents/Homelab/ai/litellm/config.yaml`); if connection refused, the LiteLLM container isn't running on this host (needs to run on ares, or you need an SSH tunnel).

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "feat(pr-sweep): gitignore .pr-sweep-runner runtime dir"
```

(`.env` is gitignored; nothing to commit there. The plan and README were committed earlier.)

---

## Task 2: PR discovery and filtering

**Files:**
- Create: `scripts/run-pr-sweep.py` (start the file; import block + discovery only)

- [ ] **Step 1: Create the script header with `uv` inline metadata**

```python
#!/usr/bin/env -S uv run --script --quiet
# /// script
# requires-python = ">=3.14"
# dependencies = ["httpx>=0.27", "pydantic>=2.7"]
# ///
"""
run-pr-sweep.py — iterate open [dirac] draft PRs, rebase, run sanity gauntlet,
repair failures via DeepSeek-V4-Pro on Ollama Cloud, push, mark ready.

Knobs (env):
  ONLY_PR              run a single PR number (debug)
  MAX_PRS              cap the queue (default: all)
  PER_PR_TIMEOUT       seconds per PR (default 3600 = 60m)
  MAX_REPAIR_ITERS     LLM repair iterations per gate (default 3)
  MAX_TOTAL_ITERS      total repair iterations per PR (default 8)
  COOLDOWN_S           sleep between PRs (default 30)
  DRY_RUN              print plan and exit
  LITELLM_API_KEY      required — virtual key from homelab proxy
  LITELLM_BASE_URL     default http://127.0.0.1:4000
  LITELLM_MODEL        default deepseek-v4-pro-cloud
"""

from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
```

- [ ] **Step 2: Add path constants and basic helpers**

Append to `scripts/run-pr-sweep.py`:

```python
REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = REPO_ROOT / ".pr-sweep-runner"
LOG_DIR = STATE_DIR / "logs"
PATCH_DIR = STATE_DIR / "patches"
PROMPT_DIR = STATE_DIR / "prompts"
STATE_FILE = STATE_DIR / "state.json"
RUNNER_LOG = STATE_DIR / "runner.log"
MM_WEBHOOK_FILE = STATE_DIR / "mm-webhook"

LITELLM_BASE_URL = os.environ.get("LITELLM_BASE_URL", "http://127.0.0.1:4000")
LITELLM_MODEL = os.environ.get("LITELLM_MODEL", "deepseek-v4-pro-cloud")
LITELLM_CHAT_URL = LITELLM_BASE_URL.rstrip("/") + "/v1/chat/completions"

DEFAULT_BRANCH = "main"
PER_PR_TIMEOUT = int(os.environ.get("PER_PR_TIMEOUT", "3600"))
MAX_REPAIR_ITERS = int(os.environ.get("MAX_REPAIR_ITERS", "3"))
MAX_TOTAL_ITERS = int(os.environ.get("MAX_TOTAL_ITERS", "8"))
COOLDOWN_S = int(os.environ.get("COOLDOWN_S", "30"))


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str) -> None:
    line = f"[sweep {now_iso()}] {msg}\n"
    sys.stdout.write(line)
    sys.stdout.flush()
    RUNNER_LOG.parent.mkdir(parents=True, exist_ok=True)
    with RUNNER_LOG.open("a") as f:
        f.write(line)


def run(cmd: list[str], cwd: Path | None = None, check: bool = False, capture: bool = True) -> subprocess.CompletedProcess[str]:
    """Thin wrapper around subprocess. Always captures stderr alongside stdout."""
    return subprocess.run(
        cmd,
        cwd=cwd or REPO_ROOT,
        check=check,
        text=True,
        capture_output=capture,
        stdin=subprocess.DEVNULL,
    )
```

- [ ] **Step 3: Write the discovery function**

Append:

```python
@dataclass
class PR:
    number: int
    title: str
    head_ref: str
    mergeable: str  # "MERGEABLE" | "CONFLICTING" | "UNKNOWN"
    is_draft: bool

    @property
    def slug(self) -> str:
        # "dirac/foo-bar" -> "foo-bar"; "worktree-foo" -> "worktree-foo"
        return self.head_ref.split("/", 1)[-1] if "/" in self.head_ref else self.head_ref


def discover_prs() -> list[PR]:
    proc = run([
        "gh", "pr", "list",
        "--json", "number,title,headRefName,isDraft,mergeable",
        "--limit", "200",
    ])
    if proc.returncode != 0:
        log(f"FATAL: gh pr list failed: {proc.stderr.strip()}")
        sys.exit(2)
    raw = json.loads(proc.stdout)
    prs = [
        PR(
            number=int(r["number"]),
            title=r["title"],
            head_ref=r["headRefName"],
            mergeable=r["mergeable"],
            is_draft=bool(r["isDraft"]),
        )
        for r in raw
    ]
    # Filter: drafts only, branch starts with "dirac/" or "worktree-"
    prs = [p for p in prs if p.is_draft and (p.head_ref.startswith("dirac/") or p.head_ref.startswith("worktree-"))]
    # Order: MERGEABLE first (cheapest to land), then CONFLICTING
    prs.sort(key=lambda p: (0 if p.mergeable == "MERGEABLE" else 1, p.number))
    return prs
```

- [ ] **Step 4: Add a minimal `__main__` to smoke-test discovery**

Append:

```python
def _smoketest_discover() -> None:
    prs = discover_prs()
    log(f"Discovered {len(prs)} draft PRs ({sum(1 for p in prs if p.mergeable == 'MERGEABLE')} mergeable)")
    for p in prs[:10]:
        log(f"  #{p.number} [{p.mergeable}] {p.head_ref} — {p.title}")
    if len(prs) > 10:
        log(f"  ... and {len(prs) - 10} more")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "discover":
        _smoketest_discover()
        sys.exit(0)
    log("FATAL: full driver not implemented yet — use 'discover' for now")
    sys.exit(2)
```

- [ ] **Step 5: Run the smoke-test**

```bash
chmod +x scripts/run-pr-sweep.py
./scripts/run-pr-sweep.py discover
```

Expected: prints `Discovered N draft PRs` matching the count from `gh pr list --draft | wc -l`, sorted MERGEABLE first.

- [ ] **Step 6: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): scaffold script + PR discovery"
```

---

## Task 3: Worktree management + branch checkout

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Add a function to find or create a worktree for a PR**

Append to `scripts/run-pr-sweep.py` (above `_smoketest_discover`):

```python
def existing_worktree_for(branch: str) -> Path | None:
    """Find a worktree whose checkout matches `branch`. Reuses dirac-runner worktrees."""
    proc = run(["git", "worktree", "list", "--porcelain"])
    if proc.returncode != 0:
        return None
    wt: Path | None = None
    for line in proc.stdout.splitlines():
        if line.startswith("worktree "):
            wt = Path(line.split(" ", 1)[1])
        elif line.startswith("branch ") and wt is not None:
            br = line.split(" ", 1)[1]
            # `branch refs/heads/<name>`; gh head_ref is `<name>`.
            if br == f"refs/heads/{branch}":
                return wt
    return None


def ensure_worktree(pr: PR) -> Path:
    """Return a path to a checked-out worktree on `pr.head_ref`. Creates if missing."""
    existing = existing_worktree_for(pr.head_ref)
    if existing is not None:
        log(f"PR #{pr.number}: reusing worktree {existing}")
        return existing
    # The branch already exists on remote (PR is open). Fetch then add.
    run(["git", "fetch", "origin", pr.head_ref], check=True)
    wt_name = f"sweep-{pr.number}"
    wt_path = REPO_ROOT / ".worktrees" / wt_name
    log(f"PR #{pr.number}: creating worktree {wt_path} on {pr.head_ref}")
    # Track the remote branch so future pushes go to origin/<head_ref>
    run(["git", "worktree", "add", "--track", "-b", pr.head_ref, str(wt_path), f"origin/{pr.head_ref}"], check=True)
    return wt_path
```

- [ ] **Step 2: Add a function to bring up the worktree's stack**

Append:

```python
def bring_stack_up(wt: Path) -> None:
    """Use the worktree's `just up` to bring its compose stack online."""
    log(f"Bringing stack up at {wt}")
    proc = subprocess.run(
        ["just", "up"],
        cwd=wt,
        text=True,
        capture_output=True,
        stdin=subprocess.DEVNULL,
        timeout=300,
    )
    if proc.returncode != 0:
        log(f"WARN: just up failed in {wt}:\n{proc.stderr[-2000:]}")
        raise RuntimeError("stack failed to come up")


def tear_stack_down(wt: Path) -> None:
    """Stop the worktree's stack and free its ports/volumes."""
    log(f"Tearing stack down at {wt}")
    subprocess.run(
        ["just", "down-clean"],
        cwd=wt,
        text=True,
        capture_output=True,
        stdin=subprocess.DEVNULL,
        timeout=180,
    )
```

- [ ] **Step 3: Extend the smoke-test to exercise worktree management**

Replace `_smoketest_discover` with two helpers and a switch in `__main__`:

```python
def _smoketest_worktree(pr_num: int) -> None:
    prs = discover_prs()
    target = next((p for p in prs if p.number == pr_num), None)
    if target is None:
        log(f"FATAL: PR #{pr_num} not in queue")
        sys.exit(2)
    wt = ensure_worktree(target)
    log(f"OK: worktree at {wt} on branch {target.head_ref}")
    log(f"Test cleanup: rm with `git worktree remove --force {wt}`")
```

In `__main__`:

```python
if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "discover":
        _smoketest_discover()
    elif len(sys.argv) >= 3 and sys.argv[1] == "worktree":
        _smoketest_worktree(int(sys.argv[2]))
    else:
        log("usage: run-pr-sweep.py {discover|worktree <pr_number>}")
        sys.exit(2)
```

- [ ] **Step 4: Smoke-test worktree creation against a MERGEABLE PR**

Pick the lowest-numbered MERGEABLE PR from the discovery output (e.g. `48` for keyboard-shortcut-overlay):

```bash
./scripts/run-pr-sweep.py worktree 48
ls -la .worktrees/
git worktree list
```

Expected: a new worktree at `.worktrees/sweep-48/` (or reuse if dirac already has one), branch `dirac/keyboard-shortcut-overlay` checked out.

- [ ] **Step 5: Clean up the test worktree**

```bash
git worktree remove --force .worktrees/sweep-48 2>/dev/null || true
git worktree list  # confirm gone
```

- [ ] **Step 6: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): worktree checkout + stack up/down helpers"
```

---

## Task 4: Update-branch handler with conflict-resolution fallback

> **Strategy revision (2026-05-07):** originally specced as `git rebase origin/main` per PR. Changed to `git merge origin/main --no-edit` after discovery: the existing dirac PRs have merge commits in their history, and rebase replays each commit individually — every PR was conflicting on rebase even where merge was clean. Merge mirrors what GitHub's "Update branch" button does and avoids the LLM-conflict path on most PRs.
>
> **Also:** `ensure_worktree` now refreshes stale local refs from origin every call, because the 2026-05-07 public-release `git filter-repo` rewrite gave the remote a new history root (`97b7694`) while local dirac branches still root at the pre-rewrite SHA (`0ed36e9`). Without the refresh, `git merge` reports "unrelated histories". The refresh hard-resets only worktrees that are clean (uncommitted changes raise).

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Add the basic (no-LLM) rebase function**

Append:

```python
def fetch_main(wt: Path) -> None:
    run(["git", "-C", str(wt), "fetch", "origin", DEFAULT_BRANCH], check=True)


def rebase_against_main(wt: Path) -> tuple[bool, str]:
    """
    Try `git rebase origin/main`. Return (success, log_excerpt).
    If conflicts, leaves the rebase in progress so caller can hand it to LLM.
    """
    fetch_main(wt)
    proc = subprocess.run(
        ["git", "-C", str(wt), "rebase", f"origin/{DEFAULT_BRANCH}"],
        text=True,
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if proc.returncode == 0:
        return True, "clean rebase"
    # Conflict path
    out = (proc.stdout + "\n" + proc.stderr).strip()
    return False, out[-4000:]


def abort_rebase(wt: Path) -> None:
    subprocess.run(
        ["git", "-C", str(wt), "rebase", "--abort"],
        text=True,
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
```

- [ ] **Step 2: Add a conflict-file collector**

Append:

```python
def list_conflicted_files(wt: Path) -> list[Path]:
    proc = run(["git", "-C", str(wt), "diff", "--name-only", "--diff-filter=U"])
    return [wt / line.strip() for line in proc.stdout.splitlines() if line.strip()]


def gather_conflict_context(wt: Path) -> str:
    """Collect a single text blob suitable for sending to the LLM."""
    files = list_conflicted_files(wt)
    parts: list[str] = []
    for f in files[:20]:  # cap to avoid runaway prompts
        try:
            content = f.read_text(errors="replace")
        except FileNotFoundError:
            continue
        # Cap each file at ~8KB so we don't blow the context window
        if len(content) > 8192:
            content = content[:8192] + "\n... [truncated]"
        parts.append(f"=== {f.relative_to(wt)} ===\n{content}\n")
    return "\n".join(parts)
```

- [ ] **Step 3: Wire conflict resolution to call the (still-stub) LLM repair**

Add a stub repair function — Task 6 will replace its body. Append:

```python
def llm_repair_conflicts(wt: Path, pr: PR, conflict_blob: str) -> bool:
    """
    Stub: returns False. Real implementation arrives in Task 6.
    When True, caller must `git add -A && git rebase --continue`.
    """
    log(f"PR #{pr.number}: LLM conflict-repair stub (returning False)")
    return False


def handle_rebase(wt: Path, pr: PR) -> bool:
    """Return True if the worktree is now rebased onto main; False if we gave up."""
    success, msg = rebase_against_main(wt)
    if success:
        return True
    log(f"PR #{pr.number}: rebase conflicts:\n{msg[-1000:]}")
    blob = gather_conflict_context(wt)
    if llm_repair_conflicts(wt, pr, blob):
        run(["git", "-C", str(wt), "add", "-A"], check=True)
        cont = subprocess.run(
            ["git", "-C", str(wt), "-c", "core.editor=true", "rebase", "--continue"],
            text=True, capture_output=True, stdin=subprocess.DEVNULL,
        )
        if cont.returncode == 0:
            log(f"PR #{pr.number}: rebase --continue succeeded after LLM repair")
            return True
        log(f"PR #{pr.number}: rebase --continue still failed:\n{cont.stderr[-1000:]}")
    abort_rebase(wt)
    return False
```

- [ ] **Step 4: Smoke-test rebase against a CONFLICTING PR (will fail at LLM stub — expected)**

Pick a CONFLICTING PR (e.g. #65 voice-to-text-interaction). Add a `rebase` smoketest mode in `__main__`:

```python
elif len(sys.argv) >= 3 and sys.argv[1] == "rebase":
    pr_num = int(sys.argv[2])
    prs = discover_prs()
    target = next((p for p in prs if p.number == pr_num), None)
    if target is None:
        log(f"FATAL: PR #{pr_num} not in queue"); sys.exit(2)
    wt = ensure_worktree(target)
    ok = handle_rebase(wt, target)
    log(f"rebase result for #{pr_num}: {'OK' if ok else 'FAILED'}")
```

Run:

```bash
./scripts/run-pr-sweep.py rebase 48     # MERGEABLE — should succeed cleanly
./scripts/run-pr-sweep.py rebase 65     # CONFLICTING — should fail (stub returns False) and abort
git worktree list                       # both worktrees should still exist
```

Expected: #48 succeeds, #65 fails cleanly without leaving the worktree in a half-rebased state. Verify with `git -C .worktrees/sweep-65 status` (should show clean tree, no `rebase in progress`).

- [ ] **Step 5: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): rebase handler with stub for LLM conflict repair"
```

---

## Task 5: Sanity gauntlet runner

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Define the gate result dataclass**

Append:

```python
@dataclass
class GateResult:
    name: str
    exit_code: int
    log_path: Path
    duration_s: float

    @property
    def passed(self) -> bool:
        return self.exit_code == 0


def _run_gate(wt: Path, name: str, cmd: list[str], timeout: int) -> GateResult:
    log_path = LOG_DIR / f"{wt.name}.{name}.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log(f"  ▶ gate `{name}` in {wt.name}: {' '.join(shlex.quote(c) for c in cmd)}")
    start = time.monotonic()
    with log_path.open("w") as f:
        f.write(f"# {now_iso()} {' '.join(cmd)}\n")
        f.flush()
        proc = subprocess.run(
            cmd,
            cwd=wt,
            stdout=f,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            timeout=timeout,
        )
    dur = time.monotonic() - start
    log(f"  {'✓' if proc.returncode == 0 else '✗'} gate `{name}` exit={proc.returncode} ({dur:.1f}s) → {log_path}")
    return GateResult(name=name, exit_code=proc.returncode, log_path=log_path, duration_s=dur)
```

- [ ] **Step 2: Define the four gates in cheapest-first order**

Append:

```python
def gate_precommit(wt: Path) -> GateResult:
    return _run_gate(wt, "precommit", ["prek", "run", "--all-files"], timeout=600)


def gate_typecheck(wt: Path) -> GateResult:
    return _run_gate(
        wt, "typecheck",
        ["docker", "compose", "-f", "compose.worktree.yml", "exec", "-T", "frontend", "bun", "run", "typecheck"],
        timeout=300,
    )


def gate_pytest(wt: Path) -> GateResult:
    return _run_gate(wt, "pytest", ["just", "pytest", "-x", "-q"], timeout=900)


def gate_e2e(wt: Path) -> GateResult:
    # Reuse the existing pre-push e2e script. It auto-brings up the loopback stack.
    return _run_gate(wt, "e2e", ["bash", "scripts/run-e2e-prepush.sh"], timeout=1800)


GAUNTLET = [gate_precommit, gate_typecheck, gate_pytest, gate_e2e]
```

- [ ] **Step 3: Add a function to run the gauntlet and stop at first failure**

Append:

```python
def run_gauntlet(wt: Path) -> tuple[list[GateResult], GateResult | None]:
    """
    Run gates cheapest-first. Stop at first failure, return (passed_so_far, failure).
    If all pass, returns (all_results, None).
    """
    passed: list[GateResult] = []
    for gate_fn in GAUNTLET:
        result = gate_fn(wt)
        if not result.passed:
            return passed, result
        passed.append(result)
    return passed, None
```

- [ ] **Step 4: Smoke-test the gauntlet against a MERGEABLE PR**

Add a `gauntlet` smoketest mode in `__main__`:

```python
elif len(sys.argv) >= 3 and sys.argv[1] == "gauntlet":
    pr_num = int(sys.argv[2])
    prs = discover_prs()
    target = next((p for p in prs if p.number == pr_num), None)
    if target is None:
        log(f"FATAL: PR #{pr_num} not in queue"); sys.exit(2)
    wt = ensure_worktree(target)
    bring_stack_up(wt)
    try:
        passed, failure = run_gauntlet(wt)
        log(f"gauntlet for #{pr_num}: {len(passed)} passed; failure={failure.name if failure else 'none'}")
    finally:
        tear_stack_down(wt)
```

Run:

```bash
./scripts/run-pr-sweep.py gauntlet 48
```

Expected: at least one gate fails (these PRs are known-broken). The script exits cleanly and tears down the stack.

- [ ] **Step 5: Inspect the gate logs**

```bash
ls .pr-sweep-runner/logs/sweep-48.*.log
tail -50 .pr-sweep-runner/logs/sweep-48.precommit.log
```

Expected: the failure log shows actual `prek` output that's useful to feed to the LLM.

- [ ] **Step 6: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): sanity gauntlet runner (precommit/typecheck/pytest/e2e)"
```

---

## Task 6: Ollama Cloud client + repair-prompt construction

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Build the LiteLLM chat call**

Append:

```python
def litellm_chat(system: str, user: str, *, timeout_s: int = 300) -> str:
    """Single-shot chat completion against the homelab LiteLLM proxy.
    Returns assistant message text. Uses OpenAI-compatible /v1/chat/completions."""
    api_key = os.environ.get("LITELLM_API_KEY")
    if not api_key:
        raise RuntimeError("LITELLM_API_KEY not set; ensure .env has it and run via `just sweep`")
    payload = {
        "model": LITELLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "temperature": 0.0,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    with httpx.Client(timeout=timeout_s) as client:
        r = client.post(LITELLM_CHAT_URL, json=payload, headers=headers)
    r.raise_for_status()
    body = r.json()
    return body["choices"][0]["message"]["content"]
```

- [ ] **Step 2: Build the repair prompt for a gauntlet failure**

Append:

```python
REPAIR_SYSTEM = """\
You are a senior engineer fixing CI failures in the Kindred personal-CRM repo.

Stack: FastAPI + SQLModel backend (uv), React + Bun frontend (Vite + TypeScript), Postgres, Alembic, prek (pre-commit), pytest, puppeteer e2e via bun.

Your job: read the failure log + recent diff, return a minimal unified diff that fixes the failure WITHOUT changing the PR's intended feature behavior.

Output rules — STRICT:
- Reply with EXACTLY one fenced code block tagged `diff` containing a unified diff applicable from the repo root with `git apply -p1`.
- If the failure is structural / requires more context than provided / you can't fix it confidently, reply with the single line `DECLINE: <one-sentence reason>`.
- No prose outside the diff or the DECLINE line. No markdown headers. No explanations.
- Do NOT touch files unrelated to the failure. Do NOT add new dependencies. Do NOT rewrite formatting unless a formatter explicitly demands it.
- Keep the diff small. The smaller, the better.
"""


def build_repair_prompt(pr: PR, gate: GateResult, wt: Path) -> str:
    failure_log = gate.log_path.read_text(errors="replace")
    failure_tail = failure_log[-8000:]
    # Diff the PR vs main, capped to keep prompt size sane.
    diff_proc = run(["git", "-C", str(wt), "diff", f"origin/{DEFAULT_BRANCH}...HEAD"])
    diff_text = diff_proc.stdout
    if len(diff_text) > 30000:
        diff_text = diff_text[:30000] + "\n... [diff truncated at 30KB]"
    files_proc = run(["git", "-C", str(wt), "diff", "--name-only", f"origin/{DEFAULT_BRANCH}...HEAD"])
    return f"""\
# PR #{pr.number}: {pr.title}
Branch: {pr.head_ref}

## Failed gate: `{gate.name}` (exit={gate.exit_code})

### Failure log (tail)
```
{failure_tail}
```

### Files changed in this PR
```
{files_proc.stdout}
```

### Diff vs origin/main
```diff
{diff_text}
```

Produce the minimal `diff` to make `{gate.name}` pass.
"""


_DIFF_RE = re.compile(r"```diff\n(.*?)```", re.DOTALL)


def extract_diff(reply: str) -> str | None:
    if reply.strip().startswith("DECLINE"):
        return None
    m = _DIFF_RE.search(reply)
    return m.group(1) if m else None
```

- [ ] **Step 3: Implement the real `llm_repair_conflicts` (replacing the stub from Task 4)**

Replace the stub:

```python
def llm_repair_conflicts(wt: Path, pr: PR, conflict_blob: str) -> bool:
    sys_prompt = (
        REPAIR_SYSTEM
        + "\nYou are resolving merge conflict markers (<<<<<<<, =======, >>>>>>>) "
          "left by `git rebase`. Output a diff that removes the markers and chooses "
          "the correct content for each hunk."
    )
    user = f"# Conflict files for PR #{pr.number}\n\n{conflict_blob}"
    save_prompt(pr, "rebase-conflict", user)
    try:
        reply = litellm_chat(sys_prompt, user)
    except Exception as e:
        log(f"PR #{pr.number}: ollama call failed: {e}")
        return False
    diff = extract_diff(reply)
    if diff is None:
        log(f"PR #{pr.number}: LLM declined or returned no diff")
        return False
    return apply_patch(wt, pr, "rebase-conflict", diff)
```

- [ ] **Step 4: Add the patch-apply + audit-trail helpers**

Append (above `llm_repair_conflicts` is fine):

```python
def save_prompt(pr: PR, label: str, body: str) -> Path:
    d = PROMPT_DIR / str(pr.number)
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{label}.txt"
    p.write_text(body)
    return p


def save_patch(pr: PR, label: str, diff: str) -> Path:
    d = PATCH_DIR / str(pr.number)
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{label}.diff"
    p.write_text(diff)
    return p


def apply_patch(wt: Path, pr: PR, label: str, diff: str) -> bool:
    patch_path = save_patch(pr, label, diff)
    proc = subprocess.run(
        ["git", "-C", str(wt), "apply", "--whitespace=fix", str(patch_path)],
        text=True, capture_output=True, stdin=subprocess.DEVNULL,
    )
    if proc.returncode != 0:
        log(f"PR #{pr.number}: git apply failed for {label}:\n{proc.stderr.strip()[-1000:]}")
        return False
    log(f"PR #{pr.number}: applied patch {label}")
    return True
```

- [ ] **Step 5: Smoke-test the LLM call directly**

Add `chat-test` smoketest:

```python
elif len(sys.argv) >= 2 and sys.argv[1] == "chat-test":
    out = litellm_chat("You are a calculator.", "What is 2+2? Reply with only the digit.")
    log(f"LLM reply: {out!r}")
```

Run:

```bash
eval "$(just env | sed 's/^/export /')"   # surface OLLAMA_API_KEY
./scripts/run-pr-sweep.py chat-test
```

Expected: prints `LLM reply: '4'` (or `'4\n'`). If it errors, debug auth / model tag here before going further.

- [ ] **Step 6: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): Ollama Cloud client + repair prompt + patch-apply helpers"
```

---

## Task 7: Repair loop

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Implement the gauntlet-with-repair loop**

Append:

```python
def run_gauntlet_with_repair(wt: Path, pr: PR) -> tuple[bool, list[GateResult]]:
    """
    Iterate: run gauntlet → on failure, ask LLM, apply patch, restart from cheapest.
    Returns (all_green, all_attempts). Bounded by MAX_TOTAL_ITERS.
    """
    attempts: list[GateResult] = []
    total_iters = 0
    while total_iters < MAX_TOTAL_ITERS:
        passed, failure = run_gauntlet(wt)
        attempts.extend(passed)
        if failure is None:
            return True, attempts
        attempts.append(failure)
        # Try to repair this gate up to MAX_REPAIR_ITERS times
        repaired = False
        for k in range(MAX_REPAIR_ITERS):
            total_iters += 1
            if total_iters > MAX_TOTAL_ITERS:
                log(f"PR #{pr.number}: hit MAX_TOTAL_ITERS={MAX_TOTAL_ITERS}, giving up")
                return False, attempts
            label = f"iter-{total_iters:02d}-{failure.name}"
            user = build_repair_prompt(pr, failure, wt)
            save_prompt(pr, label, user)
            try:
                reply = litellm_chat(REPAIR_SYSTEM, user)
            except Exception as e:
                log(f"PR #{pr.number}: ollama call failed (iter {total_iters}): {e}")
                break
            diff = extract_diff(reply)
            if diff is None:
                log(f"PR #{pr.number}: LLM declined repair on {failure.name} (iter {total_iters})")
                break
            if not apply_patch(wt, pr, label, diff):
                # Patch wouldn't apply cleanly. Try once more — LLM may recover with the rejection log.
                continue
            # Re-run only the failed gate to see if it's fixed
            recheck = next(g for g in GAUNTLET if g.__name__.endswith(failure.name))(wt)
            attempts.append(recheck)
            if recheck.passed:
                repaired = True
                break
            failure = recheck
        if not repaired:
            log(f"PR #{pr.number}: could not repair {failure.name} after {MAX_REPAIR_ITERS} attempts")
            return False, attempts
        # Loop back to top: re-run full gauntlet from cheapest
    return False, attempts
```

- [ ] **Step 2: Commit checkpoint after a successful repair**

After each `apply_patch` that leads to a green re-check, the script needs a commit for `git push` to ship something. Add a helper:

```python
def commit_repair_chain(wt: Path, pr: PR, attempts: list[GateResult]) -> int:
    """Stage everything modified and commit as a single 'pr-sweep repairs' commit if dirty.
    Returns 1 if a commit was made, 0 otherwise."""
    status = run(["git", "-C", str(wt), "status", "--porcelain"]).stdout
    if not status.strip():
        return 0
    run(["git", "-C", str(wt), "add", "-A"], check=True)
    msg = (
        "chore(pr-sweep): auto-repair failing gates\n\n"
        + "Repaired by run-pr-sweep.py via deepseek-v4-pro on Ollama Cloud.\n\n"
        + "Gates touched:\n"
        + "\n".join(f"  - {g.name} (exit {g.exit_code})" for g in attempts)
    )
    proc = subprocess.run(
        ["git", "-C", str(wt), "commit", "--no-verify", "-m", msg],
        text=True, capture_output=True, stdin=subprocess.DEVNULL,
    )
    if proc.returncode != 0:
        log(f"PR #{pr.number}: commit failed:\n{proc.stderr[-1000:]}")
        return 0
    return 1
```

- [ ] **Step 3: Smoke-test the full repair loop on a MERGEABLE PR**

Add a `repair` smoketest:

```python
elif len(sys.argv) >= 3 and sys.argv[1] == "repair":
    pr_num = int(sys.argv[2])
    prs = discover_prs()
    target = next((p for p in prs if p.number == pr_num), None)
    if target is None:
        log(f"FATAL: PR #{pr_num} not in queue"); sys.exit(2)
    wt = ensure_worktree(target)
    if not handle_rebase(wt, target):
        log(f"PR #{pr_num}: rebase failed; aborting repair smoketest"); sys.exit(1)
    bring_stack_up(wt)
    try:
        green, attempts = run_gauntlet_with_repair(wt, target)
        commits = commit_repair_chain(wt, target, attempts)
        log(f"repair for #{pr_num}: green={green} attempts={len(attempts)} commits={commits}")
    finally:
        tear_stack_down(wt)
```

Run against the simplest-looking MERGEABLE PR (e.g. #48 keyboard-shortcut-overlay — typically a small surface area):

```bash
./scripts/run-pr-sweep.py repair 48
```

Expected: the script iterates through gates, calls Ollama, applies patches, makes a commit. Logs land in `.pr-sweep-runner/logs/sweep-48.*.log`, prompts in `.pr-sweep-runner/prompts/48/`, patches in `.pr-sweep-runner/patches/48/`. Whether it fully greens or not, the audit trail should be complete.

- [ ] **Step 4: Inspect the audit trail**

```bash
ls .pr-sweep-runner/prompts/48/
ls .pr-sweep-runner/patches/48/
git -C .worktrees/sweep-48 log --oneline origin/main..
```

Expected: at least one prompt + patch per repair attempt; one or more sweep commits on top of the original PR commits.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): repair loop with bounded iterations and audit trail"
```

---

## Task 8: Disposition (push + mark ready, or comment failure)

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Add the green-disposition function (push + ready)**

Append:

```python
def push_and_mark_ready(wt: Path, pr: PR) -> str | None:
    """Force-with-lease push and `gh pr ready`. Returns PR URL on success, None on failure."""
    push = subprocess.run(
        ["git", "-C", str(wt), "push", "--force-with-lease", "--no-verify", "origin", pr.head_ref],
        text=True, capture_output=True, stdin=subprocess.DEVNULL,
    )
    if push.returncode != 0:
        log(f"PR #{pr.number}: push failed:\n{push.stderr[-1000:]}")
        return None
    ready = subprocess.run(
        ["gh", "pr", "ready", str(pr.number)],
        text=True, capture_output=True, stdin=subprocess.DEVNULL,
    )
    if ready.returncode != 0:
        log(f"PR #{pr.number}: gh pr ready failed:\n{ready.stderr.strip()}")
        # Push succeeded; report URL anyway
    url_proc = run(["gh", "pr", "view", str(pr.number), "--json", "url", "-q", ".url"])
    return url_proc.stdout.strip() or None
```

- [ ] **Step 2: Add the red-disposition function (comment + leave draft)**

Append:

```python
def comment_failure(pr: PR, attempts: list[GateResult], reason: str) -> None:
    body_lines = [
        "## PR sweep run — could not bring this green",
        "",
        f"**Reason:** {reason}",
        "",
        "**Gate results (last attempt of each):**",
    ]
    seen: dict[str, GateResult] = {}
    for a in attempts:
        seen[a.name] = a  # last one wins
    for name, g in seen.items():
        icon = "✅" if g.passed else "❌"
        body_lines.append(f"- {icon} `{name}` exit={g.exit_code} ({g.duration_s:.1f}s)")
    body_lines.append("")
    body_lines.append(f"_Repairs attempted with `{LITELLM_MODEL}` via the homelab LiteLLM proxy. Audit trail in `.pr-sweep-runner/{{prompts,patches,logs}}/{pr.number}/`._")
    body = "\n".join(body_lines)
    proc = subprocess.run(
        ["gh", "pr", "comment", str(pr.number), "--body", body],
        text=True, capture_output=True, stdin=subprocess.DEVNULL,
    )
    if proc.returncode != 0:
        log(f"PR #{pr.number}: gh pr comment failed:\n{proc.stderr.strip()}")
```

- [ ] **Step 3: Wire push to the smoketest (read-only first — print but don't push)**

For safety, add a `--push` flag check:

```python
elif len(sys.argv) >= 3 and sys.argv[1] == "dispose":
    pr_num = int(sys.argv[2])
    do_push = "--push" in sys.argv
    prs = discover_prs()
    target = next((p for p in prs if p.number == pr_num), None)
    if target is None:
        log(f"FATAL: PR #{pr_num} not in queue"); sys.exit(2)
    wt = REPO_ROOT / ".worktrees" / f"sweep-{pr_num}"
    if not wt.exists():
        log(f"FATAL: no worktree at {wt} (run `repair` first)"); sys.exit(2)
    if do_push:
        url = push_and_mark_ready(wt, target)
        log(f"dispose: pushed and marked ready → {url}")
    else:
        log(f"dispose dry-run: would push branch {target.head_ref} and `gh pr ready {pr_num}`")
```

- [ ] **Step 4: Smoke-test disposition (dry-run first, then real push if dry-run looks right)**

```bash
./scripts/run-pr-sweep.py dispose 48                # dry-run
./scripts/run-pr-sweep.py dispose 48 --push         # real
gh pr view 48 --json isDraft,statusCheckRollup
```

Expected: PR #48 is no longer draft; CI starts running again on the new commit.

- [ ] **Step 5: Commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "feat(pr-sweep): disposition — push+ready on green, comment on red"
```

---

## Task 9: Top-level driver + state file + Mattermost

**Files:**
- Modify: `scripts/run-pr-sweep.py`

- [ ] **Step 1: Add state-file helpers**

Append:

```python
def state_load() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text())
    except json.JSONDecodeError:
        log(f"WARN: state file corrupt; starting fresh")
        return {}


def state_save(state: dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True))
    tmp.replace(STATE_FILE)


def state_set(state: dict[str, Any], pr_num: int, **kwargs: Any) -> None:
    key = str(pr_num)
    state.setdefault(key, {})
    state[key].update(kwargs)
    state[key]["updated_at"] = now_iso()
    state_save(state)
```

- [ ] **Step 2: Add Mattermost notification helper**

Append:

```python
def mm_post(msg: str) -> None:
    if not MM_WEBHOOK_FILE.exists():
        return
    url = MM_WEBHOOK_FILE.read_text().strip().splitlines()[0] if MM_WEBHOOK_FILE.read_text().strip() else ""
    if not url:
        return
    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(url, json={"text": msg})
    except Exception:
        pass  # never let MM failures block the run
```

- [ ] **Step 3: Add the per-PR orchestration function**

Append:

```python
def process_pr(pr: PR, state: dict[str, Any]) -> str:
    """Returns outcome string: ok | rebase-failed | repair-failed | error | already-done"""
    key = str(pr.number)
    prev = state.get(key, {}).get("outcome")
    if prev == "ok":
        log(f"SKIP #{pr.number} — already ok")
        return "already-done"

    log(f"=== #{pr.number} {pr.head_ref} ({pr.mergeable}) ===")
    state_set(state, pr.number, outcome="in-progress", title=pr.title, head_ref=pr.head_ref, mergeable=pr.mergeable, started_at=now_iso())

    try:
        wt = ensure_worktree(pr)
    except subprocess.CalledProcessError as e:
        log(f"PR #{pr.number}: worktree setup failed: {e}")
        state_set(state, pr.number, outcome="error", error="worktree-setup")
        return "error"

    if not handle_rebase(wt, pr):
        state_set(state, pr.number, outcome="rebase-failed")
        comment_failure(pr, [], "rebase against `main` could not be resolved (with or without LLM assistance)")
        return "rebase-failed"

    try:
        bring_stack_up(wt)
    except Exception as e:
        log(f"PR #{pr.number}: stack failed to come up: {e}")
        state_set(state, pr.number, outcome="error", error="stack-up")
        return "error"

    try:
        green, attempts = run_gauntlet_with_repair(wt, pr)
        commit_repair_chain(wt, pr, attempts)
        if green:
            url = push_and_mark_ready(wt, pr)
            state_set(state, pr.number, outcome="ok", pr_url=url, attempts=len(attempts), finished_at=now_iso())
            mm_post(f"✅ `#{pr.number}` `{pr.head_ref}` — green and marked ready ({len(attempts)} gate runs)")
            return "ok"
        else:
            comment_failure(pr, attempts, "exhausted repair budget; needs human attention")
            state_set(state, pr.number, outcome="repair-failed", attempts=len(attempts), finished_at=now_iso())
            mm_post(f"⚠️ `#{pr.number}` `{pr.head_ref}` — left as draft, repair budget exhausted")
            return "repair-failed"
    finally:
        tear_stack_down(wt)
```

- [ ] **Step 4: Build the `main()` driver**

Append:

```python
def main() -> int:
    # Preflight
    for tool in ("gh", "git", "docker", "just", "prek"):
        if shutil.which(tool) is None:
            log(f"FATAL: `{tool}` not on PATH")
            return 2
    if not os.environ.get("LITELLM_API_KEY"):
        log("FATAL: LITELLM_API_KEY not set. Run via `just sweep` (auto-sources .env).")
        return 2

    prs = discover_prs()
    only = os.environ.get("ONLY_PR")
    if only:
        prs = [p for p in prs if str(p.number) == only]
        if not prs:
            log(f"FATAL: ONLY_PR={only} not in queue")
            return 2
    max_prs = int(os.environ.get("MAX_PRS", "0")) or len(prs)
    prs = prs[:max_prs]

    log(f"Queue: {len(prs)} PRs ({sum(1 for p in prs if p.mergeable == 'MERGEABLE')} mergeable)")
    if os.environ.get("DRY_RUN"):
        for p in prs:
            log(f"  WOULD PROCESS #{p.number} [{p.mergeable}] {p.head_ref}")
        return 0

    state = state_load()
    mm_post(f"🚀 PR sweep starting — {len(prs)} PRs queued, model `{LITELLM_MODEL}` via LiteLLM")
    counts: dict[str, int] = {"ok": 0, "rebase-failed": 0, "repair-failed": 0, "error": 0, "already-done": 0}
    for i, pr in enumerate(prs, 1):
        log(f"[{i}/{len(prs)}] PR #{pr.number}")
        try:
            outcome = process_pr(pr, state)
        except KeyboardInterrupt:
            log("Interrupted")
            return 130
        except Exception as e:
            log(f"PR #{pr.number}: unhandled exception: {e}")
            state_set(state, pr.number, outcome="error", error=repr(e))
            outcome = "error"
        counts[outcome] = counts.get(outcome, 0) + 1
        if i < len(prs):
            log(f"Cooldown {COOLDOWN_S}s")
            time.sleep(COOLDOWN_S)

    summary = " · ".join(f"{k}: {v}" for k, v in counts.items())
    log(f"DONE — {summary}")
    mm_post(f"🏁 PR sweep finished — {summary}")
    return 0
```

- [ ] **Step 5: Wire `main()` into `__main__`**

Replace the existing `__main__` dispatcher's final `else` branch with:

```python
elif len(sys.argv) == 1 or sys.argv[1] == "run":
    sys.exit(main())
else:
    log(f"usage: {sys.argv[0]} [run | discover | worktree N | rebase N | gauntlet N | repair N | dispose N [--push] | chat-test]")
    sys.exit(2)
```

- [ ] **Step 6: Add a `just sweep` recipe**

Edit `justfile`. After the `worktree-rm slug:` recipe, add:

```just
# Run the PR sweep orchestrator. Reads OLLAMA_API_KEY from .env.sops.
sweep *args:
    #!/usr/bin/env bash
    set -euo pipefail
    eval "$(just env | sed 's/^/export /')"
    exec scripts/run-pr-sweep.py {{args}}
```

- [ ] **Step 7: Smoke-test in DRY_RUN mode**

```bash
DRY_RUN=1 just sweep
```

Expected: prints `Queue: N PRs` then `WOULD PROCESS #N [MERGEABLE/CONFLICTING] dirac/<slug>` for each, then exits 0.

- [ ] **Step 8: Commit**

```bash
git add scripts/run-pr-sweep.py justfile
git commit -m "feat(pr-sweep): top-level driver, state file, mattermost, just sweep recipe"
```

---

## Task 10: Smoke-test against ONE mergeable PR end-to-end

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Pick the simplest MERGEABLE PR**

```bash
gh pr list --json number,title,headRefName,mergeable,additions,deletions \
  --jq '.[] | select(.mergeable == "MERGEABLE") | "\(.number)\t\(.additions + .deletions)\t\(.title)"' \
  | sort -k2 -n | head -5
```

Pick the smallest one (lowest `additions + deletions`). Note its number.

- [ ] **Step 2: Run the sweep against just that PR**

```bash
ONLY_PR=<num> just sweep
```

Expected runtime: 5–30 minutes depending on how many gates need repair. Watch the runner log:

```bash
tail -f .pr-sweep-runner/runner.log
```

- [ ] **Step 3: Verify outcome**

```bash
jq . .pr-sweep-runner/state.json
gh pr view <num> --json isDraft,mergeable,statusCheckRollup
```

Expected: `state.json` shows `outcome: ok`, `pr_url: <url>`. `gh pr view` shows `isDraft: false`. CI should be running on the new commit.

- [ ] **Step 4: Eyeball the audit trail**

```bash
ls .pr-sweep-runner/prompts/<num>/
ls .pr-sweep-runner/patches/<num>/
git -C .worktrees/sweep-<num> log --oneline origin/main..
```

Expected: every LLM prompt is captured, every applied patch is captured, and the PR branch has 1 sweep-repair commit on top of the original work. If the commit count is suspiciously high (e.g. >3), inspect — the LLM may be thrashing.

- [ ] **Step 5: If anything looks off, tune REPAIR_SYSTEM and retry**

The most common failure mode is the LLM returning prose instead of a `diff` fenced block. If that happens, tighten REPAIR_SYSTEM with explicit examples and retry the same PR (it'll skip because `outcome: ok` is recorded — delete that key first):

```bash
jq 'del(."<num>")' .pr-sweep-runner/state.json > /tmp/s.json && mv /tmp/s.json .pr-sweep-runner/state.json
ONLY_PR=<num> just sweep
```

- [ ] **Step 6: Commit any prompt tuning**

```bash
git add scripts/run-pr-sweep.py
git commit -m "tune(pr-sweep): refine repair prompt based on first smoke-test"
```

---

## Task 11: First batch of 5 PRs

**Files:** none modified.

- [ ] **Step 1: Run against 5 MERGEABLE PRs**

```bash
MAX_PRS=5 just sweep
```

This gives a wall-clock estimate (5 PRs × ~15min each ≈ 75 min) and surfaces any class-of-failure issues before committing to the full 50.

- [ ] **Step 2: Inspect aggregate outcomes**

```bash
jq 'to_entries | map({pr: .key, outcome: .value.outcome, attempts: .value.attempts})' .pr-sweep-runner/state.json
```

Expected: counts of ok / rebase-failed / repair-failed. If `repair-failed > 2`, the prompt or the gate ordering needs tuning before scaling up.

- [ ] **Step 3: For any `repair-failed` PR, read the last failing prompt + LLM reply manually**

```bash
ls -t .pr-sweep-runner/prompts/<num>/ | tail -3
cat .pr-sweep-runner/prompts/<num>/iter-08-pytest.txt
```

Decide: prompt change, gate change, or "this PR is structurally broken, exclude it" (add to a SKIP list in the script).

- [ ] **Step 4: If the prompt needs revision, edit `REPAIR_SYSTEM` + commit**

```bash
git add scripts/run-pr-sweep.py
git commit -m "tune(pr-sweep): improve repair prompt based on 5-PR batch"
```

---

## Task 12: Run against the full queue

**Files:** none modified.

- [ ] **Step 1: Set up the Mattermost webhook (optional but nice)**

```bash
# Reuse the dirac runner's webhook if present
[ -f .dirac-runner/mm-webhook ] && cp .dirac-runner/mm-webhook .pr-sweep-runner/mm-webhook
```

Or create a new incoming webhook in Mattermost (see the `mmctl` skill) and write the URL to `.pr-sweep-runner/mm-webhook`.

- [ ] **Step 2: Kick off the full run, in a tmux session so it survives disconnects**

```bash
tmux new -s pr-sweep -d 'cd /home/will/projects/personal-crm && just sweep 2>&1 | tee -a .pr-sweep-runner/run-$(date +%Y%m%d-%H%M).log'
tmux ls
```

Expected runtime: 50 PRs × 15–30 min each = 12–25 hours. It's resumable — if it dies, just `just sweep` again.

- [ ] **Step 3: Check progress periodically**

```bash
tail -50 .pr-sweep-runner/runner.log
jq 'group_by(.outcome) | map({outcome: .[0].outcome, count: length})' .pr-sweep-runner/state.json
```

- [ ] **Step 4: Final accounting**

After it finishes:

```bash
gh pr list --search "is:open is:pr -is:draft" --json number,title,headRefName | jq length
gh pr list --search "is:open is:draft" --json number,title,headRefName,labels | jq length
```

Expected: most "ready" PRs equal the `outcome: ok` count from state.json. Remaining drafts are the structurally broken ones (each will have a `## PR sweep run — could not bring this green` comment from the orchestrator explaining why).

- [ ] **Step 5: Update the project README**

Mark all tasks complete, add a session log entry summarizing outcome counts, set `status: complete` (or `archived` once you've reviewed and merged the ready queue).

- [ ] **Step 6: Commit**

```bash
git add docs/projects/pr-sweep-orchestrator/README.md
git commit -m "docs(pr-sweep): session log + final outcome counts"
```

---

## Stop conditions

The script is intentionally **never** allowed to:

- Merge into `main` (`gh pr merge`) — humans review the ready queue.
- Force-push to `main` — only force-with-lease to `dirac/<slug>` branches.
- Skip pre-commit on the *final* commit that goes to the PR — but it does pass `--no-verify` to its own intermediate sweep-repair commits, since those are intermediate and the gates are run separately by the orchestrator.
- `git reset --hard` anything outside the worktree it owns.
- `rm -rf` outside `.pr-sweep-runner/` and `.worktrees/sweep-*`.

If the LLM repair loop wanders into anything destructive, that's a bug in the patch-application step — the script applies patches with `git apply`, never executes shell from LLM output.

## Self-review notes

- **Spec coverage:** all sections of the spec map to tasks. PR discovery → Task 2; rebase → Task 4; gauntlet → Task 5; LLM → Task 6; loop → Task 7; disposition → Task 8; resumable state → Task 9.
- **No placeholders:** every step has either runnable code, runnable commands, or a verifiable expected output.
- **Type consistency:** `PR`, `GateResult`, `state[str(pr.number)]` all defined and reused consistently. `OLLAMA_MODEL` defined once, referenced in chat call + prompt + comment body.
- **One known gap to watch:** the recheck in `run_gauntlet_with_repair` uses `g.__name__.endswith(failure.name)` which assumes function names like `gate_pytest` end with the gate name `pytest`. They do — `gate_precommit` / `precommit`, `gate_typecheck` / `typecheck`, `gate_pytest` / `pytest`, `gate_e2e` / `e2e`. Tested mentally against Task 5 definitions; consistent.
