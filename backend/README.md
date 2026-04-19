# Backend

FastAPI + SQLModel + Alembic, managed with [uv](https://docs.astral.sh/uv/).

## Layout

- `app/models.py` — SQLModel models (source of truth for the DB schema)
- `app/api/` — FastAPI routers
- `app/crud.py` — CRUD helpers used by routes
- `app/alembic/` — Alembic config + migration revisions
- `scripts/prestart.sh` — runs on container start: `alembic upgrade head` + creates the first superuser
- `scripts/tests-start.sh` — waits for the DB and runs `pytest`
- `tests/` — pytest suite

## Local setup

From `./backend/`:

```console
$ uv sync
$ source .venv/bin/activate
```

Point your editor's Python interpreter at `backend/.venv/bin/python`.

## Running the stack

See the root [../README.md](../README.md) — the dev overlay (`compose.dev.yml`) bind-mounts `./backend/app` into the container and runs `fastapi run --reload`, so edits to Python code hot-reload.

## Tests

Run inside the running container (dev overlay must be up):

```bash
docker compose -f ../compose.yml -f ../compose.dev.yml exec backend bash scripts/tests-start.sh
```

Pass extra `pytest` args through, e.g. `-x` for stop-on-first-failure, or `-k test_auth` to filter.

A coverage report is written to `backend/htmlcov/index.html` (bind-mounted out of the container in the dev overlay).

## Migrations

Create a revision after changing models. From inside the running backend container:

```console
$ alembic revision --autogenerate -m "Add column last_name to User model"
$ alembic upgrade head
```

Commit the generated file under `app/alembic/versions/`. `prestart.sh` applies migrations on every boot, so fresh deploys pick up new revisions automatically.

## Email templates

Sources live in `app/email-templates/src/` as `.mjml`. Build the HTML output into `app/email-templates/build/` using the [MJML VS Code extension](https://github.com/mjmlio/vscode-mjml) (`MJML: Export to HTML`). The runtime only reads the `build/` files.
