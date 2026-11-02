# Independent runtime security review

Reviewed head: `6a88fe858c898e1aeec2925feeafb060b6e34a9e`.
Runtime commits: `b928079c6abb903d917660231eb039a4933275ef` and
`6a88fe858c898e1aeec2925feeafb060b6e34a9e`.
Application baseline: `57b6d9bef02760f8f0524984a201e4bdebc14a9a`.
Frontend changes were excluded because they have a separate independent review.

Assessment: **Approve** for the runtime source and build changes, including the
corrections bound by the fingerprints below. One P2 finding was resolved;
there are no open P0-P2 findings. This is not production deployment approval.

## P2: Lock the source dependency build toolchain before the first sync

- Source: task (independent runtime review).
- Path: `Dockerfile.prod`, new line 73.
- Confidence: 100.
- Fingerprint: `runtime-dkimpy-isolated-build-unlocked`.
- Disposition: resolved by the reviewed correction below.
- Reviewed head: `6a88fe858c898e1aeec2925feeafb060b6e34a9e`.

At the original reviewed head, the first `uv sync --locked ... --group build` permits isolated builds.
`dkimpy==1.1.8` has only an sdist in `uv.lock`, and the recorded real candidate
build explicitly logs `Building dkimpy==1.1.8` at this step. Its source imports
`setuptools`, but neither setuptools nor wheel is locked, and there are no
build constraints. The later `--no-build-isolation` only protects the application
wheel build. Installing the Hatchling group before that does not constrain
dkimpy's separate isolated environment.

Impact: replaying this supposedly fixed-input build can execute a newly resolved
build backend and produce different dependency bytes without changing any
reviewed input. This leaves a supply-chain and reproducibility gap in the
security build; it does not establish that the tested candidate is compromised.

Fix: hash-lock all required source-build tools, install that tool group without
the application dependency graph first, then sync the runtime dependencies with
build isolation disabled. Prune build tools from the delivered environment.
Rebuild with an empty dependency-build cache and verify that dkimpy builds using
only those installed tools, followed by the existing image checks and scan.
[uv documents isolated builds and separate build dependency environments](https://docs.astral.sh/uv/concepts/projects/config/#build-isolation).

### Verified correction

The implementation owner added hash-locked setuptools 84.2.1 and wheel 0.48.0
beside Hatchling 1.32.4. A wheel-only `--only-group build --no-build` bootstrap
now precedes the dependency install, and both dependency and application builds
explicitly disable isolation. The runtime assertions check that all three
builders are absent.

The fresh native amd64 dependency build completed successfully. Independently
reviewed `/tmp/kindred-dependency-amd64-build.log` shows eight locked builder
packages installed, dkimpy built from source under the nonisolated command,
all eight build packages removed, and `uv pip check` confirming 90 compatible
packages. Log SHA-256:
`79208a3fb9679f8bbd5a53c78abd2662e08431bcc7b7817594312295600b2b14`.

The same native build exposed a GNU patch incompatibility in the previous
context cleanup. The owner restored balanced one-line context and added an
explicit postimage checksum. Both preimage and postimage checks pass in the
completed native build, with unchanged upstream production patch lines.

These correction inputs were reviewed before their containing commit; the
fingerprints bind approval without attributing uncommitted changes to the old
HEAD:

| Corrected input | SHA-256 |
| --- | --- |
| `Dockerfile.prod` | `7f7bb8dfb94b3791ac3cbcfd71f728b742053bacdec4d8bb17673ecbce734daf` |
| `backend/pyproject.toml` | `ca7694283425c305ef115ae0595804f9d67801abfa128ab245415cd027ec66b6` |
| `uv.lock` | `251ade5d6515b27bd634c9abea5bec4c2effd3ecabf68b5f328e99fd061292bf` |
| `docker/security/build-python.sh` | `1fcadba6f8d4ae459a3c0da057407895b73e9d9f678802a028fa959832b050ff` |
| `docker/security/poplib.patch` | `ff8cd0b1444b6b26f87aa2786811b712820cf6c2095b110d2e68348518366984` |
| `docker/security/test-runtime.py` | `d0e28de57ac9b634d013ee13620bf782a803468786ea20a5082228758d7f88d3` |

## Reviewed implementation and evidence

- CPython source checksum matches the official
  [3.14.10 release](https://www.python.org/downloads/release/python-31410/).
  The downstream POP3 patch matches the two production lines in
  [upstream commit b234a2b](https://github.com/python/cpython/commit/b234a2b67539f787e191d2ef19a7cbdce32874e7).
  Preimage hashing and zero-fuzz application prevent silent patch drift.
  C0 and DEL regressions test both USER and PASS before writes.
- The source bootstrap follows the relevant shared-library retention and rpath
  steps of the cited official Docker recipe. The intentional PGO/LTO and
  ensurepip differences are documented. Runtime dependency retention is based
  on linked libraries, and build-only packages are purged.
- Base/tool images use child manifest digests; APT uses a dated signed snapshot.
  pnpm's downloaded artifact is checksum-verified. These controls are sound;
  the source dependency builder gap above is the exception.
- Closed registration is configured before email lookup and creation. Source
  hashes for settings, users route, and prestart match the report. `get_db`
  creates a lazy SQLModel session and its configuration hook is a no-op; the
  guard does not itself need a database query. Existing success/duplicate tests
  deliberately enable signup.
- The final stage sets UID/GID 10001, preserves the web command and worker
  override contract, keeps uv in the dependency builder, and creates the upload
  directory with the intended owner. The report correctly requires existing
  production volume ownership to be checked separately.
- The eight-test log records all tests passing. It is bound to the report by
  its SHA-256, as are the build log, inventory, and full Trivy JSON. All recorded
  source/toolchain fingerprints independently matched during this review.
- Independently inspected Trivy JSON contains 108 Debian packages, 283 advisory
  rows (48 high, 89 medium, 145 low, one unknown), no listed fixed versions,
  and 90 Python distributions with no reported Python-package findings. Those
  counts support the report; they do not imply an absence of vulnerabilities.

## Validation boundaries

Fresh read-only review checks passed: ShellCheck for both build shell scripts,
Hadolint for `Dockerfile.prod`, Bash syntax, Node syntax for the pnpm installer,
and `git diff --check` across the runtime commits. Existing logs and scan data
were verified, not regenerated. No container, production, Git, or source-code
mutation was performed by this reviewer.

The offline suite overrides the database dependency and does not boot the full
web command, perform an OAuth exchange, execute worker jobs, run migrations,
or test existing uploads. Mako graph loading is not migration execution. The
report states these limits accurately; require the separate synthetic-service,
migration/restore, and production probes already assigned to the deployment
owner. The tested image is arm64 with an empty revision label, so it cannot
serve as production amd64 approval. The source-built interpreter is also not
covered by a Python-distribution scan alone; its source version/backport
provenance and targeted regressions remain separate evidence.

No additional P0-P2 implementation findings were identified in this scope.
The source review finding is resolved; the deployment evidence gates above
remain the deployment owner's responsibility.
