#!/usr/bin/env python3
"""
Generate release notes from conventional commits since the last tag.

Usage:
    python scripts/generate-release-notes.py [--since-tag <tag>] [--to-ref <ref>]

Output:
    Markdown-formatted release notes written to stdout.
"""

import argparse
import re
import subprocess
import sys
from collections import defaultdict
from typing import Dict, List, Tuple


# Conventional commit types and their display labels
TYPE_LABELS = {
    "feat": "Features",
    "fix": "Fixes",
    "docs": "Documentation",
    "style": "Styling",
    "refactor": "Refactoring",
    "perf": "Performance",
    "test": "Tests",
    "chore": "Chores",
    "ci": "CI/CD",
    "build": "Build",
    "revert": "Reverts",
}

# Emoji mapping for each type
TYPE_EMOJI = {
    "feat": "✨",
    "fix": "🐛",
    "docs": "📚",
    "style": "💄",
    "refactor": "♻️",
    "perf": "⚡",
    "test": "🧪",
    "chore": "🔧",
    "ci": "🚀",
    "build": "📦",
    "revert": "⏪",
}


def get_latest_tag() -> str | None:
    """Get the latest tag in the repo."""
    try:
        result = subprocess.run(
            ["git", "tag", "--sort=-v:refname"],
            capture_output=True,
            text=True,
            check=True,
        )
        tags = result.stdout.strip().split("\n")
        return tags[0] if tags and tags[0] else None
    except subprocess.CalledProcessError:
        return None


def get_commits(since_tag: str | None, to_ref: str = "HEAD") -> List[str]:
    """Get commit messages since the given tag (or all commits if no tag)."""
    if since_tag:
        ref_range = f"{since_tag}..{to_ref}"
    else:
        ref_range = to_ref

    try:
        result = subprocess.run(
            ["git", "log", ref_range, "--oneline", "--no-merges"],
            capture_output=True,
            text=True,
            check=True,
        )
        return [
            line.strip() for line in result.stdout.strip().split("\n") if line.strip()
        ]
    except subprocess.CalledProcessError:
        return []


def parse_conventional_commit(commit_line: str) -> Tuple[str, str, bool, str]:
    """
    Parse a conventional commit message.

    Returns:
        Tuple of (type, scope, is_breaking, description)

    Example:
        "feat(auth): add login endpoint" -> ("feat", "auth", False, "add login endpoint")
        "fix!: correct calculation" -> ("fix", "", True, "correct calculation")
    """
    # Pattern: type(scope)!: description or type: description
    pattern = r"^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.*)$"
    match = re.match(pattern, commit_line)

    if match:
        commit_type = match.group(1)
        scope = match.group(2) or ""
        is_breaking = bool(match.group(3))
        description = match.group(4)
        return commit_type, scope, is_breaking, description

    # Not a conventional commit
    return "other", "", False, commit_line


def group_commits(commits: List[str]) -> Dict[str, List[str]]:
    """Group commits by their conventional commit type."""
    groups: Dict[str, List[str]] = defaultdict(list)
    breaking_changes: List[str] = []

    for commit in commits:
        # Extract just the description part (remove hash)
        parts = commit.split(" ", 1)
        description = parts[1] if len(parts) > 1 else commit

        commit_type, scope, is_breaking, desc = parse_conventional_commit(description)

        # Format the entry
        if scope:
            entry = f"- **{scope}**: {desc}"
        else:
            entry = f"- {desc}"

        if is_breaking:
            breaking_changes.append(entry)

        if commit_type == "other":
            groups["other"].append(entry)
        else:
            groups[commit_type].append(entry)

    # Create result with breaking changes at the top if any
    result = {}
    if breaking_changes:
        result["breaking"] = breaking_changes
    result.update(groups)
    return result


def generate_markdown(
    groups: Dict[str, List[str]],
    version: str,
    previous_tag: str | None,
) -> str:
    """Generate markdown release notes."""
    lines = []

    # Header
    lines.append(f"## Release {version}")
    lines.append("")

    # Breaking changes first
    if "breaking" in groups:
        lines.append("### ⚠️ Breaking Changes")
        lines.append("")
        lines.extend(groups["breaking"])
        lines.append("")

    # Other groups in preferred order
    ordered_types = [
        "feat",
        "fix",
        "docs",
        "perf",
        "refactor",
        "style",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
    ]

    for commit_type in ordered_types:
        if commit_type in groups and commit_type != "other":
            label = TYPE_LABELS.get(commit_type, commit_type.title())
            emoji = TYPE_EMOJI.get(commit_type, "")
            lines.append(f"### {emoji} {label}")
            lines.append("")
            lines.extend(groups[commit_type])
            lines.append("")

    # Other (non-conventional commits)
    if "other" in groups:
        lines.append("### 📝 Other Changes")
        lines.append("")
        lines.extend(groups["other"])
        lines.append("")

    # Footer with comparison link
    if previous_tag:
        lines.append(
            f"**Full Changelog**: https://github.com/williamtayzzz/personal-crm/compare/{previous_tag}...{version}"
        )
    else:
        lines.append(
            f"**Full Changelog**: https://github.com/williamtayzzz/personal-crm/commits/{version}"
        )

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Generate release notes from conventional commits"
    )
    parser.add_argument(
        "--since-tag",
        help="Tag to start from (default: latest tag)",
        default=None,
    )
    parser.add_argument(
        "--to-ref",
        help="End reference (default: HEAD)",
        default="HEAD",
    )
    parser.add_argument(
        "--version",
        help="Version string for the release (default: derived from tag or 'unreleased')",
        default=None,
    )

    args = parser.parse_args()

    # Determine the starting tag
    since_tag = args.since_tag or get_latest_tag()

    # Determine version
    version = args.version
    if not version:
        if since_tag:
            version = "unreleased"
        else:
            version = "initial"

    # Get commits
    commits = get_commits(since_tag, args.to_ref)

    if not commits:
        print("No commits found to generate release notes.")
        sys.exit(0)

    # Group commits
    groups = group_commits(commits)

    # Generate markdown
    markdown = generate_markdown(groups, version, since_tag)

    print(markdown)


if __name__ == "__main__":
    main()
