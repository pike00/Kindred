# Frontend

React + Vite + TypeScript + TanStack Router/Query + Tailwind + shadcn/ui, managed with [Bun](https://bun.sh/).

## Quick start (local, against a running backend)

```bash
bun install
bun run dev
```

Open http://localhost:5173. The dev server talks to whatever `VITE_API_URL` points at (see `.env`). For dev against the homelab, point it at `https://kindred.${DOMAIN}`.

## Generate the API client

The TypeScript client under `src/client/` is generated from the backend's OpenAPI schema. After any backend route or model change:

```bash
bash ./scripts/generate-client.sh
```

(Run from the repo root — the script boots the backend, fetches `/api/v1/openapi.json`, and writes into `frontend/src/client/`.) Commit the regenerated files.

## Layout

- `src/` — app code
- `src/client/` — generated OpenAPI client (do not hand-edit)
- `src/components/` — UI components (shadcn primitives live under `src/components/ui/`)
- `src/hooks/` — shared React hooks
- `src/routes/` — TanStack Router route tree (pages)

## End-to-end tests

The e2e suite lives at the repo root in `e2e/` (Puppeteer). See the root README.
