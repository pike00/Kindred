#!/usr/bin/env bash
# run-dirac-projects.sh — sequentially run Dirac through every active personal-crm project.
#
# Discovers docs/projects/*/README.md with status in {active, paused, in-progress}, places
# each in its own worktree+branch, runs Dirac (via the dirac-free-only wrapper) with
# autonomous flags, then commits/pushes/opens a draft PR. State is persisted so the
# script is fully resumable. Failures skip to the next project.
#
# Knobs (env vars):
#   PER_PROJECT_TIMEOUT      seconds — hard wall-clock limit per project (default 5400 = 90m)
#   INTER_PROJECT_COOLDOWN   seconds between projects (default 30)
#   RATE_LIMIT_BACKOFF       seconds to sleep when 429 detected in log (default 3600)
#   MAX_CONSECUTIVE_MISTAKES dirac --max-consecutive-mistakes (default 5)
#   ONLY_SLUG                run a single slug (debug)
#   DRY_RUN                  if set, just print the plan and exit

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WRAPPER="$REPO_ROOT/scripts/dirac-free-only"
STATE_DIR="$REPO_ROOT/.dirac-runner"
LOG_DIR="$STATE_DIR/logs"
PROMPT_DIR="$STATE_DIR/prompts"
STATE_FILE="$STATE_DIR/state.json"
RUNNER_LOG="$STATE_DIR/runner.log"

PER_PROJECT_TIMEOUT="${PER_PROJECT_TIMEOUT:-5400}"
INTER_PROJECT_COOLDOWN="${INTER_PROJECT_COOLDOWN:-30}"
RATE_LIMIT_BACKOFF="${RATE_LIMIT_BACKOFF:-3600}"
MAX_CONSECUTIVE_MISTAKES="${MAX_CONSECUTIVE_MISTAKES:-5}"
DEFAULT_BRANCH="main"

mkdir -p "$LOG_DIR" "$PROMPT_DIR"
[ -f "$STATE_FILE" ] || echo '{}' > "$STATE_FILE"

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '[runner %s] %s\n' "$(now)" "$*" | tee -a "$RUNNER_LOG"; }

state_set() {
  # state_set <slug> key=val [key=val ...]
  local slug="$1"; shift
  local tmp; tmp="$(mktemp)"
  local filter='.[$slug] //= {} | .[$slug].updated_at = $now'
  local args=(--arg slug "$slug" --arg now "$(now)")
  for kv in "$@"; do
    local k="${kv%%=*}" v="${kv#*=}"
    args+=(--arg "k_${k}" "$k" --arg "v_${k}" "$v")
    filter="$filter | .[\$slug][\$k_${k}] = \$v_${k}"
  done
  jq "${args[@]}" "$filter" "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

state_get_outcome() {
  jq -r --arg s "$1" '.[$s].outcome // ""' "$STATE_FILE"
}

preflight() {
  log "Pre-flight checks…"
  command -v dirac >/dev/null || { log "FATAL: dirac not on PATH"; exit 2; }
  command -v gh    >/dev/null || { log "FATAL: gh not on PATH"; exit 2; }
  command -v jq    >/dev/null || { log "FATAL: jq not on PATH"; exit 2; }
  command -v timeout >/dev/null || { log "FATAL: coreutils timeout not on PATH"; exit 2; }
  [ -x "$WRAPPER" ] || { log "FATAL: wrapper not executable: $WRAPPER"; exit 2; }
  gh auth status >/dev/null 2>&1 || { log "FATAL: gh not authenticated"; exit 2; }

  local gs=/home/will/.dirac/data/globalState.json
  [ -f "$gs" ] || { log "FATAL: dirac globalState missing: $gs"; exit 2; }
  local provider model
  provider=$(jq -r '.actModeApiProvider' "$gs")
  model=$(jq -r '.actModeOpenRouterModelId' "$gs")
  [ "$provider" = "openrouter" ] || { log "FATAL: dirac provider=$provider, expected openrouter"; exit 2; }
  case "$model" in
    *:free) ;;
    *) log "FATAL: dirac model=$model is not :free"; exit 2;;
  esac
  log "Lock confirmed: provider=$provider model=$model"
  log "REMINDER: set spend cap at https://openrouter.ai/settings/credits (e.g. \$0.50 hard cap) before kickoff."
}

discover_projects() {
  local d slug readme st
  for d in docs/projects/*/; do
    slug=$(basename "$d")
    case "$slug" in archive|attachments) continue;; esac
    readme="$d/README.md"
    [ -f "$readme" ] || continue
    st=$(grep -m1 -E '^status:' "$readme" | awk '{print $2}')
    case "$st" in
      active|paused|in-progress) printf '%s\t%s\n' "$st" "$slug" ;;
    esac
  done
}

# Map slug -> existing worktree path. Reuses any worktree whose path basename
# matches the slug (covers .claude/worktrees/<slug>, .worktrees/<slug>,
# .worktrees/dirac-<slug>, etc.).
existing_worktree_for() {
  local slug="$1"
  git worktree list --porcelain | awk -v s="$slug" '
    /^worktree / { wt=$2; next }
    /^branch /   { br=$2
                   n=split(wt, parts, "/"); base=parts[n]
                   if (base == s || base == "dirac-" s || br ~ ("/" s "$") || br ~ (s "$"))
                     print wt
                 }
  ' | head -1
}

build_prompt() {
  local slug="$1" wt="$2" readme="$3"
  cat <<EOF
You are implementing the personal-crm project: \`$slug\`.

GUARDRAILS — NON-NEGOTIABLE:
- Stay strictly within this worktree: $wt
- Do NOT modify files in other worktrees, the parent repo, or other project directories
- Do NOT push branches, do NOT open PRs, do NOT run \`git push\` — the runner handles that
- Do NOT run interactive commands; everything must be non-interactive
- Follow existing patterns: FastAPI backend in \`backend/\`, React+Bun frontend in \`frontend/\`, alembic migrations under \`backend/migrations/versions/\`
- Default to editing existing files; only create new files when the spec demands it
- If you hit a hard blocker (missing schema, ambiguous spec, external dep unavailable), append a note to NOTES.md in this worktree describing what you tried and why you stopped, then end the task

VERIFICATION (best-effort, run before declaring done):
- \`cd backend && uv run pytest -x -q\` if you touched backend/
- \`cd frontend && bun run typecheck\` if you touched frontend/
- If verification fails, fix what you can; if you cannot fix in 2 attempts, note it in NOTES.md and stop

COMMITS:
- Make focused, atomic commits with clear messages
- Sign-off not required; conventional-commit style preferred (\`feat(area): …\`)

PROJECT SPEC FOLLOWS:

EOF
  cat "$readme"
}

run_one() {
  local status="$1" slug="$2"
  local readme="docs/projects/$slug/README.md"

  local prev; prev=$(state_get_outcome "$slug")
  case "$prev" in
    ok)
      log "SKIP $slug — already ok"
      return 0
      ;;
    in-progress)
      log "WARN $slug — previous run interrupted; retrying"
      ;;
  esac

  log "=== $slug ($status) ==="

  local wt branch
  wt=$(existing_worktree_for "$slug")
  if [ -z "$wt" ]; then
    branch="dirac/$slug"
    wt="$REPO_ROOT/.worktrees/dirac-$slug"
    log "Creating worktree $wt on branch $branch"
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git worktree add "$wt" "$branch" >>"$LOG_DIR/$slug.log" 2>&1
    else
      git worktree add "$wt" -b "$branch" "$DEFAULT_BRANCH" >>"$LOG_DIR/$slug.log" 2>&1
    fi
  else
    log "Reusing worktree $wt"
    branch=$(git -C "$wt" rev-parse --abbrev-ref HEAD)
  fi

  local prompt_file="$PROMPT_DIR/$slug.txt"
  build_prompt "$slug" "$wt" "$readme" > "$prompt_file"

  state_set "$slug" \
    outcome=in-progress \
    branch="$branch" \
    worktree="$wt" \
    started_at="$(now)"

  log "Launching dirac (timeout=${PER_PROJECT_TIMEOUT}s, max-mistakes=${MAX_CONSECUTIVE_MISTAKES})…"
  local exit_code=0
  timeout --kill-after=60 "$PER_PROJECT_TIMEOUT" \
    "$WRAPPER" \
      -y \
      --max-consecutive-mistakes "$MAX_CONSECUTIVE_MISTAKES" \
      -c "$wt" \
      "$(cat "$prompt_file")" \
      </dev/null \
      >>"$LOG_DIR/$slug.log" 2>&1 || exit_code=$?

  local outcome
  case $exit_code in
    0)   outcome=ok ;;
    124) outcome=timeout ;;
    137) outcome=killed ;;
    *)   outcome=error ;;
  esac
  log "Dirac exit=$exit_code → $outcome"

  if tail -300 "$LOG_DIR/$slug.log" 2>/dev/null | grep -qiE '(429|rate.?limit|too many requests|insufficient.?credits)'; then
    log "RATE LIMIT signal detected — sleeping ${RATE_LIMIT_BACKOFF}s"
    sleep "$RATE_LIMIT_BACKOFF"
  fi

  local commits_ahead=0
  if [ -d "$wt" ]; then
    if [ -n "$(git -C "$wt" status --porcelain)" ]; then
      log "Committing dirty state in $wt"
      git -C "$wt" add -A
      git -C "$wt" commit -m "WIP: dirac autorun for $slug ($outcome)" >>"$LOG_DIR/$slug.log" 2>&1 || true
    fi
    commits_ahead=$(git -C "$wt" rev-list --count "$DEFAULT_BRANCH..HEAD" 2>/dev/null || echo 0)
  fi

  local pr_url=""
  if [ "$commits_ahead" -gt 0 ]; then
    log "Pushing $branch ($commits_ahead commits)…"
    if git -C "$wt" push -u origin "$branch" >>"$LOG_DIR/$slug.log" 2>&1; then
      if ! gh pr view "$branch" --json url >/dev/null 2>&1; then
        local body
        body=$(printf 'Auto-generated by the Dirac runner on %s.\n\n**Project:** `%s`\n**Status before run:** %s\n**Outcome:** %s\n**Commits:** %s\n**Spec:** [docs/projects/%s/README.md](https://github.com/pike00/personal-crm/blob/%s/docs/projects/%s/README.md)\n\n> Generated autonomously with the free-tier OpenRouter model `tencent/hy3-preview:free`. Review carefully before merging.\n\nLog: `.dirac-runner/logs/%s.log`\n' \
          "$(now)" "$slug" "$status" "$outcome" "$commits_ahead" "$slug" "$branch" "$slug" "$slug")
        pr_url=$(gh pr create --draft \
          --base "$DEFAULT_BRANCH" \
          --head "$branch" \
          --title "[dirac] $slug" \
          --body "$body" 2>>"$LOG_DIR/$slug.log" | tail -1) || true
      else
        pr_url=$(gh pr view "$branch" --json url -q .url 2>/dev/null || true)
      fi
    fi
  fi

  state_set "$slug" \
    outcome="$outcome" \
    exit_code="$exit_code" \
    commits_ahead="$commits_ahead" \
    pr_url="${pr_url:-}" \
    finished_at="$(now)"

  log "DONE $slug — outcome=$outcome commits=$commits_ahead pr=${pr_url:-none}"
}

main() {
  preflight

  local plan
  plan=$(discover_projects | awk -F'\t' '
    $1 == "in-progress" { print "1\t" $0 }
    $1 == "paused"      { print "2\t" $0 }
    $1 == "active"      { print "3\t" $0 }
  ' | sort -k1,1 -k3,3 | cut -f2-)

  if [ -n "${ONLY_SLUG:-}" ]; then
    plan=$(printf '%s\n' "$plan" | awk -F'\t' -v s="$ONLY_SLUG" '$2 == s')
    [ -n "$plan" ] || { log "FATAL: ONLY_SLUG=$ONLY_SLUG not in plan"; exit 2; }
  fi

  local total; total=$(printf '%s\n' "$plan" | grep -c .)
  log "Discovered $total projects"

  if [ -n "${DRY_RUN:-}" ]; then
    log "DRY_RUN — plan:"
    printf '%s\n' "$plan" | nl -ba
    exit 0
  fi

  local i=0
  while IFS=$'\t' read -r status slug; do
    [ -z "$slug" ] && continue
    i=$((i+1))
    log "[$i/$total] $slug ($status)"
    run_one "$status" "$slug"
    log "Cooldown ${INTER_PROJECT_COOLDOWN}s…"
    sleep "$INTER_PROJECT_COOLDOWN"
  done <<< "$plan"

  log "ALL DONE"
  log "Summary:"
  jq -r 'to_entries | map([.key, .value.outcome // "?", (.value.commits_ahead // 0|tostring), .value.pr_url // ""] | join("  ")) | .[]' "$STATE_FILE" | tee -a "$RUNNER_LOG"
}

main "$@"
