from sqlmodel import Field, SQLModel
from sqlalchemy import Numeric

class Test(SQLModel, table=True):
    id: int = Field(primary_key=True)
    x: float = Field(sa_type=Numeric(12, 2))

print("OK")
