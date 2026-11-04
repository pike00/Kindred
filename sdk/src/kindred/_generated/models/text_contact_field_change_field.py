from enum import Enum


class TextContactFieldChangeField(str, Enum):
    COMPANY = "company"
    DEPARTMENT = "department"
    HOW_WE_MET = "how_we_met"
    NICKNAME = "nickname"
    PRONOUNS = "pronouns"
    TITLE = "title"

    def __str__(self) -> str:
        return str(self.value)
