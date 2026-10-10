from enum import StrEnum


class GiftStatus(StrEnum):
    GIVEN = "given"
    IDEA = "idea"
    PURCHASED = "purchased"
    RECEIVED = "received"
    WRAPPED = "wrapped"

    def __str__(self) -> str:
        return str(self.value)
