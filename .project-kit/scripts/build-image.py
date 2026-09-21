#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = [
#   "typer>=0.12",
# ]
# ///
"""Build immutable release images after verifying release provenance."""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import tarfile
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from string import Template
from typing import Never

import typer

IMAGES_JSON = r"""[{"build_args": {"VITE_API_URL": "${VITE_API_URL:-}"}, "context": ".", "dockerfile": "Dockerfile.prod", "name": "kindred", "registry": "ghcr.io/pike00"}]"""
IMAGES = json.loads(IMAGES_JSON)
SEMVER = re.compile(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?")


@dataclass(frozen=True)
class GitHubRelease:
    tag_name: str
    is_draft: bool
    url: str


@dataclass
class ImagePlan:
    image: dict[str, object]
    name: str
    digest: str | None
    action: str


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, check=True, capture_output=True, text=True)


def _run_visible(
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    failure: str,
) -> None:
    try:
        subprocess.run(command, check=True, text=True, cwd=cwd, env=env)
    except (OSError, subprocess.CalledProcessError):
        _fail(failure)


def _fail(message: str) -> Never:
    typer.echo(f"error: {message}", err=True)
    raise typer.Exit(code=1)


def _is_clean() -> bool:
    return _run(["git", "status", "--porcelain"]).stdout.strip() == ""


def _revision(ref: str) -> str:
    try:
        return _run(["git", "rev-parse", "--verify", ref]).stdout.strip()
    except subprocess.CalledProcessError:
        _fail(f"git ref {ref} is missing or invalid")


def _remote_tag_commit(tag: str) -> str | None:
    direct_ref = f"refs/tags/{tag}"
    peeled_ref = f"{direct_ref}^" + "{}"
    result = subprocess.run(
        ["git", "ls-remote", "--exit-code", "--tags", "origin", direct_ref, peeled_ref],
        capture_output=True,
        check=False,
        text=True,
    )
    if result.returncode == 2:
        return None
    if result.returncode != 0:
        _fail(f"could not verify remote tag {tag}")
    refs = {
        ref: oid
        for line in result.stdout.splitlines()
        if "\t" in line
        for oid, ref in [line.split("\t", 1)]
    }
    return refs.get(peeled_ref) or refs.get(direct_ref)


def _github_release(tag: str) -> GitHubRelease | None:
    result = subprocess.run(
        ["gh", "release", "view", tag, "--json", "isDraft,tagName,url"],
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
        _fail(f"GitHub release {tag} returned invalid metadata")


def _registry_digest_optional(image: str, tag: str) -> str | None:
    try:
        result = subprocess.run(
            ["crane", "digest", f"{image}:{tag}"],
            capture_output=True,
            check=False,
            text=True,
        )
    except OSError:
        _fail(f"could not query registry tag {image}:{tag}")
    if result.returncode == 0:
        digest = result.stdout.strip()
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
            _fail(f"registry returned an invalid digest for {image}:{tag}")
        return digest
    diagnostic = f"{result.stdout}\n{result.stderr}".lower()
    missing_markers = (
        "manifest unknown",
        "manifest_unknown",
        "name unknown",
        "name_unknown",
    )
    if any(marker in diagnostic for marker in missing_markers):
        return None
    _fail(f"could not prove registry tag {image}:{tag} is absent")


def _registry_digest(image: str, tag: str) -> str:
    digest = _registry_digest_optional(image, tag)
    if digest is None:
        _fail(f"could not verify pushed digest for {image}:{tag}")
    return digest


def _registry_labels(image: str, digest: str) -> dict[str, str]:
    try:
        result = subprocess.run(
            ["crane", "--platform", "linux/amd64", "config", f"{image}@{digest}"],
            capture_output=True,
            check=False,
            text=True,
        )
    except OSError:
        _fail(f"could not inspect OCI provenance for {image}")
    if result.returncode != 0:
        _fail(f"could not inspect OCI provenance for {image}")
    try:
        payload = json.loads(result.stdout)
        labels = payload["config"].get("Labels")
    except (AttributeError, KeyError, TypeError, json.JSONDecodeError):
        _fail(f"registry returned invalid OCI config metadata for {image}")
    if labels is None:
        return {}
    if not isinstance(labels, dict) or not all(
        isinstance(key, str) and isinstance(value, str) for key, value in labels.items()
    ):
        _fail(f"registry returned invalid OCI labels for {image}")
    return labels


def _verified_registry_digest(
    image: str,
    tag: str,
    head: str,
    *,
    expected_digest: str | None = None,
    missing_ok: bool = False,
) -> str | None:
    first_digest = _registry_digest_optional(image, tag)
    if first_digest is None:
        if missing_ok:
            return None
        _fail(f"immutable registry tag disappeared: {image}:{tag}")
    labels = _registry_labels(image, first_digest)
    revision = labels.get("org.opencontainers.image.revision")
    version = labels.get("org.opencontainers.image.version")
    if revision is None or version is None:
        _fail(f"immutable image {image}:{tag} is missing required OCI provenance labels")
    if revision != head:
        _fail(f"immutable image {image}:{tag} OCI revision does not match release commit")
    if version != tag:
        _fail(f"immutable image {image}:{tag} OCI version does not match release tag")
    second_digest = _registry_digest_optional(image, tag)
    if second_digest != first_digest:
        _fail(f"immutable registry tag {image}:{tag} changed during verification")
    if expected_digest is not None and first_digest != expected_digest:
        _fail(f"immutable registry digest for {image}:{tag} does not match expected digest")
    return first_digest


def _validated_target(tag: str) -> str:
    if SEMVER.fullmatch(tag) is None:
        _fail("an existing SemVer release tag is required, for example v1.2.3")
    if not _is_clean():
        _fail("working tree not clean")
    head = _revision("HEAD")
    tag_commit = _revision(f"refs/tags/{tag}^" + "{commit}")
    if tag_commit != head:
        _fail(f"local tag {tag} does not resolve to HEAD")
    remote_commit = _remote_tag_commit(tag)
    if remote_commit is None:
        _fail(f"remote tag {tag} is missing")
    if remote_commit != head:
        _fail(f"remote tag {tag} does not resolve to HEAD")
    release = _github_release(tag)
    if release is None:
        _fail(f"GitHub release {tag} is missing")
    if release.tag_name != tag:
        _fail(f"GitHub release does not match {tag}")
    if release.is_draft:
        _fail(f"GitHub release {tag} is still a draft")
    return head


@contextmanager
def _materialized_tree(head: str) -> Iterator[Path]:
    with tempfile.TemporaryDirectory(prefix="project-kit-source-") as temporary:
        temporary_root = Path(temporary)
        archive = temporary_root / "source.tar"
        source_root = temporary_root / "tree"
        source_root.mkdir()
        try:
            _run(["git", "archive", "--format=tar", f"--output={archive}", head])
            with tarfile.open(archive, mode="r:") as source_archive:
                source_archive.extractall(source_root, filter="data")
        except (OSError, subprocess.CalledProcessError, tarfile.TarError):
            _fail(f"could not materialize exact Git tree {head}")
        yield source_root


def _materialized_path(source_root: Path, configured: object, *, kind: str) -> Path:
    relative = Path(str(configured))
    if relative.is_absolute() or ".." in relative.parts:
        _fail(f"configured {kind} must be a path inside the Git tree")
    try:
        resolved_root = source_root.resolve(strict=True)
        resolved = (resolved_root / relative).resolve(strict=True)
    except OSError:
        _fail(f"configured {kind} is missing from the exact Git tree")
    if not resolved.is_relative_to(resolved_root):
        _fail(f"configured {kind} escapes the exact Git tree")
    if kind == "Dockerfile" and not resolved.is_file():
        _fail("configured Dockerfile is not a file in the exact Git tree")
    if kind == "build context" and not resolved.is_dir():
        _fail("configured build context is not a directory in the exact Git tree")
    return resolved


def _build_invocation(
    image: dict[str, object],
    tag: str,
    head: str,
    metadata: Path,
    source_root: Path,
) -> tuple[list[str], dict[str, str]]:
    name = f"{image['registry']}/{image['name']}"
    dockerfile = _materialized_path(source_root, image["dockerfile"], kind="Dockerfile")
    context = _materialized_path(source_root, image["context"], kind="build context")
    command = [
        "docker",
        "buildx",
        "build",
        "--platform",
        "linux/amd64",
        "--file",
        str(dockerfile),
        "--tag",
        f"{name}:{tag}",
        "--label",
        f"org.opencontainers.image.revision={head}",
        "--label",
        f"org.opencontainers.image.version={tag}",
        "--build-arg",
        f"APP_VERSION={tag}",
        "--build-arg",
        f"GIT_HASH={head}",
    ]
    child_env = os.environ.copy()
    substitutions = child_env | {"APP_VERSION": tag, "GIT_HASH": head}
    for key, value in dict(image["build_args"]).items():
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", str(key)) is None:
            _fail("build argument names must be shell-compatible identifiers")
        if key in {"APP_VERSION", "GIT_HASH"}:
            _fail(f"build argument {key} is reserved by project-kit")
        try:
            child_env[str(key)] = Template(str(value)).substitute(substitutions)
        except (KeyError, ValueError):
            _fail(f"build argument {key} has an invalid or unavailable variable reference")
        command += ["--build-arg", str(key)]
    cache_key = hashlib.sha256(name.encode()).hexdigest()[:16]
    command += [
        "--cache-from",
        f"type=local,src=/tmp/buildx-cache-{cache_key}",
        "--cache-to",
        f"type=local,dest=/tmp/buildx-cache-{cache_key},mode=max",
        "--metadata-file",
        str(metadata),
        "--push",
        str(context),
    ]
    return command, child_env


def build(tag: str) -> None:
    head = _validated_target(tag)
    plans: list[ImagePlan] = []
    for image in IMAGES:
        name = f"{image['registry']}/{image['name']}"
        digest = _verified_registry_digest(name, tag, head, missing_ok=True)
        plans.append(
            ImagePlan(
                image=image, name=name, digest=digest, action="resumed" if digest else "built"
            )
        )
    missing = [plan for plan in plans if plan.digest is None]
    if missing:
        with _materialized_tree(head) as source_root:
            for plan in missing:
                with tempfile.NamedTemporaryFile(
                    prefix="project-kit-build-", suffix=".json"
                ) as metadata:
                    metadata_path = Path(metadata.name)
                    typer.echo(f"==> building {plan.name} (version {tag}, commit {head})")
                    command, child_env = _build_invocation(
                        plan.image, tag, head, metadata_path, source_root
                    )
                    _run_visible(
                        command,
                        cwd=source_root,
                        env=child_env,
                        failure=f"image build failed for {plan.name}:{tag}",
                    )
                    try:
                        build_metadata = json.loads(metadata_path.read_text())
                        built_digest = str(build_metadata["containerimage.digest"])
                    except (KeyError, OSError, TypeError, json.JSONDecodeError):
                        _fail(f"buildx did not emit digest metadata for {plan.name}:{tag}")
                if re.fullmatch(r"sha256:[0-9a-f]{64}", built_digest) is None:
                    _fail(f"buildx emitted an invalid digest for {plan.name}:{tag}")
                plan.digest = _verified_registry_digest(
                    plan.name, tag, head, expected_digest=built_digest
                )
    for plan in plans:
        if plan.digest is None:
            _fail(f"immutable registry digest was not established for {plan.name}:{tag}")
        plan.digest = _verified_registry_digest(plan.name, tag, head, expected_digest=plan.digest)
    for plan in plans:
        assert plan.digest is not None
        _run_visible(
            ["crane", "tag", f"{plan.name}@{plan.digest}", "latest"],
            failure=f"could not promote latest for {plan.name}:{tag}",
        )
        if _registry_digest(plan.name, "latest") != plan.digest:
            _fail(f"latest tag for {plan.name} does not match the verified release digest")
        typer.echo(
            f"evidence action={plan.action} image={plan.name}:{tag} commit={head} "
            f"digest={plan.digest} release={tag}"
        )


if __name__ == "__main__":
    if len(os.sys.argv) != 2:
        _fail("usage: build-image.py vX.Y.Z")
    build(os.sys.argv[1])
