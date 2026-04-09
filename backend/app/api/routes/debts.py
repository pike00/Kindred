"""Debt management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.crud import create_debt
from app.models import Contact, Debt, DebtCreate, DebtPublic, DebtUpdate, DebtsPublic

router = APIRouter(prefix="/debts", tags=["debts"])


@router.get("/contact/{contact_id}", response_model=DebtsPublic)
def list_debts(
    session: SessionDep,
    current_user: CurrentUser,
    contact_id: uuid.UUID,
) -> Any:
    """List debts for a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(Debt).where(Debt.contact_id == contact_id)
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
) -> Any:
    """Create a new debt."""
    contact = session.get(Contact, debt_in.contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    if contact.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    debt = create_debt(session=session, debt_in=debt_in, owner_id=current_user.id)
    return DebtPublic.model_validate(debt)


@router.patch("/{debt_id}", response_model=DebtPublic)
def update_debt(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
    debt_in: DebtUpdate,
) -> Any:
    """Update a debt."""
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = debt_in.model_dump(exclude_unset=True)
    debt.sqlmodel_update(update_data)
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return DebtPublic.model_validate(debt)


@router.delete("/{debt_id}")
def delete_debt(
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
) -> Any:
    """Delete a debt."""
    debt = session.get(Debt, debt_id)
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(debt)
    session.commit()
    return {"ok": True}
