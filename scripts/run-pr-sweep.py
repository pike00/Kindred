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
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


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


def run(
    cmd: list[str], cwd: Path | None = None, check: bool = False, capture: bool = True
) -> subprocess.CompletedProcess[str]:
    """Thin wrapper around subprocess. Always captures stderr alongside stdout."""
    return subprocess.run(
        cmd,
        cwd=cwd or REPO_ROOT,
        check=check,
        text=True,
        capture_output=capture,
        stdin=subprocess.DEVNULL,
    )


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
        return (
            self.head_ref.split("/", 1)[-1] if "/" in self.head_ref else self.head_ref
        )


def discover_prs() -> list[PR]:
    proc = run(
        [
            "gh",
            "pr",
            "list",
            "--json",
            "number,title,headRefName,isDraft,mergeable",
            "--limit",
            "200",
        ]
    )
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
    prs = [
        p
        for p in prs
        if p.is_draft
        and (p.head_ref.startswith("dirac/") or p.head_ref.startswith("worktree-"))
    ]
    # Order: MERGEABLE first (cheapest to land), then CONFLICTING
    prs.sort(key=lambda p: (0 if p.mergeable == "MERGEABLE" else 1, p.number))
    return prs


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
    run(
        [
            "git",
            "worktree",
            "add",
            "--track",
            "-b",
            pr.head_ref,
            str(wt_path),
            f"origin/{pr.head_ref}",
        ],
        check=True,
    )
    return wt_path


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
            text=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
        )
        if cont.returncode == 0:
            log(f"PR #{pr.number}: rebase --continue succeeded after LLM repair")
            return True
        log(f"PR #{pr.number}: rebase --continue still failed:\n{cont.stderr[-1000:]}")
    abort_rebase(wt)
    return False


def _smoketest_discover() -> None:
    prs = discover_prs()
    log(
        f"Discovered {len(prs)} draft PRs ({sum(1 for p in prs if p.mergeable == 'MERGEABLE')} mergeable)"
    )
    for p in prs[:10]:
        log(f"  #{p.number} [{p.mergeable}] {p.head_ref} — {p.title}")
    if len(prs) > 10:
        log(f"  ... and {len(prs) - 10} more")


def _smoketest_worktree(pr_num: int) -> None:
    prs = discover_prs()
    target = next((p for p in prs if p.number == pr_num), None)
    if target is None:
        log(f"FATAL: PR #{pr_num} not in queue")
        sys.exit(2)
    wt = ensure_worktree(target)
    log(f"OK: worktree at {wt} on branch {target.head_ref}")
    log(f"Test cleanup: rm with `git worktree remove --force {wt}`")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "discover":
        _smoketest_discover()
    elif len(sys.argv) >= 3 and sys.argv[1] == "worktree":
        _smoketest_worktree(int(sys.argv[2]))
    elif len(sys.argv) >= 3 and sys.argv[1] == "rebase":
        pr_num = int(sys.argv[2])
        prs = discover_prs()
        target = next((p for p in prs if p.number == pr_num), None)
        if target is None:
            log(f"FATAL: PR #{pr_num} not in queue")
            sys.exit(2)
        wt = ensure_worktree(target)
        ok = handle_rebase(wt, target)
        log(f"rebase result for #{pr_num}: {'OK' if ok else 'FAILED'}")
    else:
        log("usage: run-pr-sweep.py {discover|worktree <pr_number>|rebase <pr_number>}")
        sys.exit(2)
