from enum import Enum

class GiftStatus(str, Enum):
    GIVEN = "given"
    IDEA = "idea"
    RECEIVED = "received"

    def __str__(self) -> str:
        return str(self.value)
