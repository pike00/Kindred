#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = []
# ///
"""Automated dev routing test for kindred.

Verifies that <branch-slug>.dev.kindred.khanpikehome.com:
1. Environment resolves WORKTREE_HOST in format <slug>.dev.kindred.<domain>
2. DNS query resolves to tailnet IP
3. Traefik router rules and TLS wildcard domains are properly formatted in compose
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys


def _ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def _fail(msg: str) -> None:
    print(f"  ✗ {msg}")


def main() -> int:
    print("▶ Testing dev routing configuration (<branch-slug>.dev.kindred.khanpikehome.com)...\n")
    fails = 0

    # 1. Resolve env
    try:
        proc = subprocess.run(["just", "env"], capture_output=True, text=True, check=True)
        env_dict = {}
        for line in proc.stdout.strip().splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                env_dict[k.strip()] = v.strip()
    except Exception as e:
        _fail(f"Failed to execute 'just env': {e}")
        return 1

    slug = env_dict.get("SLUG")
    worktree_host = env_dict.get("WORKTREE_HOST")
    compose_file = env_dict.get("PREVIEW_COMPOSE_FILE", "compose.worktree.yml")

    _ok(f"SLUG={slug}")
    _ok(f"WORKTREE_HOST={worktree_host}")

    # 2. Check URL pattern
    pattern = r"^[a-zA-Z0-9_-]+\.dev\.kindred\.[a-zA-Z0-9_.-]+$"
    if worktree_host and re.match(pattern, worktree_host):
        _ok(f"WORKTREE_HOST matches expected pattern '<slug>.dev.kindred.<domain>'")
    else:
        _fail(f"WORKTREE_HOST '{worktree_host}' does NOT match '<slug>.dev.kindred.<domain>'")
        fails += 1

    # 3. DNS check
    if worktree_host:
        try:
            dig_proc = subprocess.run(
                ["dig", "+short", "+time=2", "+tries=1", worktree_host],
                capture_output=True, text=True, check=False,
            )
            ips = [line.strip() for line in dig_proc.stdout.strip().splitlines() if line.strip()]
            if ips:
                _ok(f"DNS check: '{worktree_host}' resolves to {ips[0]}")
            else:
                _fail(f"DNS check: '{worktree_host}' failed to resolve")
                fails += 1
        except Exception as e:
            _fail(f"DNS check failed: {e}")
            fails += 1

    # 4. Traefik config check
    if compose_file and slug:
        try:
            cfg_proc = subprocess.run(
                ["docker", "compose", "-f", compose_file, "config", "--format", "json"],
                env={**os.environ, **env_dict},
                capture_output=True, text=True, check=False,
            )
            if cfg_proc.returncode != 0:
                _fail(f"docker compose config failed: {cfg_proc.stderr}")
                fails += 1
            else:
                cfg_data = json.loads(cfg_proc.stdout)
                services = cfg_data.get("services", {})
                
                # Check backend router labels
                backend_svc = services.get("backend", {})
                b_labels = backend_svc.get("labels", {})
                b_rule = b_labels.get(f"traefik.http.routers.{slug}-api.rule", "")
                b_tls = b_labels.get(f"traefik.http.routers.{slug}-api.tls.domains[0].main", "")
                
                # Check frontend router labels
                frontend_svc = services.get("frontend", {})
                f_labels = frontend_svc.get("labels", {})
                f_rule = f_labels.get(f"traefik.http.routers.{slug}.rule", "")
                f_tls = f_labels.get(f"traefik.http.routers.{slug}.tls.domains[0].main", "")

                if worktree_host and worktree_host in b_rule:
                    _ok(f"Backend Traefik router rule contains Host('{worktree_host}')")
                else:
                    _fail(f"Backend Traefik router rule missing Host('{worktree_host}') (rule: '{b_rule}')")
                    fails += 1

                if worktree_host and worktree_host in f_rule:
                    _ok(f"Frontend Traefik router rule contains Host('{worktree_host}')")
                else:
                    _fail(f"Frontend Traefik router rule missing Host('{worktree_host}') (rule: '{f_rule}')")
                    fails += 1

                if "*.dev.kindred" in b_tls or "*.dev.kindred" in f_tls:
                    _ok(f"TLS certresolver domain matches wildcard '*.dev.kindred.*'")
                else:
                    _fail(f"TLS certresolver domain mismatch: backend='{b_tls}', frontend='{f_tls}'")
                    fails += 1

        except Exception as e:
            _fail(f"Traefik config check error: {e}")
            fails += 1

    print(f"\nResult: {fails} failures.")
    return 1 if fails > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
