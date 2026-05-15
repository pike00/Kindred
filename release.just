# Shared release recipes — imported by per-repo justfiles.
#
# Provides the parts that ARE the same across every repo:
#   - `release LEVEL`  — release-kit cut (preflight, git-cliff CHANGELOG.md,
#                        LLM notes, editor review, tag, push, GH release)
#   - `changelog-*`    — preview / backfill CHANGELOG.md via git-cliff
#   - `notes-dry-run`  — render LLM notes against current HEAD without committing
#
# `publish` and `bump` are NOT included here because they vary per repo:
# different images, different Dockerfiles, different deploy targets, sometimes
# multiple images per repo, sometimes PyPI instead of GHCR. Each repo defines
# those in its own justfile, but the shape stays consistent (see the other
# repos for reference).
#
# Usage: copy this file into the repo and add `import 'release.just'` to the
# main justfile.

# Cut a new release: bump LEVEL (patch|minor|major), update CHANGELOG.md via
# git-cliff, draft GH release notes via LiteLLM (deepseek-v4-pro-cloud),
# review in $EDITOR, tag, push, create GH release.
release level:
    @release-kit cut {{level}}

# Same as `release` but skip the final confirm prompt (scripted use).
release-yes level:
    @release-kit cut {{level}} --yes

# Regenerate CHANGELOG.md from scratch from git history. Destructive — overwrites
# the existing file. Use after authoring `cliff.toml` for the first time.
changelog-backfill:
    uvx git-cliff@latest --output CHANGELOG.md
    @echo "✓ CHANGELOG.md regenerated from full git history"

# Preview the unreleased changelog section without writing anything.
changelog-preview:
    uvx git-cliff@latest --unreleased

# Draft release notes for HEAD vs last tag without making any changes. Prints
# {title, body} JSON to stdout. Useful for prompt iteration.
notes-dry-run:
    @release-kit notes
