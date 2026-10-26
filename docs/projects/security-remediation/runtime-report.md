# Kindred application runtime security build

Implementation based on application release source
`57b6d9bef02760f8f0524984a201e4bdebc14a9a`, with frontend security changes through
`de759b19f44badf271cf87706c04119b0831720e`. This report covers build preparation
and disposable local validation. It does not authorize or claim publication,
AWS rollout, database restoration, or production coverage.

## Build contract

`just security-build linux/amd64 runtime` builds and loads a local image named
`kindred-security:runtime-amd64`. It never pushes. `linux/arm64` is supported
for native development checks; those bytes are not the production candidate.
Optional targets `python-base` and `dependency-builder` isolate build failures.
The existing project-kit publish/deploy recipes are not used by this workflow.

The default Dockerfile also has usable pinned amd64 inputs, rather than an
unavailable Python tag. `org.opencontainers.image.revision` is the exact HEAD
only when `git status --porcelain` is empty. Disposable dirty builds leave this
label empty and cannot satisfy the deployment revision gate. After review and
commit, rebuild from the clean source revision before publishing privately.
Capture the resulting platform manifest/config IDs and complete image scan.

The final image explicitly uses `10001:10001`, `/app/backend`,
`HOME=/home/kindred`, `/app/.venv` and `/app/static`. Its CMD is unchanged:
`bash scripts/prestart.sh && fastapi run --workers ${WEB_CONCURRENCY:-2} app/main.py --host 0.0.0.0 --port 8000`.
There is no added ENTRYPOINT. ARQ can override CMD as before. The uploads
directory is owned by the application identity; existing production volume
ownership must still be verified before rollout. The image performs no
dependency reconciliation at startup. Its code, interpreter and dependencies
are readable under a read-only root with no-new-privileges and writable
uploads/tmp mounts.

The default closed signup guard is now source-controlled, before user lookup.
The resulting source hashes exactly match the earlier deployed hotfix:

| File | SHA-256 |
| --- | --- |
| `backend/app/core/config.py` | `48dfb13283e61c41a6438dc2b4d037279f6a194af747eaae4bd86aa46a6af81d` |
| `backend/app/api/routes/users.py` | `ad0a30494781d93280b7258357d49ec9656b9a78953ca6fb5d82ddcf0644c87d` |
| unchanged `backend/scripts/prestart.sh` | `a92b6e105daa4de626b7d77babafacf99fe9ecf3dd674a4876a8753b22cfaf7c` |

PyJWT 2.15.0, certifi 2026.10.19, oauthlib 4.0.0 and urllib3 2.8.0 are exact
application requirements and hash-locked artifacts. Hatchling 1.32.4 and its
transitive build dependencies are separately hash-locked in the build group.
The application wheel is built without isolated dependency resolution, then
that group is pruned. uv 0.13.5 exists only in the dependency builder. The final
runtime omits uv, pip, ensurepip, compilers and make. This removes unused
installed software; it is not a claim that remaining OS findings are fixed.
Mako was also updated in the lock from 1.3.12 to 1.4.2. Its only detected Python
advisory, CVE-2026-102991, is Windows-specific and was inapplicable to this Linux
runtime; the compatible update nevertheless includes the upstream fix. The
[Mako changelog](https://docs.makotemplates.org/en/latest/changelog.html#change-1.4.2)
documents the drive-letter traversal correction. Offline template rendering and
loading the actual Alembic revision graph pass with the updated dependency.

## Exact toolchain inputs

All image references below are Linux child manifest digests, not tag indexes.

| Input | amd64 SHA-256 | arm64 SHA-256 |
| --- | --- | --- |
| Debian trixie-slim | `4876fdea29cac1a33a3195f1eb1952feb1fca7dd6dd00be3e2f1879cf20d34d2` | `a66b19aa552f595b4ab276c6b4f9b24fa4546632c5ecd88cccdced4a6866323a` |
| Node 22.23.4 slim | `ea11b74b986d520137cdef9a5346e447a00f275ecc4abc0055b7151226231e09` | `ceb43e5c219139035fb742900629e4abed89fe0997f7c03250c499e1f2710c9e` |
| uv 0.13.5 | `a12ede1e6dc90d3b3e600d0901731e71f0ab0f4d72683ea097b76c19c43cc8df` | `d3a8362fee5c061dd78452b5915598fc8fbd15050db3a3d919fba5f2e38c629a` |

Debian packages resolve against signed Debian and Debian-security snapshots
dated `20261026T000000Z`; only expiry checking is disabled for replay, not
signature or package hash verification. APT upgrades execute during the build.
The base image digest and snapshot together fix the package inputs. Refreshing
either is an explicit reviewed change.

pnpm 11.3.0 is fetched from its exact npm artifact URL and checked against
SHA-512 `LEA9ZZRScodnKx9wVjQ6H3w2NANqZ/+r/MKz11ldhDdo+HhxSNG1fPeVbJBga70ZKFfDY68Z6W0tDsnsV0HSFQ==`.
Frontend dependencies use the frozen pnpm lockfile. Node/pnpm remain in the
frontend builder. The frontend source and asset manifest must be captured from
the final clean production build, because commit/build arguments affect assets.

## CPython source bootstrap and backport

On 2026-10-26, `python:3.14.10-slim-trixie` still returned an empty registry
index (`manifests: []`). The build therefore compiles the official
[Python 3.14.10 source](https://www.python.org/downloads/release/python-31410/),
SHA-256 `de414a57119abef52784d8993e341d53aed635fc2b05c2607d9f98a2c5b72032`.
The bootstrap is adapted from the official Docker recipe at
[docker-library/python commit 01dcc3d](https://github.com/docker-library/python/blob/01dcc3d31fcd879f9af36e097bd96328a457f4bd/3.14/slim-trixie/Dockerfile),
whose source Dockerfile SHA-256 is
`e970d25497359b79814b8f3964bd3d6b28e39267463744403ecc062ac373cead`.

Deliberate differences: pinned base/snapshot, two compiler jobs, no PGO/LTO,
no ensurepip installation or retained wheel bundle, build-only tools removed,
and the POP3 backport below. Shared-library linking, hardened Debian compiler
flags, rpath handling and ldd-derived runtime library retention follow the
official approach. Inputs are repeatable; byte-identical rebuilds are not
claimed, because interpreter build timestamps and image metadata can differ.

Python 3.14.10 includes the reviewed SSL/tar/tempdir patch releases. Its POP3
implementation still needs a downstream fix for CVE-2025-15367. Before applying
the exact two production lines from
[CPython commit b234a2b](https://github.com/python/cpython/commit/b234a2b67539f787e191d2ef19a7cbdce32874e7),
the build checks `Lib/poplib.py` SHA-256
`527e714523264093910a0a0b1a55c6583f952835c89061537fc40ad98c347056`, then applies
the patch with zero fuzz. The build-time regression rejects every C0 byte and
DEL through both USER and PASS before any output, and accepts ordinary values.
The runtime probe repeats this on the installed interpreter. This is a recorded
downstream backport, not an assertion that upstream 3.14.10 fixed POP3.

## Validation and remaining gates

`just security-test <image>` runs eight offline checks against the actual image
under network-none, read-only root, no-new-privileges, 512 MiB memory and one
CPU. It checks identity/uploads/static files, interpreter/tool absence and
installed security versions, POP3 rejection, signup HTTP rejection before CRUD,
explicit registration opt-in duplicate handling, JWT validation/rejection, and
OAuth/CA/worker imports, and Mako/Alembic compatibility. It does not run migrations
or connect to real services.

Four application-only checks also passed locally using the locked environment
from `/tmp`, avoiding any repository dotenv file. ShellCheck, Hadolint, Ruff,
JavaScript syntax, `git diff --check` and uv 0.13.5 lock validation passed.
The existing database-backed registration tests now explicitly enable open
registration for their success/duplicate cases and add a closed-default case;
that database-backed suite still requires an isolated synthetic database.

Native arm64 bootstrap was actually built and passed its installed-module,
version/tool-removal and POP3 checks. Docker Desktop was limited to approximately
4 GB RAM / 4 CPUs; compilation used two jobs. Its preliminary OS-only Trivy
0.76.0 scan enumerated 108 Debian packages and 283 advisory rows (48 high,
89 medium, 145 low, 1 unknown), none with a listed fixed version. No severity
or unfixed filter was applied. This is local bootstrap evidence, not an AWS
amd64 application scan or an absence-of-vulnerabilities claim.

The final disposable combined **arm64** candidate was actually built and all
eight tests passed. Its full Trivy scan retained the same 283 OS findings and
enumerated 90 Python distributions with zero Python findings. The installed
application is 0.2.123; all four required security pins and Mako 1.4.2 match.
BuildKit's two `SecretsUsedInArgOrEnv` notices refer only to the pre-existing
public `VITE_AUTH_MODE=local` switch, not a credential. They were not suppressed.

| Local candidate identity | SHA-256 |
| --- | --- |
| manifest index | `a429270a277144c93d56a3ad1db02c6dd40bc38ea116e29bfb4584a23dbd2f0b` |
| arm64 image manifest | `8e7b882b3708d8f3c08ad75e43f79bd4f74aefb5da346cddce09aee4d4457b7a` |
| image configuration | `800d5fcafff6d6ae2c666cdd23e7791f8110305705517077e1a082daefa5fee5` |
| backend code inventory | `58a6debd6864aabc29fa5bcffa2e4cae7a1fedc938ef1b0f21d8bd7fa70adea5` |

This candidate deliberately has an empty revision label because it was tested
before committing the runtime changes. It is not eligible for production.
The amd64 input graph is prepared, but no amd64 candidate was built in this
local implementation lane. The deployment owner must perform the native amd64
clean-revision build and rescan those actual bytes, collect frontend assets and
complete the synthetic service integration, migration/restore rehearsal and
production checks. No service/cloud mutation or credential read occurred here.

## Source and evidence fingerprints

The application source commit delivered with this report is assigned by the
atomic Git commit containing these files; the handoff records its exact SHA.
These SHA-256 inputs independently bind the tested build:

| Input | SHA-256 |
| --- | --- |
| `Dockerfile.prod` | `0d8bf0e825ad4ccfc48bef72093c21dfa1b1b4d1d5228e503739e92296f6e870` |
| `backend/pyproject.toml` | `5344159e159f1d57940936eb4cd6956984dcce3abe95b93e2008b706b61fa0da` |
| `uv.lock` | `ea2a90ae1749f43b8fcc940ad9083407e95b2e8a2aaff8799d64ee54d7ea1367` |
| `pnpm-lock.yaml` | `5386eb3c8a9f1635ea4ecda50cb6233d5070e5c8a8c74cf1455b197e2f6fd3e3` |
| `docker/security/build.sh` | `884dc5f104787a96f27c6652fdb202c9dbf87ee287e2fdfc3d3bf360c39c6d10` |
| `docker/security/build-python.sh` | `d48fbbd60d067ee8b08146068f1adbed3aa84bbddf6339cf808e94d6502422a3` |
| `docker/security/poplib.patch` | `65f1d8fbf8726479e1223bedf2b8e9c715da2e5ecad9dfa4865ec40373a91b04` |
| `docker/security/install-pnpm.mjs` | `74ec3eaa469bbda28a6dd281cd373e241eca081161b7c4e61fe14680f21bee4e` |

Temporary evidence retained for the deployment owner:

| File under `/tmp/` | SHA-256 |
| --- | --- |
| `kindred-runtime-arm64-build.log` | `d120ac920b19e16faf0390facd44c1b4ade062b23a3a386c5bd020a88a2254d2` |
| `kindred-runtime-arm64-test.log` | `bc932da2ce6911d406027bacfef2ff344c18145e804fecfda1bb536259f28a42` |
| `kindred-runtime-arm64-trivy.json` | `82479c790c33d303465818124adc7b5e525f7b93e144071d4edb2c158d6c4c1c` |
| `kindred-runtime-arm64-inventory.json` | `928aff2c75b72905c278663e2af597b8b2ae89cfd1128fa729dd128b040839ed` |
