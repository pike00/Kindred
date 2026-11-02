# Independent CI correction review

Assessment: **Approve** for the reviewed source changes. No open P0-P2
findings remain. Actual Gitea execution and its full test/coverage result are
separate delivery gates owned by the implementation owner.

Base: `a0b2c5c21b21747da57f0b470f5cc44941e2339f` plus the reviewed working-tree
changes. Scope: `.gitea/workflows/test.yml`, `.gitea/scripts/ci-services.sh`,
and 13 backend Python formatting edits. The fingerprints below bind this
approval to the reviewed content before its containing commit.

## Resolved service isolation finding

The initial service-container approach depended on generic DNS aliases on the
runner's shared network. Subsequent attempts used features absent from the
inspected v0.6.1 runner: network aliases passed through service options and
`job.services.*.id`. The exact tagged source
[constructs JobContext without service IDs](https://gitea.com/gitea/act_runner/src/tag/v0.6.1/act/runner/run_context.go)
and [constructs service network aliases separately from parsed options](https://gitea.com/gitea/act_runner/src/tag/v0.6.1/act/container/docker_run.go).
The former P2 finding `ci-runner-service-context-unavailable` is resolved by
removing those dependencies entirely.

The final design starts PostgreSQL, Redis, and Meilisearch inside one pinned
job container, all bound to `127.0.0.1`. Each job's container has its own network
namespace even though its external interface joins the shared runner network.
There are no published host ports, external service aliases, Docker socket
calls, or runner-configuration changes in the workflow.

The helper checks the disposable container context, synthetic settings, run
identity, and absence of dotenv files before starting services. It uses a fresh
root-owned state directory; service data directories belong to the unprivileged
postgres account. `env -i` removes inherited Actions environment credentials
before each service executable starts. The pretest verifier checks PostgreSQL's
role, database, data directory and bind setting; Redis's data directory, bind
setting and health; Meilisearch health; all three service process owners; and
the actual listening addresses in `/proc/net/tcp` and `tcp6`. It runs before
migrations and destructive pytest fixtures. Cleanup only targets these job-local
processes and data-directory identities.

## Build and test policy

- The job image is digest-pinned PostgreSQL 18.6. The Python 3.14.10, uv 0.13.5,
  and Meilisearch 1.56.0 downloads are checked before extraction/execution.
  Their three SHA-256 values match the provided official release metadata for
  [Python](https://github.com/astral-sh/python-build-standalone/releases/tag/20261026),
  [uv](https://github.com/astral-sh/uv/releases/tag/0.13.5), and
  [Meilisearch](https://github.com/meilisearch/meilisearch/releases/tag/v1.56.0).
- The initial shell step installs the Node/git runtime needed by checkout.
  Distro daemon startup is disabled before package installation. APT packages,
  including Redis, are resolved from Debian repositories at CI time; this is
  not a byte-reproducible job-image build or a production image change.
- Lock validation, frozen dependency installation, Ruff lint, and Ruff format
  remain mandatory. The actual `dev` group replaces the nonexistent dev extra.
  No tests are filtered or skipped, and no failing step is tolerated.
- Full pytest runs under coverage, followed by `--fail-under=60`, matching the
  existing GitHub workflow threshold. `--no-sync` prevents later test commands
  from silently reconciling the installed environment.
- Static Alembic graph inspection found two heads:
  `add_contact_snoozed_until` and `q6r7s8t9u0`. `upgrade heads` is appropriate.
- All 13 backend files retain equivalent ASTs, including type comments and
  type-ignore tags. Only source-location metadata was excluded, including a
  shifted `TypeIgnore.lineno` in `email_service.py`. The comparison was rerun
  after the final service design was written; there are no application behavior
  or test assertion changes in those formatting edits.

## Validation and limits

Fresh actionlint, ShellCheck, Bash syntax, embedded Python syntax, whitespace,
and 13-file AST checks passed. The implementation owner's completed same-image
reproduction log at `/tmp/kindred-ci-full-probe.log` records Ruff success,
143 files already formatted, successful job-local service identity verification,
migration of both heads, **423 passing tests with 16 warnings in 150.39 seconds**,
and **63% coverage**, exceeding the unchanged 60% gate. The final identity and
cleanup log records successful verification and shutdown. The three evidence
file hashes independently match `ci-report.md`; the full probe log hash is
`17095a9f4387c6f9fcd6054d6d03a7af06425964b313ca98c3459acfacc14f3d`.
This reviewer did not duplicate that test run. Actual Gitea execution, including
the Actions checkout engine, remains unverified by the container reproduction.

The nonblocking credential suggestion is also resolved: checkout now sets
`persist-credentials: false`. This job does not need authenticated Git after
checkout, and service environment clearing alone would not remove persisted Git
credentials. The accepted change passed fresh actionlint, ShellCheck, and diff
checks; the helper and AST-equivalent backend diff are unchanged.

| Reviewed input | SHA-256 |
| --- | --- |
| `.gitea/workflows/test.yml` | `e73833dfba4aafb42c8ecbea627e035b87e399692c6caf2f3ae89171bb6cfa69` |
| `.gitea/scripts/ci-services.sh` | `9294e4a099aefd3b4101672e32e31cfb36ab44df801c20d2259e1284199dde90` |
| `git diff --binary -- backend` | `c1f12660009de70d022acb82ff3f9d476936dea8a805928d6701bd1980e6fd6b` |

No application, Git, container, runner, or production state was changed by this
reviewer. No dotenv files were read and no database fixture was executed.
