from enum import Enum


class ContactSource(str, Enum):
    CARDDAV = "CARDDAV"
    GOOGLE = "GOOGLE"
    MANUAL = "MANUAL"
    VCARD_IMPORT = "VCARD_IMPORT"
    WEBHOOK = "WEBHOOK"

    def __str__(self) -> str:
        return str(self.value)
