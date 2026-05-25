from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Numeric
from uuid import UUID, uuid4
from datetime import datetime, timezone

class Debt(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)

class DebtPayment(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    amount: float = Field(sa_type=Numeric(12, 2))
    debt_id: UUID = Field(foreign_key="debt.id")
    debt: "Debt" = Relationship(back_populates="payments")

print("OK")
