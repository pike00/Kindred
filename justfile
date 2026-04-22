# Personal CRM — dev recipes.
# Run `just --list` to see them all.

# Which compose file to target. Override per-invocation:
#   just compose=compose.yml seed
compose := "compose.dev.yml"

_dc := "docker compose -f " + compose

# Seed fake data for the FIRST_SUPERUSER. Safe to run repeatedly; adds more on top.
seed count="500" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} {{ if email == "" { "" } else { "--email " + email } }}

# Wipe this user's existing contacts/tags/groups/reminders, then reseed.
seed-reset count="500" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset {{ if email == "" { "" } else { "--email " + email } }}

# Deterministic seed — same data every run (good for screenshots/demos).
seed-fixed count="500" rng="42" email="":
    {{_dc}} exec -T backend python app/seed_fake_data.py --count {{count}} --reset --seed {{rng}} {{ if email == "" { "" } else { "--email " + email } }}
