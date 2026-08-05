---
title: Debt Partial Payments
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-08-04
next_step: Create Alembic migration for debt_payment table
---

# Debt Partial Payments

## Goal
Track multiple payments against a debt to better match real-world IOUs. Currently debts use a single `is_settled` boolean; this feature introduces a `debt_payment` table storing individual payment records (amount, date, optional note) so debts can be settled incrementally.

## Tasks
- [ ] Create Alembic migration for debt_payment table (amount DECIMAL, paid_at DATE, note TEXT, foreign key to debt)
- [ ] Backfill existing settled debts with single payment rows (one row per settled debt, amount = debt.amount, paid_at = settled_at)
- [ ] Add DraftPayment / DebtPaymentCreate / DebtPaymentPublic schemas in models.py
- [ ] Implement API endpoints: POST /debts/{id}/payments, GET /debts/{id}/payments, DELETE /debts/{payment_id}
- [ ] Compute is_settled in Debt models and responses (sum(payments.amount) >= debt.amount)
- [ ] Build UI payments panel on debt detail view with add/delete payment row forms

## Session Log

### 2026-08-04
- Housekeeping: Bump last_updated after repo releases and updates.

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

## Notes

- **Decimal Precision**: Debt.amount is currently float; consider migrating to NUMERIC(12,2) for exact currency math.
- **Overpayment Handling**: Multiple payment records can sum to more than debt.amount; UI should warn but not prevent. Consider flags like "is_overpaid" or "paid_amount" for clarity.
- **Backfill Strategy**: Migration should only create payment rows for debts with settled_at IS NOT NULL. Non-settled debts have zero payments.
- **is_settled as Computed**: Two approaches: (1) SQLAlchemy hybrid property or generated column in the database, or (2) compute in API response layer. Option 1 is cleaner but requires database support; option 2 is safer for older databases.
- **Soft Delete Integration**: This feature pairs naturally with soft-delete on debts (future item 5); mark deleted debts as archived and exclude from sum checks.
- **Decimal Type**: Use NUMERIC(12,2) or DECIMAL(12,2) in migration; SQLModel supports Decimal type from decimal module.
- **Foreign Key Cleanup**: Set ON DELETE CASCADE on debt_payment.debt_id to keep data consistent when a debt is deleted.
