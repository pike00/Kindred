# kindred — Python client + CLI for the Kindred personal CRM

Auto-generated Python SDK and `kindred` CLI for the Kindred backend.
Built on top of [`openapi-python-client`](https://github.com/openapi-generators/openapi-python-client) against `frontend/openapi.json`, with a thin `KindredClient` wrapper for env-driven construction.

## Install

```bash
# from the kindred checkout (editable)
uv tool install --force --editable ./sdk

# from a git URL (sdk lives in a subdirectory)
uv tool install "git+https://github.com/pike00/Kindred#subdirectory=sdk"

# as a library in another uv project
uv add "kindred @ git+https://github.com/pike00/Kindred#subdirectory=sdk"
```

## Configure

The CLI and `KindredClient.from_env()` read two env vars:

| Var | Purpose |
|---|---|
| `KINDRED_BASE_URL` | e.g. `https://kindred.khanpikehome.com` |
| `KINDRED_API_KEY` | Issue via the web UI: Settings → API Keys |
| `KINDRED_TIMEOUT` | Optional, seconds, default `15` |

## CLI

```
kindred --help
kindred env                                # print configured base + redacted key
kindred health                             # /utils/health-check
kindred whoami                             # /users/me

kindred contacts list --search Alice --limit 50
kindred contacts get <uuid>
kindred contacts losing-touch              # cadence elapsed since last touch
kindred contacts overdue                   # past next-contact threshold
kindred contacts household <uuid>
kindred contacts skip <uuid>

kindred reminders list
kindred reminders due
kindred reminders dismiss <uuid>

kindred notes list [--contact-id <uuid>]
kindred tags list
kindred interactions list [--contact-id <uuid>]
kindred journal list
```

Output is newline-delimited JSON (one record per line) for paginated endpoints, so it pipes cleanly:

```bash
kindred contacts losing-touch | jq -r '.first_name + " " + (.last_name // "")'
```

`--pretty` switches to indented JSON.

### Voice capture review

```bash
kindred voice transcribe recording.wav --timezone America/Chicago
# Or preserve an existing transcript, including its original whitespace:
kindred voice create --file transcript.txt --timezone America/Chicago
kindred voice list --limit 50 --skip 0
kindred voice get <capture-uuid> --pretty
kindred voice analyze <capture-uuid> --revision 1 --pretty
```

Analysis proposes interactions, notes, contact field changes, life events, and
reminders. It preserves the original transcript and does not write CRM records.
For revised wording, add `--file corrected.txt` to `analyze`. Files may be `-`
to read stdin. Transcription can take repeated `--contact <uuid>` options for
up to 20 visible contact name hints.

Create a review JSON file containing `revision`, `corrected_text`, and `actions`
from the returned capture. Edit destinations and fields, or set an action's
`enabled` flag to `false`. Contact field changes use a `fields` list such as
`[{"field": "company", "value": "Acme"}]`; explicit `null` clears that field.

```bash
kindred voice update <capture-uuid> --file review.json --pretty
# Update review.json to the returned revision before a subsequent request.
kindred voice commit <capture-uuid> --file review.json --pretty
kindred voice delete <uncommitted-capture-uuid>
```

Confirmation saves all enabled actions in one transaction. If the response is
lost, retry with the identical review file; the API returns the same saved IDs.
Changed retries and stale drafts return a nonzero CLI exit. Analysis and audio
upload allow 120 seconds for the service response. Committed receipts remain
available through `get` and cannot be deleted by the draft command.

### Using from a justfile

```just
default_url := "https://kindred.khanpikehome.com"

losing-touch:
    KINDRED_BASE_URL={{default_url}} \
    KINDRED_API_KEY=$(sops -d secrets.sops.env | grep ^KINDRED_API_KEY= | cut -d= -f2-) \
    kindred contacts losing-touch | jq

remind-overdue:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source .env; set +a
    kindred contacts overdue \
      | jq -r '"- " + .first_name + " (last: " + (.last_contacted_at // "never") + ")"' \
      | mattermost post --channel ai-home
```

## Library

```python
from kindred import KindredClient
from kindred._generated.api.contacts import contacts_list_contacts, contacts_get_contact
from kindred._generated.models import ContactCreate

with KindredClient.from_env() as k:
    page = contacts_list_contacts.sync(client=k.raw, limit=50, search="Alice")
    for c in page.data:
        print(c.first_name, c.id)
```

Every operation has both `.sync()` (returns body) and `.sync_detailed()` (returns the full `Response` with status + headers). For async, use `.asyncio()` / `.asyncio_detailed()`.

Direct API surface: 29 service packages under `kindred._generated/api/` and 130 model classes under `kindred._generated/models/`. See `frontend/openapi.json` for the full schema.

## Regenerating

The SDK is regenerated from `../frontend/openapi.json` and the output is committed so the package is self-contained.

```bash
just sdk-regen                # from repo root
# or
cd sdk && ./scripts/regen.sh

# overriding the spec path:
KINDRED_OPENAPI_SPEC=/path/to/openapi.json ./scripts/regen.sh
```

After regenerating, run the tests:

```bash
just sdk-test
```

## What's where

```
sdk/
├── pyproject.toml
├── README.md (this file)
├── scripts/regen.sh             # regenerates _generated/
├── src/kindred/
│   ├── __init__.py              # KindredClient + re-exports
│   ├── client.py                # thin env-driven wrapper
│   ├── cli.py                   # typer CLI
│   ├── py.typed
│   └── _generated/              # openapi-python-client output (committed)
│       ├── client.py            # AuthenticatedClient / Client
│       ├── errors.py            # UnexpectedStatus
│       ├── types.py             # UNSET sentinel
│       ├── api/<service>/<op>.py
│       └── models/<model>.py
└── tests/test_client.py
```

## License

Same as Kindred — see ../LICENSE.
