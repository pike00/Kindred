#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = [
#   "typer>=0.12",
#   "httpx>=0.27",
#   "pydantic-settings>=2.13",
# ]
# ///
"""Release preparation and publication for kindred.

Reads .project-kit/cliff.toml, drafts release notes through the Pikellm gateway,
and creates an exact tag plus GitHub release after the preparation PR merges.
It never commits or pushes a protected base branch. Owned by this repo — edit freely.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

import httpx
import typer
from pydantic import (
    AliasChoices,
    BaseModel,
    Field,
    HttpUrl,
    SecretStr,
    ValidationError,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_NAME = "kindred"
CLIFF_CONFIG = ".project-kit/cliff.toml"
BRANCH = "main"
LITELLM_MODEL = "deepseek-v4-pro-cloud"
DEDICATED_LLM_KEY = False
INSTALL_COMMAND = None
# `just version` prod-version resolution (baked from .project-kit answers).
PROD_SOURCE = "none"
PROD_HOMELAB_ENV = ""
PROD_PYPI_PACKAGE = "kindred"
REQUIRED_CHECK = None
BAKED_LITELLM_BASE_URL: HttpUrl | None = None


class PyPIInfo(BaseModel):
    version: str = Field(min_length=1)


class PyPIProject(BaseModel):
    info: PyPIInfo


@dataclass(frozen=True)
class PublicationTarget:
    branch: str
    tag: str
    oid: str
    base_ref: str


@dataclass(frozen=True)
class GitHubRelease:
    tag_name: str
    is_draft: bool
    url: str


class Settings(BaseSettings):
    """Validated runtime configuration for release operations."""

    model_config = SettingsConfigDict(
        extra="ignore",
        validate_default=True,
    )

    # Public repos bake no private endpoint, so their default is None and the
    # environment must provide PIKELLM_BASE_URL before drafting release notes.
    litellm_base_url: HttpUrl | None = Field(
        default=BAKED_LITELLM_BASE_URL,
        validation_alias=AliasChoices("PIKELLM_BASE_URL", "LITELLM_BASE_URL"),
    )
    litellm_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("PIKELLM_API_KEY", "LITELLM_API_KEY"),
    )
    openai_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="OPENAI_API_KEY",
    )
    home: Path = Field(default_factory=Path.home, validation_alias="HOME")

    @field_validator("home", mode="before")
    @classmethod
    def _home_must_not_be_empty(cls, value: object) -> object:
        if value == "":
            raise ValueError("HOME must not be empty")
        return value

    @field_validator("litellm_base_url", mode="before")
    @classmethod
    def _empty_url_uses_baked_default(cls, value: object) -> object | None:
        if value == "":
            return BAKED_LITELLM_BASE_URL
        return value

    @field_validator("litellm_api_key", "openai_api_key", mode="before")
    @classmethod
    def _empty_secret_is_unset(cls, value: object) -> object | None:
        return None if value == "" else value

    @model_validator(mode="after")
    def _legacy_litellm_key(self) -> Settings:
        """Load the legacy key only when neither preferred environment key exists."""
        if DEDICATED_LLM_KEY:
            return self
        if self.litellm_api_key or self.openai_api_key:
            return self
        cfg_path = self.home / ".config" / "litellm" / "config.json"
        if not cfg_path.is_file():
            return self
        try:
            decoded = json.loads(cfg_path.read_text())
        except (OSError, json.JSONDecodeError):
            return self
        if not isinstance(decoded, Mapping):
            return self
        value = decoded.get("api_key", "")
        if isinstance(value, str) and value:
            self.litellm_api_key = SecretStr(value)
        return self

    @property
    def llm_api_key(self) -> SecretStr | None:
        if DEDICATED_LLM_KEY:
            return self.litellm_api_key
        return self.litellm_api_key or self.openai_api_key

    def _homelab_env_text(self, env_path: Path) -> str:
        try:
            if not env_path.name.endswith(".sops"):
                return env_path.read_text()
            secrets_cli = self.home / "projects" / "Homelab" / "infra" / "scripts" / "secrets"
            if not secrets_cli.is_file():
                raise ValueError(f"Homelab secrets helper not found: {secrets_cli}")
            return subprocess.run(
                [str(secrets_cli), "sopsx", str(env_path), "-d"],
                capture_output=True,
                check=True,
                text=True,
                timeout=10,
            ).stdout
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
            raise ValueError(f"unable to read Homelab env file: {env_path}") from None

    def homelab_image_tag(self, relative_env: str) -> tuple[Path, bool, str | None]:
        """Read IMAGE_TAG from the configured HOME-relative homelab env file."""
        try:
            homelab_root = (self.home / "projects" / "Homelab").resolve()
            env_path = (homelab_root / relative_env).resolve()
            env_path.relative_to(homelab_root)
        except (OSError, RuntimeError, ValueError):
            raise ValueError("Homelab env path must stay within the Homelab repository") from None
        if not env_path.is_file():
            return env_path, False, None
        for raw in self._homelab_env_text(env_path).splitlines():
            line = raw.strip()
            if line.startswith("IMAGE_TAG="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                return env_path, True, value
        return env_path, True, None


SETTINGS = Settings()

app = typer.Typer(add_completion=False)


def _run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def _github_release(version: str) -> GitHubRelease | None:
    result = subprocess.run(
        ["gh", "release", "view", version, "--json", "isDraft,tagName,url"],
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode != 0:
        return None
    try:
        payload = json.loads(result.stdout)
        return GitHubRelease(
            tag_name=str(payload["tagName"]),
            is_draft=bool(payload["isDraft"]),
            url=str(payload["url"]),
        )
    except (KeyError, TypeError, json.JSONDecodeError):
        typer.echo(f"error: GitHub release {version} returned invalid metadata", err=True)
        raise typer.Exit(code=1) from None


def _require_successful_check(oid: str) -> None:
    """Require the configured GitHub check run to succeed for exact ``oid``."""
    if REQUIRED_CHECK is None:
        return
    repo = _run(
        ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]
    ).stdout.strip()
    endpoint = f"repos/{repo}/commits/{oid}/check-runs?per_page=100"
    try:
        payload = json.loads(
            _run(
                [
                    "gh",
                    "api",
                    "-H",
                    "Accept: application/vnd.github+json",
                    endpoint,
                ]
            ).stdout
        )
        runs = payload["check_runs"]
        matching = [run for run in runs if run.get("name") == REQUIRED_CHECK]
    except (AttributeError, KeyError, TypeError, json.JSONDecodeError):
        typer.echo("error: GitHub returned invalid required-check metadata", err=True)
        raise typer.Exit(code=1) from None
    if not matching:
        typer.echo(
            f"error: required GitHub Actions check {REQUIRED_CHECK!r} is missing for {oid}",
            err=True,
        )
        raise typer.Exit(code=1)
    latest = max(matching, key=lambda run: int(run.get("id", 0)))
    if latest.get("head_sha") != oid:
        typer.echo(
            f"error: required GitHub Actions check {REQUIRED_CHECK!r} reported the wrong commit",
            err=True,
        )
        raise typer.Exit(code=1)
    app = latest.get("app")
    if not isinstance(app, dict) or app.get("slug") != "github-actions":
        typer.echo(
            f"error: required check {REQUIRED_CHECK!r} was not produced by GitHub Actions",
            err=True,
        )
        raise typer.Exit(code=1)
    if latest.get("status") != "completed":
        typer.echo(
            f"error: required GitHub Actions check {REQUIRED_CHECK!r} is pending for {oid}",
            err=True,
        )
        raise typer.Exit(code=1)
    if latest.get("conclusion") != "success":
        typer.echo(
            f"error: required GitHub Actions check {REQUIRED_CHECK!r} did not succeed for {oid}",
            err=True,
        )
        raise typer.Exit(code=1)


def _current_branch() -> str:
    return _run(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()


def _is_clean() -> bool:
    return _run(["git", "status", "--porcelain"]).stdout.strip() == ""


def _is_linked_worktree() -> bool:
    common = Path(_run(["git", "rev-parse", "--git-common-dir"]).stdout.strip()).resolve()
    git_dir = Path(_run(["git", "rev-parse", "--git-dir"]).stdout.strip()).resolve()
    return common != git_dir


def _revision(ref: str) -> str:
    return _run(["git", "rev-parse", ref]).stdout.strip()


def _ref_exists(ref: str) -> bool:
    result = subprocess.run(
        ["git", "show-ref", "--verify", "--quiet", ref],
        check=False,
    )
    return result.returncode == 0


def _ref_target(ref: str) -> str | None:
    if not _ref_exists(ref):
        return None
    return _revision(ref)


def _remote_tag_target(tag: str) -> str | None:
    direct_ref = f"refs/tags/{tag}"
    peeled_ref = f"{direct_ref}^" + "{}"
    result = subprocess.run(
        [
            "git",
            "ls-remote",
            "--exit-code",
            "--tags",
            "origin",
            direct_ref,
            peeled_ref,
        ],
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode == 2:
        return None
    if result.returncode == 0:
        refs = {
            ref: oid
            for line in result.stdout.splitlines()
            if "\t" in line
            for oid, ref in [line.split("\t", 1)]
        }
        return refs.get(direct_ref)
    typer.echo("error: could not verify whether the release tag already exists", err=True)
    raise typer.Exit(code=1)


def _changelog_contains_release(changelog: str, tag: str) -> bool:
    version = re.escape(tag.removeprefix("v"))
    return re.search(rf"^## \[{version}\](?:\s|$)", changelog, re.MULTILINE) is not None


def _release_is_in_changelog(release_ref: str, tag: str) -> bool:
    changelog = _run(["git", "show", f"{release_ref}:CHANGELOG.md"]).stdout
    return _changelog_contains_release(changelog, tag)


def _latest_tag() -> str | None:
    try:
        return _run(["git", "describe", "--tags", "--abbrev=0", "--match", "v*"]).stdout.strip()
    except subprocess.CalledProcessError:
        return None


def _next_version(level: str) -> str:
    last = _latest_tag() or "v0.0.0"
    m = re.match(r"v(\d+)\.(\d+)\.(\d+)", last)
    if not m:
        raise typer.Exit(code=1)
    major, minor, patch = map(int, m.groups())
    if level == "major":
        return f"v{major + 1}.0.0"
    if level == "minor":
        return f"v{major}.{minor + 1}.0"
    return f"v{major}.{minor}.{patch + 1}"


def _draft_notes(version: str, prev_tag: str | None, end_ref: str) -> str:
    """Draft release notes via the configured LLM endpoint. Empty on failure."""
    base_url = str(SETTINGS.litellm_base_url or "").rstrip("/")
    api_key = SETTINGS.llm_api_key
    if not base_url or api_key is None:
        return ""
    try:
        rng = f"{prev_tag}..{end_ref}" if prev_tag else end_ref
        commits = _run(["git", "log", rng, "--pretty=format:- %h %s"]).stdout
        prompt = (
            f"Draft a short, editorial GitHub release narrative for {PROJECT_NAME} {version}.\n"
            f"Commits in this release:\n{commits}\n\n"
            f"{(
                'Install: ' + INSTALL_COMMAND.replace('{version}', version.lstrip('v'))
                if INSTALL_COMMAND else ''
            )}\n"
        )
        r = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key.get_secret_value()}"} if api_key else {},
            json={"model": LITELLM_MODEL, "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        r.raise_for_status()
        return str(r.json()["choices"][0]["message"]["content"])
    except (httpx.HTTPError, KeyError, json.JSONDecodeError) as exc:
        typer.echo(f"[warn] Pikellm draft failed: {exc}", err=True)
        return ""


def preflight_prepare() -> None:
    typer.echo("[1/3] preparation preflight…")
    if not _is_clean():
        typer.echo("error: working tree not clean", err=True)
        raise typer.Exit(code=1)
    branch = _current_branch()
    if branch == BRANCH:
        typer.echo(
            "error: prepare releases on a task branch and merge them by pull request", err=True
        )
        raise typer.Exit(code=1)
    if not _is_linked_worktree():
        typer.echo("error: release preparation requires a linked task worktree", err=True)
        raise typer.Exit(code=1)
    if not Path(CLIFF_CONFIG).is_file():
        typer.echo(f"error: {CLIFF_CONFIG} missing", err=True)
        raise typer.Exit(code=1)
    typer.echo("       ok")


def _validate_tag_state(target: PublicationTarget) -> bool:
    local_target = _ref_target(f"refs/tags/{target.tag}")
    if local_target is not None and local_target != target.oid:
        typer.echo(f"error: local tag {target.tag} points at a different commit", err=True)
        raise typer.Exit(code=1)
    remote_target = _remote_tag_target(target.tag)
    if remote_target is not None and remote_target != target.oid:
        typer.echo(f"error: remote tag {target.tag} points at a different commit", err=True)
        raise typer.Exit(code=1)
    return remote_target is not None


def preflight_publish(tag: str) -> PublicationTarget:
    typer.echo("[1/4] publication preflight…")
    if not _is_clean():
        typer.echo("error: working tree not clean", err=True)
        raise typer.Exit(code=1)
    branch = _current_branch()
    if branch == BRANCH:
        typer.echo(
            "error: publish from a fresh merged task worktree, not the protected base", err=True
        )
        raise typer.Exit(code=1)
    if not _is_linked_worktree():
        typer.echo("error: release publication requires a linked task worktree", err=True)
        raise typer.Exit(code=1)
    release_ref = f"refs/remotes/origin/{BRANCH}"
    _run(["git", "fetch", "origin", f"refs/heads/{BRANCH}:{release_ref}"])
    head_oid = _revision("HEAD")
    if head_oid != _revision(release_ref):
        typer.echo(
            f"error: HEAD must exactly match updated origin/{BRANCH}; start a fresh publication worktree",
            err=True,
        )
        raise typer.Exit(code=1)
    if not _release_is_in_changelog(release_ref, tag):
        typer.echo(f"error: {tag} is not present in origin/{BRANCH}:CHANGELOG.md", err=True)
        raise typer.Exit(code=1)
    target = PublicationTarget(branch=branch, tag=tag, oid=head_oid, base_ref=release_ref)
    _require_successful_check(target.oid)
    _validate_tag_state(target)
    typer.echo("       ok")
    return target


def revalidate_publish(target: PublicationTarget) -> bool:
    """Recheck immutable publication facts immediately before creating the tag."""
    if not _is_clean() or not _is_linked_worktree() or _current_branch() != target.branch:
        typer.echo("error: publication worktree changed after preflight", err=True)
        raise typer.Exit(code=1)
    _run(["git", "fetch", "origin", f"refs/heads/{BRANCH}:{target.base_ref}"])
    if _revision("HEAD") != target.oid or _revision(target.base_ref) != target.oid:
        typer.echo("error: HEAD or authoritative base changed after preflight", err=True)
        raise typer.Exit(code=1)
    if not _release_is_in_changelog(target.base_ref, target.tag):
        typer.echo(f"error: {target.tag} disappeared from the authoritative changelog", err=True)
        raise typer.Exit(code=1)
    _require_successful_check(target.oid)
    return _validate_tag_state(target)


@app.command()
def prepare(
    level: str = typer.Argument(..., help="patch | minor | major"),
    dry_run: bool = typer.Option(False, "--dry-run"),
) -> None:
    if level not in ("patch", "minor", "major"):
        typer.echo(f"error: bad level {level}", err=True)
        raise typer.Exit(code=1)
    if not dry_run:
        preflight_prepare()
    version = _next_version(level)
    typer.echo(f"[2/3] next version: {version}")
    if dry_run:
        typer.echo(f"[dry-run] would prepare CHANGELOG.md for {version}; no commit or push")
        return
    changelog_path = Path("CHANGELOG.md")
    changelog_exists = changelog_path.is_file()
    if changelog_exists and _changelog_contains_release(changelog_path.read_text(), version):
        typer.echo(f"error: {version} is already present in CHANGELOG.md", err=True)
        raise typer.Exit(code=1)
    typer.echo("[3/3] preparing CHANGELOG.md via git-cliff…")
    output_mode = "--prepend" if changelog_exists else "--output"
    _run(
        [
            "uvx",
            "git-cliff@latest",
            "--config",
            CLIFF_CONFIG,
            "--unreleased",
            "--tag",
            version,
            output_mode,
            "CHANGELOG.md",
        ]
    )
    typer.echo(
        f"prepared {version}. Commit CHANGELOG.md atomically, test the branch, "
        "then merge its pull request."
    )


@app.command()
def publish(
    tag: str = typer.Argument(..., help="exact vX.Y.Z tag prepared and merged by pull request"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    draft: bool = typer.Option(False, "--draft"),
) -> None:
    if re.fullmatch(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", tag) is None:
        typer.echo(f"error: bad release tag {tag}", err=True)
        raise typer.Exit(code=1)
    target = preflight_publish(tag)
    if dry_run:
        typer.echo(
            f"[dry-run] would publish immutable {target.oid} exactly as refs/tags/{tag}; "
            "no protected branch push"
        )
        return
    typer.echo("[2/4] revalidating the exact release commit…")
    remote_tag_exists = revalidate_publish(target)
    tag_ref = f"refs/tags/{tag}"
    if _ref_target(tag_ref) is None:
        _run(["git", "update-ref", tag_ref, target.oid, "0" * 40])
    if _ref_target(tag_ref) != target.oid:
        typer.echo(f"error: local tag {tag} changed before publication", err=True)
        raise typer.Exit(code=1)
    if not remote_tag_exists:
        _run(["git", "push", "origin", f"{tag_ref}:{tag_ref}"])
    typer.echo(f"[3/4] ensuring GitHub release {tag}…")
    existing = _github_release(tag)
    if existing is not None and existing.tag_name != tag:
        typer.echo(f"error: GitHub release does not match {tag}", err=True)
        raise typer.Exit(code=1)
    if existing is not None and existing.is_draft and not draft:
        _run(["gh", "release", "edit", tag, "--draft=false"])
    elif existing is None:
        cmd = ["gh", "release", "create", tag, "--generate-notes"]
        if draft:
            cmd.append("--draft")
        _run(cmd)
    elif not existing.is_draft:
        typer.echo(f"done. URL: {existing.url}")
        return
    typer.echo("[4/4] verifying the GitHub release state…")
    verified = _github_release(tag)
    if verified is None or verified.tag_name != tag:
        typer.echo(f"error: GitHub release {tag} could not be verified", err=True)
        raise typer.Exit(code=1)
    if draft:
        if not verified.is_draft:
            typer.echo(f"error: GitHub release {tag} was expected to remain a draft", err=True)
            raise typer.Exit(code=1)
        typer.echo(f"draft ready. URL: {verified.url}")
        return
    if verified.is_draft:
        typer.echo(f"error: GitHub release {tag} is still a draft", err=True)
        raise typer.Exit(code=1)
    typer.echo(f"done. URL: {verified.url}")


@app.command()
def version() -> None:
    """Print the local latest tag and the deployed prod version (per prod_source)."""
    typer.echo(f"local:  {_latest_tag() or '(none)'}")
    if PROD_SOURCE == "homelab":
        try:
            env_path, exists, image_tag = SETTINGS.homelab_image_tag(PROD_HOMELAB_ENV)
        except ValueError as exc:
            typer.echo(f"prod:   ({exc})", err=True)
            raise typer.Exit(code=1) from exc
        label = f"~/projects/Homelab/{PROD_HOMELAB_ENV} IMAGE_TAG"
        if not exists:
            typer.echo(f"prod:   (file not found: {env_path})   [{label}]", err=True)
            raise typer.Exit(code=1)
        if image_tag is None or not image_tag.strip():
            typer.echo(f"prod:   (IMAGE_TAG not set)   [{label}]", err=True)
            raise typer.Exit(code=1)
        typer.echo(f"prod:   {image_tag}   [{label}]")
    elif PROD_SOURCE == "pypi":
        try:
            response = httpx.get(
                f"https://pypi.org/pypi/{PROD_PYPI_PACKAGE}/json",
                headers={"Accept": "application/json"},
                timeout=10,
            )
            response.raise_for_status()
            deployed = PyPIProject.model_validate(response.json()).info.version
        except (httpx.HTTPError, json.JSONDecodeError, ValidationError) as exc:
            typer.echo(f"prod:   (PyPI lookup failed for {PROD_PYPI_PACKAGE}: {exc})", err=True)
            raise typer.Exit(code=1) from exc
        typer.echo(f"prod:   {deployed}   [PyPI {PROD_PYPI_PACKAGE}]")
    elif PROD_SOURCE == "none":
        typer.echo("prod:   (not configured — prod_source = none)")
    else:
        typer.echo(
            f"prod:   (prod_source={PROD_SOURCE!r} " "not supported by this generated release.py)",
            err=True,
        )
        raise typer.Exit(code=1)


@app.command()
def notes(tag: str = typer.Option(..., "--tag")) -> None:
    """Regenerate notes for an existing tag (no commit, no push)."""
    prev = (
        _run(
            ["git", "describe", "--tags", "--abbrev=0", f"{tag}^", "--match", "v*"],
        ).stdout.strip()
        or None
    )
    content = _draft_notes(tag, prev, tag)
    sys.stdout.write(content)


if __name__ == "__main__":
    app()
