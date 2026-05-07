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


def _smoketest_discover() -> None:
    prs = discover_prs()
    log(
        f"Discovered {len(prs)} draft PRs ({sum(1 for p in prs if p.mergeable == 'MERGEABLE')} mergeable)"
    )
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
