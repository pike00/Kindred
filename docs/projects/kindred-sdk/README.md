---
title: Kindred SDK
status: active
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-04-21
next_step: Pick generator (openapi-python-client vs fern vs openapi-generator) and spike it against backend's /openapi.json
---

# Kindred SDK

## Goal
Ship a typed Python client for the personal-crm FastAPI backend, generated from its OpenAPI schema. The SDK is the foundation for scripting, automations (including n8n custom nodes), and any future third-party integrations — so regeneration must be mechanical and CI-gated against schema drift.

## Tasks
- [ ] Pick generator (openapi-python-client vs fern vs openapi-generator)
- [ ] Wire schema export into CI (fail on drift)
- [ ] Write thin facade (e.g. `crm.contacts.list()`) over generated client
- [ ] Publish to PyPI (or internal index)

## Session Log

### 2026-04-21
- Project created.

## Notes
- Source of truth: FastAPI `/openapi.json` from [backend/app/main.py](../../../backend/app/main.py).
- Backend is schema-first (FastAPI + Pydantic), so generation is preferred over hand-written wrappers.
- Generator candidates: `openapi-python-client` (httpx, typed, most idiomatic), `fern` (multi-language, SaaS-ish), `openapi-generator` (mature but verbose output).
- Downstream consumer: n8n custom community node may reuse the same schema — keep naming conventions generic.
