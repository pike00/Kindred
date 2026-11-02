# Private Gitea backend CI correction

Prepared 2026-10-26 against application source `a0b2c5c21b21747da57f0b470f5cc44941e2339f`
plus the parent's 13 backend Ruff formatting edits. This unit owns only
`.gitea/workflows/test.yml`, `.gitea/scripts/ci-services.sh`, and this report.
No backend files, independent review report, Git state, runner configuration or
production services were changed by this implementation lane.

## Supported isolation boundary

Job 51893 failed because host port 5432 was already allocated. The installed
act_runner 0.6.1 also uses a shared service network, discards the proposed
`--network-alias` service option, and does not supply `job.services.*.id`.
The revised workflow requires none of those mechanisms. PostgreSQL, Redis and
Meilisearch run as loopback-only processes inside one disposable job container.
There are no workflow services, host port publications, Docker API calls or
external data volumes.

The job image is the official PostgreSQL 18.6 Debian trixie amd64 child:
`sha256:9770878138a2e83abcb10856d30cc3f24dae0d317bb956db6ab9159de6c3c80d`.
A shell step installs the Debian Node 20 runtime needed by checkout@v4 before
any Node action executes. Checkout uses `persist-credentials: false`. The step
also installs supported Debian Redis and build
tools. A container-local policy-rc.d prevents package installation from starting
unowned service processes. No global runner configuration changes are required.

`setup-uv@v7` declares a Node 24 runtime. To avoid adding that runner dependency,
the helper installs the exact official uv archive directly. uv 0.13.5's bundled
Python catalog does not list 3.14.10, so Python comes from the checksum-pinned
20261026 standalone release instead of an unavailable automatic lookup.

| Input | SHA-256 |
| --- | --- |
| Python 3.14.10 x86_64 GNU install-only stripped archive | `4d3c16c59ed0802a3d1d34d8bce504b15ceeaff39d62dadecc6a9fa803412aed` |
| uv 0.13.5 x86_64 GNU archive | `f68d291c75783122dad58ab77def0e13f3233f358731db5d6d7e8715603b928f` |
| Meilisearch 1.56.0 Linux amd64 binary | `5a32e1d7a6a69e0ee5634a7456c421f59273d73f078b6f0d8f01384eafe79729` |

Hashes were checked against official release asset metadata and verified again
on download. Sources: [Python standalone 20261026](https://github.com/astral-sh/python-build-standalone/releases/tag/20261026),
[uv 0.13.5](https://github.com/astral-sh/uv/releases/tag/0.13.5), and
[Meilisearch 1.56.0](https://github.com/meilisearch/meilisearch/releases/tag/v1.56.0).

## Guards and unchanged test policy

The helper requires a disposable Docker CI container, root installation context,
amd64, a numeric run ID, exact synthetic credentials and exact loopback service
URLs. It refuses checkout dotenv files before application settings can load.
Fresh temporary data directories belong to the container's unprivileged postgres
account; all three service processes run under that account with a cleared
environment. Actions credentials and job metadata are not inherited by services.

Before migrations or pytest, verification checks the current database/role,
PostgreSQL's exact private data directory and listen address, Redis's private
directory and bind address, Meilisearch health, all three process UIDs, and the
actual kernel TCP listeners. Ports 5432, 6379 and 7700 must each listen only on
127.0.0.1. The explicit fixture database remains `kindred_ci_test_<run_id>`;
its create/drop-schema behavior has not changed.

The workflow keeps PROJECT_NAME, Python 3.14.10, uv 0.13.5, lock validation,
frozen installation of the real `dev` dependency group, both Ruff checks,
`alembic upgrade heads`, full pytest under coverage, and the existing GitHub
60% coverage threshold. Nothing is skipped or marked continue-on-error.
Service shutdown runs with `if: always()`; final container teardown removes
its private data even after an earlier failure.

## Reproduction evidence

A labeled disposable native amd64 container on Ares reproduced the job image
and shell steps, without host bind mounts or published ports. It used only
tracked source plus this helper, excluding dotenv files. Resources were bounded
to 3 GiB memory/swap, two CPUs and 512 PIDs; privileged mode was false.

The reproduction caught and fixed two startup issues before handoff: initdb
cannot reopen a root-owned stdin pipe after dropping identity, and Meilisearch
needs its own writable working directory for default dump/snapshot paths.
The helper now uses an immediately removed private synthetic-password file and
a service-owned Meilisearch working directory.

Observed versions were PostgreSQL 18.6, Python 3.14.10, uv 0.13.5, Meilisearch
1.56.0, Debian Redis `5:8.0.2-3+deb13u3`, and Node
`20.19.2+dfsg-1+deb13u3`. Redis uses Debian's supported package stream for CI;
the production Redis candidate remains separately pinned to 7.4.12.

Actionlint and ShellCheck passed. The disposable reproduction passed lock
validation, frozen dev sync, Ruff lint, formatting of all 143 backend files,
service identity/listener checks, and both migration heads. Full pytest passed:
**423 passed, 16 warnings in 150.39 seconds**. Coverage was **63%**, passing the
unchanged 60% gate. Final identity verification and service shutdown passed.
The exact labeled disposable container and its anonymous volume were then
removed; no matching container remained.

This report does not claim an actual Gitea run has passed: the parent must
publish the reviewed change privately and inspect the real runner. The Docker
reproduction exercised the job's shell steps, not the Actions checkout engine.

Current owned source hashes:

- Workflow: `e73833dfba4aafb42c8ecbea627e035b87e399692c6caf2f3ae89171bb6cfa69`.
- Helper: `9294e4a099aefd3b4101672e32e31cfb36ab44df801c20d2259e1284199dde90`.

Local evidence:

| File | SHA-256 |
| --- | --- |
| `/tmp/kindred-ci-full-probe.log` | `17095a9f4387c6f9fcd6054d6d03a7af06425964b313ca98c3459acfacc14f3d` |
| `/tmp/kindred-ci-install-final.log` | `6d9f0239c69b84cf44a02084ffdd1683196c4a5fb8815aa5410ceae8da5d539f` |
| `/tmp/kindred-ci-final-identity-cleanup.log` | `e0a47cb27c3c7fcce0e42c141061942df8b92ad43188c78c149c30f75db1b5fd` |

These contain synthetic test output and dependency/runtime diagnostics, not
production records or credentials. Actionlint, ShellCheck and diff checks passed
again after disabling persisted checkout credentials.

Completed deliverables and review previews may be saved to Will's private
Library; that delivery is authorized. The parent handles delivery. Public
sharing, sending files to other people, or publishing code requires separate
authorization.
