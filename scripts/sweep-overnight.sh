#!/usr/bin/env bash
# sweep-overnight.sh — exhaustive multi-pass PR sweep + review.
#
# Loops until all skipped PRs are resolved or the skipped count stops changing
# (truly stuck). Runs a retrospective review pass after each sweep pass.
#
# Usage:
#   scripts/sweep-overnight.sh               # full overnight run
#   DRY_RUN=1 scripts/sweep-overnight.sh     # print queue only, no mutations
#   ONLY_PR=27 scripts/sweep-overnight.sh    # single-PR smoke test
#
# Env overrides (all optional — defaults are tuned for overnight):
#   LITELLM_MODEL          repair model  (default: deepseek-v4-pro-cloud)
#   LITELLM_REVIEW_MODEL   review model  (default: deepseek-v4-pro-cloud)
#   LITELLM_FIX_MODEL      fix model     (default: kimi-k2.6-cloud)
#   MAX_REPAIR_ITERS       LLM attempts per gate failure (default: 5)
#   MAX_TOTAL_ITERS        total LLM attempts per PR    (default: 15)
#   COOLDOWN_S             sleep between PRs            (default: 20)
#   PASS_COOLDOWN_S        sleep between full passes    (default: 90)
#   MAX_PASSES             safety cap on loop count     (default: 20)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

LOG="$REPO_ROOT/.pr-sweep-runner/overnight.log"
mkdir -p "$REPO_ROOT/.pr-sweep-runner"

_log() { echo "$*" | tee -a "$LOG"; }
_ts()  { date -u +%Y-%m-%dT%H:%M:%SZ; }

# ── Secrets ────────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    echo "ERROR: .env not found — run: sops -d .env.sops > .env" >&2
    exit 1
fi
set -a; source .env; set +a

# ── Model config ───────────────────────────────────────────────────────────────
export LITELLM_MODEL="${LITELLM_MODEL:-deepseek-v4-pro-cloud}"
export LITELLM_REVIEW_MODEL="${LITELLM_REVIEW_MODEL:-deepseek-v4-pro-cloud}"
export LITELLM_FIX_MODEL="${LITELLM_FIX_MODEL:-kimi-k2.6-cloud}"

# ── Tuning (overnight defaults — more generous than the one-shot sweep) ────────
export MAX_REPAIR_ITERS="${MAX_REPAIR_ITERS:-5}"
export MAX_TOTAL_ITERS="${MAX_TOTAL_ITERS:-15}"
export COOLDOWN_S="${COOLDOWN_S:-20}"
PASS_COOLDOWN_S="${PASS_COOLDOWN_S:-90}"
MAX_PASSES="${MAX_PASSES:-20}"

# ── Helpers ────────────────────────────────────────────────────────────────────
_skipped_count() {
    python3 -c "
import json, sys
try:
    s = json.load(open('.pr-sweep-runner/state.json'))
    print(sum(1 for v in s.values() if v.get('status') == 'skipped'))
except FileNotFoundError:
    print(0)
"
}

_ready_count() {
    python3 -c "
import json, sys
try:
    s = json.load(open('.pr-sweep-runner/state.json'))
    print(sum(1 for v in s.values() if v.get('status') == 'ready'))
except FileNotFoundError:
    print(0)
"
}

_mm_notify() {
    local msg="$1"
    local wh_file=".pr-sweep-runner/mm-webhook"
    if [ -f "$wh_file" ]; then
        curl -s -X POST "$(cat "$wh_file")" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$msg\"}" || true
    fi
}

_run_sweep() {
    uv run --script --quiet scripts/run-pr-sweep.py run 2>&1 | tee -a "$LOG"
}

_run_review() {
    uv run --script --quiet scripts/run-pr-sweep.py review 2>&1 | tee -a "$LOG"
}

# ── Main loop ──────────────────────────────────────────────────────────────────
_log ""
_log "════════════════════════════════════════════════════════════"
_log "  OVERNIGHT SWEEP START  $(_ts)"
_log "  model:    $LITELLM_MODEL"
_log "  review:   $LITELLM_REVIEW_MODEL  fix: $LITELLM_FIX_MODEL"
_log "  repair:   MAX_REPAIR_ITERS=$MAX_REPAIR_ITERS  MAX_TOTAL_ITERS=$MAX_TOTAL_ITERS"
_log "  cooldown: ${COOLDOWN_S}s/PR  ${PASS_COOLDOWN_S}s/pass  max ${MAX_PASSES} passes"
_log "════════════════════════════════════════════════════════════"

skipped_last=-1
pass=0

while [ "$pass" -lt "$MAX_PASSES" ]; do
    pass=$((pass + 1))

    _log ""
    _log "━━━ SWEEP PASS $pass / $MAX_PASSES  $(_ts) ━━━"
    _run_sweep

    skipped=$(_skipped_count)
    ready=$(_ready_count)
    _log "━━━ PASS $pass DONE: ready=$ready  skipped=$skipped ━━━"

    _log ""
    _log "━━━ REVIEW PASS $pass  $(_ts) ━━━"
    _run_review

    # ── Stop conditions ──────────────────────────────────────────────────────
    if [ "$skipped" -eq 0 ]; then
        _log ""
        _log "════ ALL CLEAR — 0 skipped PRs remaining. ════"
        _mm_notify "✅ Overnight sweep complete after $pass pass(es) — all PRs resolved. Ready: $ready"
        break
    fi

    if [ "$skipped" -eq "$skipped_last" ]; then
        _log ""
        _log "════ STUCK — skipped count unchanged at $skipped. Stopping after $pass pass(es). ════"
        _mm_notify "⚠️ Overnight sweep stuck after $pass pass(es) — $skipped PRs unresolvable. Ready: $ready"
        break
    fi

    skipped_last=$skipped

    if [ "$pass" -lt "$MAX_PASSES" ]; then
        _log "Cooling ${PASS_COOLDOWN_S}s before pass $((pass + 1))..."
        sleep "$PASS_COOLDOWN_S"
    fi
done

if [ "$pass" -ge "$MAX_PASSES" ]; then
    skipped=$(_skipped_count)
    ready=$(_ready_count)
    _log "════ MAX_PASSES=$MAX_PASSES reached. ready=$ready  skipped=$skipped ════"
    _mm_notify "⏱ Overnight sweep hit MAX_PASSES=$MAX_PASSES — ready=$ready  skipped=$skipped"
fi

_log ""
_log "════════════════════════════════════════════════════════════"
_log "  OVERNIGHT SWEEP END  $(_ts)"
_log "════════════════════════════════════════════════════════════"
