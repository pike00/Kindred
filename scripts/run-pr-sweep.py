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
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import httpx


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
    """
    Return a worktree on `pr.head_ref` synced to origin.

    Origin is the source of truth: many local dirac/* refs are stale from the
    2026-05-07 filter-repo public-release rewrite (their root commit no longer
    matches main's). This function always fetches first, and resets any stale
    worktree to the origin SHA. Refuses to reset if uncommitted work is present.
    """
    run(["git", "fetch", "origin", pr.head_ref], check=True)
    origin_sha = run(["git", "rev-parse", f"origin/{pr.head_ref}"]).stdout.strip()

    existing = existing_worktree_for(pr.head_ref)
    if existing is not None:
        wt_sha = run(["git", "-C", str(existing), "rev-parse", "HEAD"]).stdout.strip()
        if wt_sha == origin_sha:
            log(
                f"PR #{pr.number}: reusing worktree {existing} (HEAD {wt_sha[:8]} matches origin)"
            )
            return existing
        status = run(
            ["git", "-C", str(existing), "status", "--porcelain"]
        ).stdout.strip()
        if status:
            raise RuntimeError(
                f"PR #{pr.number}: stale worktree {existing} has uncommitted changes; refusing to reset:\n{status}"
            )
        log(
            f"PR #{pr.number}: worktree {existing} stale ({wt_sha[:8]} != origin {origin_sha[:8]}); resetting"
        )
        for state_dir in (
            "MERGE_HEAD",
            "rebase-merge",
            "rebase-apply",
            "CHERRY_PICK_HEAD",
        ):
            if (existing / ".git" / state_dir).exists():
                subprocess.run(
                    ["git", "-C", str(existing), "merge", "--abort"],
                    capture_output=True,
                    stdin=subprocess.DEVNULL,
                )
                break
        run(
            ["git", "-C", str(existing), "reset", "--hard", f"origin/{pr.head_ref}"],
            check=True,
        )
        return existing

    wt_name = f"sweep-{pr.number}"
    wt_path = REPO_ROOT / ".worktrees" / wt_name
    log(f"PR #{pr.number}: creating worktree {wt_path} on {pr.head_ref}")
    branch_exists = bool(run(["git", "branch", "--list", pr.head_ref]).stdout.strip())
    if branch_exists:
        run(["git", "branch", "-f", pr.head_ref, f"origin/{pr.head_ref}"], check=True)
        run(["git", "worktree", "add", str(wt_path), pr.head_ref], check=True)
    else:
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


def merge_main_into_pr(wt: Path) -> tuple[bool, str]:
    """
    Try `git merge origin/main` (no rebase — these PRs have merge commits, so
    rebase would replay them and conflict where merge would not). Mirrors what
    GitHub's "Update branch" button does. Returns (success, log_excerpt).
    Leaves any conflicts in the index for the caller to inspect / hand to LLM.
    """
    fetch_main(wt)
    proc = subprocess.run(
        [
            "git",
            "-C",
            str(wt),
            "-c",
            "core.editor=true",  # accept the auto-generated merge message
            "merge",
            "--no-edit",
            f"origin/{DEFAULT_BRANCH}",
        ],
        text=True,
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if proc.returncode == 0:
        return True, (proc.stdout or "clean merge").strip()
    out = (proc.stdout + "\n" + proc.stderr).strip()
    return False, out[-4000:]


def abort_merge(wt: Path) -> None:
    subprocess.run(
        ["git", "-C", str(wt), "merge", "--abort"],
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
    sys_prompt = (
        REPAIR_SYSTEM
        + "\nYou are resolving merge conflict markers (<<<<<<<, =======, >>>>>>>) "
        "left by `git merge`. Output a diff that removes the markers and chooses "
        "the correct content for each hunk."
    )
    user = f"# Conflict files for PR #{pr.number}\n\n{conflict_blob}"
    save_prompt(pr, "merge-conflict", user)
    try:
        reply = litellm_chat(sys_prompt, user)
    except Exception as e:
        log(f"PR #{pr.number}: litellm call failed: {e}")
        return False
    diff = extract_diff(reply)
    if diff is None:
        log(f"PR #{pr.number}: LLM declined or returned no diff")
        return False
    return apply_patch(wt, pr, "merge-conflict", diff)


def handle_update_branch(wt: Path, pr: PR) -> bool:
    """Bring the PR branch up to date with main via merge. Return True on success."""
    success, msg = merge_main_into_pr(wt)
    if success:
        return True
    log(f"PR #{pr.number}: merge conflicts:\n{msg[-1000:]}")
    blob = gather_conflict_context(wt)
    if llm_repair_conflicts(wt, pr, blob):
        run(["git", "-C", str(wt), "add", "-A"], check=True)
        cont = subprocess.run(
            ["git", "-C", str(wt), "-c", "core.editor=true", "commit", "--no-edit"],
            text=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
        )
        if cont.returncode == 0:
            log(f"PR #{pr.number}: merge commit succeeded after LLM repair")
            return True
        log(f"PR #{pr.number}: merge commit still failed:\n{cont.stderr[-1000:]}")
    abort_merge(wt)
    return False


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
    log(
        f"  {'✓' if proc.returncode == 0 else '✗'} gate `{name}` exit={proc.returncode} ({dur:.1f}s) → {log_path}"
    )
    return GateResult(
        name=name, exit_code=proc.returncode, log_path=log_path, duration_s=dur
    )


def gate_precommit(wt: Path) -> GateResult:
    return _run_gate(wt, "precommit", ["prek", "run", "--all-files"], timeout=600)


def gate_typecheck(wt: Path) -> GateResult:
    return _run_gate(
        wt,
        "typecheck",
        [
            "docker",
            "compose",
            "-f",
            "compose.worktree.yml",
            "exec",
            "-T",
            "frontend",
            "bun",
            "run",
            "typecheck",
        ],
        timeout=300,
    )


def gate_pytest(wt: Path) -> GateResult:
    return _run_gate(wt, "pytest", ["just", "pytest", "-x", "-q"], timeout=900)


def gate_e2e(wt: Path) -> GateResult:
    # Reuse the existing pre-push e2e script. It auto-brings up the loopback stack.
    return _run_gate(wt, "e2e", ["bash", "scripts/run-e2e-prepush.sh"], timeout=1800)


GAUNTLET = [gate_precommit, gate_typecheck, gate_pytest, gate_e2e]


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


def litellm_chat(system: str, user: str, *, timeout_s: int = 300) -> str:
    """Single-shot chat completion against the homelab LiteLLM proxy.
    Returns assistant message text. Uses OpenAI-compatible /v1/chat/completions."""
    api_key = os.environ.get("LITELLM_API_KEY")
    if not api_key:
        raise RuntimeError(
            "LITELLM_API_KEY not set; ensure .env has it and run via `just sweep`"
        )
    payload = {
        "model": LITELLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "temperature": 0.0,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=timeout_s) as client:
        r = client.post(LITELLM_CHAT_URL, json=payload, headers=headers)
    r.raise_for_status()
    body = r.json()
    return body["choices"][0]["message"]["content"]


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
    files_proc = run(
        ["git", "-C", str(wt), "diff", "--name-only", f"origin/{DEFAULT_BRANCH}...HEAD"]
    )
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
        text=True,
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if proc.returncode != 0:
        log(
            f"PR #{pr.number}: git apply failed for {label}:\n{proc.stderr.strip()[-1000:]}"
        )
        return False
    log(f"PR #{pr.number}: applied patch {label}")
    return True


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
    elif len(sys.argv) >= 3 and sys.argv[1] == "update-branch":
        pr_num = int(sys.argv[2])
        prs = discover_prs()
        target = next((p for p in prs if p.number == pr_num), None)
        if target is None:
            log(f"FATAL: PR #{pr_num} not in queue")
            sys.exit(2)
        wt = ensure_worktree(target)
        ok = handle_update_branch(wt, target)
        log(f"update-branch result for #{pr_num}: {'OK' if ok else 'FAILED'}")
    elif len(sys.argv) >= 2 and sys.argv[1] == "chat-test":
        out = litellm_chat(
            "You are a calculator.", "What is 2+2? Reply with only the digit."
        )
        log(f"LLM reply: {out!r}")
    elif len(sys.argv) >= 3 and sys.argv[1] == "gauntlet":
        pr_num = int(sys.argv[2])
        prs = discover_prs()
        target = next((p for p in prs if p.number == pr_num), None)
        if target is None:
            log(f"FATAL: PR #{pr_num} not in queue")
            sys.exit(2)
        wt = ensure_worktree(target)
        bring_stack_up(wt)
        try:
            passed, failure = run_gauntlet(wt)
            log(
                f"gauntlet for #{pr_num}: {len(passed)} passed; failure={failure.name if failure else 'none'}"
            )
        finally:
            tear_stack_down(wt)
    else:
        log(
            "usage: run-pr-sweep.py {discover|worktree <pr_number>|update-branch <pr_number>|gauntlet <pr_number>|chat-test}"
        )
        sys.exit(2)
