from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.core.security import get_password_hash
from app.models import User, UserPublic
from app.seed_fake_data import run as seed_run

log = logging.getLogger("seed_api")

router = APIRouter(tags=["private"], prefix="/private")


class PrivateUserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    is_verified: bool = False


@router.post("/users/", response_model=UserPublic)
def create_user(user_in: PrivateUserCreate, session: SessionDep) -> Any:
    """
    Create a new user.
    """

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )

    session.add(user)
    session.commit()

    return user


@router.post("/seed", response_model=dict)
def seed_data(
    session: SessionDep,
    count: int = Query(50, description="Number of contacts to seed"),
    reset: bool = Query(False, description="Wipe existing data before seeding"),
    rng_seed: int | None = Query(None, description="RNG seed for determinism"),
) -> dict:
    """Seed the database with fake demo data. Only available in local environment."""
    from sqlmodel import select

    user = session.exec(select(User).limit(1)).first()
    if not user:
        return {"error": "No user found. Create a user first."}

    seed_run(count=count, email=user.email, reset=reset, rng_seed=rng_seed)

    return {"status": "ok", "message": f"Seeded {count} contacts for {user.email}"}
