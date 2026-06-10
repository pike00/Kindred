from enum import Enum


class GiftStatus(str, Enum):
    GIVEN = "given"
    IDEA = "idea"
    PURCHASED = "purchased"
    RECEIVED = "received"
    WRAPPED = "wrapped"

    def __str__(self) -> str:
        return str(self.value)
