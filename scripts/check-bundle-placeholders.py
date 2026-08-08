#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = [
#     "pydantic-settings>=2.0.0",
#     "typer>=0.12.0",
# ]
# ///
"""Scan built frontend assets in frontend/dist/ for prohibited placeholder URLs.

Fails with exit code 1 if any placeholder domain (e.g. example.com, localhost:8000)
is detected in production JavaScript or HTML output.
"""
from __future__ import annotations

from pathlib import Path
import sys
from pydantic_settings import BaseSettings, SettingsConfigDict
import typer

app = typer.Typer(add_completion=False)


class ScanSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SCAN_BUNDLE_",
        extra="ignore",
    )
    dist_dir: str = "frontend/dist"
    prohibited_placeholders: list[str] = [
        "//kindred.example.com",
        "http://kindred.example.com",
        "https://kindred.example.com",
        "http://localhost:8000",
        "http://localhost:5173",
        "http://localhost:8001",
    ]


@app.command()
def scan(
    dist_path: Path = typer.Option(
        None,
        "--dist",
        "-d",
        help="Path to the built frontend dist directory.",
    ),
) -> None:
    settings = ScanSettings()
    target_dir = dist_path or Path(settings.dist_dir)

    if not target_dir.exists():
        typer.echo(f"error: dist directory not found at {target_dir}", err=True)
        sys.exit(1)

    found_violations: list[tuple[Path, str, str]] = []

    for file_path in target_dir.rglob("*"):
        if not file_path.is_file() or file_path.suffix not in (".js", ".html", ".json"):
            continue

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception as err:
            typer.echo(f"warn: could not read {file_path}: {err}", err=True)
            continue

        for placeholder in settings.prohibited_placeholders:
            if placeholder in content:
                for line_idx, line in enumerate(content.splitlines(), start=1):
                    if placeholder in line:
                        snippet = line.strip()[:100]
                        found_violations.append((file_path, placeholder, f"L{line_idx}: {snippet}"))
                        break

    if found_violations:
        typer.echo("❌ Bundle Placeholder Verification FAILED!", err=True)
        typer.echo("Prohibited placeholder URLs detected in built production assets:\n", err=True)
        for path, placeholder, context in found_violations:
            typer.echo(f"  • {path.name} -> matches '{placeholder}' ({context})", err=True)
        typer.echo("\nFix: Ensure VITE_API_URL='' is set for same-origin relative requests.", err=True)
        sys.exit(1)

    typer.echo(f"✓ Bundle verification passed: zero placeholder URLs detected in {target_dir}")


if __name__ == "__main__":
    app()
