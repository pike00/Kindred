"""Debt management routes."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud import contact_visible, create_debt
from app.models import (
    Debt,
    DebtCreate,
    DebtPayment,
    DebtPaymentCreate,
    DebtPaymentPublic,
    DebtPublic,
    DebtsPublic,
    DebtUpdate,
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
) -> Any:
    """List debts for a contact."""
    _require_contact_visible(session, current_user, contact_id)

    statement = select(Debt).where(Debt.contact_id == contact_id)
    debts = session.exec(statement).all()

    # Compute paid_amount and is_settled for each debt
    debt_publics = []
    for debt in debts:
        debt_public = DebtPublic.model_validate(debt)
        # Query payments for this debt
        payments_stmt = select(DebtPayment).where(DebtPayment.debt_id == debt.id)
        payments = session.exec(payments_stmt).all()
        debt_public.payments = [DebtPaymentPublic.model_validate(p) for p in payments]
        debt_public.paid_amount = sum(p.amount for p in payments)
        debt_public.is_settled = debt_public.paid_amount >= debt.amount
        debt_publics.append(debt_public)

    return DebtsPublic(
        data=debt_publics,
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
) -> Any:
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
    # Compute paid_amount and is_settled
    debt_public = DebtPublic.model_validate(debt)
    # Query payments for this debt
    payments_stmt = select(DebtPayment).where(DebtPayment.debt_id == debt.id)
    payments = session.exec(payments_stmt).all()
    debt_public.payments = [DebtPaymentPublic.model_validate(p) for p in payments]

    return debt_public


@router.delete("/{debt_id}")
def delete_debt(
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
) -> Any:
    """Delete a debt."""
    debt = session.get(Debt, debt_id)
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    _require_contact_visible(session, current_user, debt.contact_id)

    session.delete(debt)
    session.commit()
    return {"ok": True}


# ─── Debt Payment endpoints ─────────────────────────────────────────────


@router.get("/{debt_id}/payments", response_model=list[DebtPaymentPublic])
def list_debt_payments(
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
) -> Any:
    """List all payments for a specific debt."""
    debt = session.get(Debt, debt_id)
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    _require_contact_visible(session, current_user, debt.contact_id)
    return debt.payments


@router.post("/{debt_id}/payments", response_model=DebtPaymentPublic)
def create_debt_payment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    debt_id: uuid.UUID,
    payment_in: DebtPaymentCreate,
) -> Any:
    """Add a payment to a debt."""
    debt = session.get(Debt, debt_id)
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    _require_contact_visible(session, current_user, debt.contact_id)

    payment = DebtPayment(
        debt_id=debt_id,
        **payment_in.model_dump(),
    )
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}")
def delete_debt_payment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    payment_id: uuid.UUID,
) -> Any:
    """Delete a payment."""
    payment = session.get(DebtPayment, payment_id)
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Check access via the parent debt's contact
    debt = session.get(Debt, payment.debt_id)
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    _require_contact_visible(session, current_user, debt.contact_id)

    session.delete(payment)
    session.commit()
    return {"ok": True}
