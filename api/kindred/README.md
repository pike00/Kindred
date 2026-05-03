# Kindred Bruno collection

API requests for the Kindred CRM, organized by resource. Open in [Bruno](https://www.usebruno.com/).

## Environments

| Env     | Target                                | Notes                                                      |
| ------- | ------------------------------------- | ---------------------------------------------------------- |
| `local` | `https://kindred.localhost`           | Local Docker dev stack (`compose.dev.yml` from repo root). |
| `dev`   | `https://kindred.example.com`    | Homelab deployment.                                        |

Pick one in Bruno's environment dropdown before sending a request.

## Secrets

`password`, `jwt_token`, and `api_key` are declared as secret vars — Bruno keeps
their values out of the committed `.bru` files and stores them in your local
secret store.

- **password** — fill in once for whichever env you're hitting (the
  `FIRST_SUPERUSER_PASSWORD` value, found in the repo's `.env` for prod values
  or `.env.sops` for the homelab).
- **jwt_token** — auto-populated by `auth/01 Login` after a successful login.
- **api_key** — auto-populated by `api-keys/02 Create API Key` (or the
  `with-api-key/04` impersonation variant).

## Local target needs an /etc/hosts entry

`kindred.localhost` is served by the host's Traefik instance, which only binds
to the tailnet interface (not `127.0.0.1` or `::1`). Add the tailnet IP of
whichever host is running the dev stack:

```
192.0.2.1  kindred.localhost
```

(That's `host` — replace if you're running the stack elsewhere on the tailnet.)

Verify with:

```bash
curl -k https://kindred.localhost/api/v1/utils/health-check/
```

## Per-worktree stacks

`just up` from a worktree boots an isolated stack at
`https://<slug>.kindred.<domain>/`. To hit one of those from Bruno, duplicate
`local.bru`, set `base_url` to that worktree's URL, and add the matching
`/etc/hosts` entry.

## Typical flow

1. Pick env (`local` or `dev`).
2. Set `password` (one-time, secret).
3. Run `auth/01 Login` → `jwt_token` populated.
4. Run `api-keys/02 Create API Key` → `api_key` populated.
5. Use anything under `with-api-key/` to test the kk_-prefixed key flow,
   including the `X-On-Behalf-Of` impersonation header.
