# Release test checklist

Run each step in order. Verify the checkpoint before proceeding.

## 1. Cut the release

```bash
just release patch
```

Bumps version (currently v0.2.71 → v0.2.72), regenerates CHANGELOG.md, opens editor for LLM-drafted GH release notes, tags, pushes tag, creates GH release draft.

**Checkpoint:** `git describe --tags --abbrev=0` returns new tag; GH release exists.

---

## 2. Build the image

```bash
just build v0.2.72
```

Builds `Dockerfile.prod`, pushes `:v0.2.72` and `:sha-<short>` to GHCR.

**Checkpoint:** `docker pull ghcr.io/pike00/kindred:v0.2.72` succeeds (or check GHCR packages page).

---

## 3. Deploy to prod

```bash
just deploy v0.2.72
```

Delegates to `~/Documents/Homelab/apps/kindred/justfile bump v0.2.72` — runs pg_dump preflight, pulls new image, restarts, healthchecks.

**Checkpoint:**

```bash
curl -sk -o /dev/null -w "%{http_code}" \
  --resolve "kindred.khanpikehome.com:443:100.119.100.85" \
  "https://kindred.khanpikehome.com/api/v1/utils/health-check/"
```

Expected: `200`. Also verify version badge in the UI footer shows the new tag + commit hash.

---

## One-shot alternative

```bash
just ship patch
```

Runs all three steps above in sequence.
