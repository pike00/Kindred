from enum import StrEnum


class ContactSource(StrEnum):
    CARDDAV = "carddav"
    GOOGLE = "google"
    MANUAL = "manual"
    VCARD_IMPORT = "vcard_import"
    WEBHOOK = "webhook"

    def __str__(self) -> str:
        return str(self.value)
