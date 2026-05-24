"""Debt management routes."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_debt
from app.models import (
    Debt,
    DebtCreate,
    DebtPublic,
    DebtsPublic,
    DebtUpdate,
    Ok,
)

router = APIRouter(prefix="/debts", tags=["debts"])


def _require_contact_visible(session: Any, user: Any, contact_id: uuid.UUID) -> None:
    if not contact_visible(session=session, user=user, contact_id=contact_id):
        raise HTTPException(status_code=404, detail="Contact not found")


@router.get("/contact/{contact_id}", response_model=DebtsPublic)
def list_debts(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> DebtsPublic:
    """List debts for a contact."""
    _require_contact_visible(session, current_user, contact_id)

    statement = (
        select(Debt)
        .where(Debt.contact_id == contact_id)
        .where(Debt.deleted_at == None)  # noqa: E711
    )
    debts = session.exec(statement).all()

    return DebtsPublic(
        data=[DebtPublic.model_validate(d) for d in debts],
        count=len(debts),
    )


@router.post("/", response_model=DebtPublic)
def create_debt_route(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    debt_in: DebtCreate,
) -> DebtPublic:
    """Create a new debt."""
    _require_contact_visible(session, current_user, debt_in.contact_id)

    debt = create_debt(session=session, debt_in=debt_in, owner_id=current_user.id)
    return DebtPublic.model_validate(debt)


@router.patch("/{debt_id}", response_model=DebtPublic)
def update_debt(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
    debt_in: DebtUpdate,
) -> DebtPublic:
    """Update a debt."""
    debt = session.get(Debt, debt_id)
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    _require_contact_visible(session, current_user, debt.contact_id)

    update_data = debt_in.model_dump(exclude_unset=True)
    debt.sqlmodel_update(update_data)
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return DebtPublic.model_validate(debt)


@router.delete("/{debt_id}", response_model=Ok)
def delete_debt(
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
) -> Ok:
    """Soft-delete a debt by setting deleted_at."""
    debt = session.get(Debt, debt_id)
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    _require_contact_visible(session, current_user, debt.contact_id)

    debt.deleted_at = datetime.now(timezone.utc)
    session.add(debt)
    session.commit()
    return Ok()


@router.post("/{debt_id}/restore")
def restore_debt(
    session: SessionDep,
    debt_id: uuid.UUID,
) -> Any:
    """Restore a soft-deleted debt by clearing deleted_at."""
    from sqlalchemy import text, update

    result = session.exec(
        text("SELECT id FROM debt WHERE id = :id AND deleted_at IS NOT NULL"),
        params={"id": str(debt_id)},
    ).first()
    if result is None:
        raise HTTPException(status_code=404, detail="Debt not found or not deleted")
    session.exec(update(Debt).where(Debt.id == debt_id).values(deleted_at=None))
    session.commit()
    return Ok()
