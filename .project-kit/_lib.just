# .project-kit/_lib.just — universal helpers, identical in every adopter

[private]
_skip LABEL:
    @echo "[skip] {{LABEL}} not configured for this repo"

[private]
_step N TOTAL MSG:
    @echo "[{{N}}/{{TOTAL}}] {{MSG}}…"
