from enum import StrEnum


class DebtDirection(StrEnum):
    I_OWE = "i_owe"
    THEY_OWE = "they_owe"

    def __str__(self) -> str:
        return str(self.value)
