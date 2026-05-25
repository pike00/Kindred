"""Token-gated first-boot admin onboarding (Phase 11).

Mounted at the bare ``/setup`` path (not under ``/api/v1``) so the URL printed
in the container log on first boot is short and readable.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from pydantic import EmailStr
from sqlmodel import SQLModel, select

from app import crud
from app.api.deps import SessionDep
from app.core.setup_state import (
    get_state,
    mark_complete,
    verify_setup_token,
)
from app.models import User, UserCreate, UserPublic

router = APIRouter(tags=["setup"])


_SETUP_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kindred — first-time setup</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 28rem; margin: 4rem auto; padding: 0 1rem; }}
  label {{ display: block; margin-top: 1rem; font-weight: 600; }}
  input {{ width: 100%; padding: 0.5rem; font-size: 1rem; box-sizing: border-box; }}
  button {{ margin-top: 1.5rem; padding: 0.6rem 1.2rem; font-size: 1rem; cursor: pointer; }}
  .err {{ color: #b00020; margin-top: 1rem; min-height: 1.2rem; }}
</style>
</head>
<body>
<h1>Create the first admin</h1>
<p>This setup link is single-use. Once you submit, the gate lifts and the app is open.</p>
<form id="f">
  <label>Email <input type="email" name="email" required></label>
  <label>Password <input type="password" name="password" minlength="8" required></label>
  <label>Full name (optional) <input type="text" name="full_name"></label>
  <button type="submit">Create admin</button>
  <div class="err" id="err"></div>
</form>
<script>
  const token = {token_json};
  document.getElementById("f").addEventListener("submit", async (ev) => {{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const body = {{ token, email: fd.get("email"), password: fd.get("password") }};
    const fn = fd.get("full_name");
    if (fn) body.full_name = fn;
    const r = await fetch("/setup", {{
      method: "POST",
      headers: {{ "Content-Type": "application/json" }},
      body: JSON.stringify(body),
    }});
    if (r.ok) {{
      window.location.href = "/";
    }} else {{
      const t = await r.text();
      document.getElementById("err").textContent = "Setup failed: " + t;
    }}
  }});
</script>
</body>
</html>
"""


class SetupSubmit(SQLModel):
    token: str
    email: EmailStr
    password: str
    full_name: str | None = None


def _gate_status(session: SessionDep) -> Any:
    """Return the current state row, or raise the right HTTP error."""
    state = get_state(session)
    if state is None or not state.complete and state.token_hash is None:
        # Should not happen in normal operation — startup hook seeds the row.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Setup state not initialised; check container logs.",
        )
    return state


@router.get("/setup", response_class=HTMLResponse)
def setup_page(session: SessionDep, token: str = Query(...)) -> Any:
    state = _gate_status(session)
    if state.complete:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Setup is already complete.",
        )
    assert state.token_hash is not None
    if not verify_setup_token(token, state.token_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid setup token."
        )
    # JSON-encode the token so it round-trips safely into the inline script.
    import json as _json

    return HTMLResponse(_SETUP_PAGE.format(token_json=_json.dumps(token)))


@router.post("/setup", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def setup_submit(session: SessionDep, body: SetupSubmit = Body(...)) -> Any:
    state = _gate_status(session)
    if state.complete:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Setup is already complete.",
        )
    assert state.token_hash is not None
    if not verify_setup_token(body.token, state.token_hash):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid setup token."
        )

    # Belt-and-suspenders: refuse if a user with this email already exists.
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user = crud.create_user(
        session=session,
        user_create=UserCreate(
            email=body.email,
            password=body.password,
            full_name=body.full_name,
            is_superuser=True,
            is_active=True,
        ),
    )
    mark_complete(session, state)
    return user
