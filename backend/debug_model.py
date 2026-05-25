import sqlmodel.main as sm
from sqlmodel import Field, SQLModel
from pydantic import Field as PydanticField

# Monkey-patch to debug
original = sm.get_sqlalchemy_type
def debug_get_sqlalchemy_type(field):
    print(f'Field: {field}')
    print(f'Annotation: {field.annotation}')
    print(f'Type of annotation: {type(field.annotation)}')
    try:
        result = original(field)
        print(f'Result: {result}')
        return result
    except Exception as e:
        print(f'Error: {e}')
        raise
sm.get_sqlalchemy_type = debug_get_sqlalchemy_type

class Test(SQLModel, table=True):
    id: int = Field(primary_key=True)
    x: float = Field(gt=0)

print("OK")
