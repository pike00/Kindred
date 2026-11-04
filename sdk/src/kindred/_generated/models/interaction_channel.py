from enum import Enum


class InteractionChannel(str, Enum):
    CALL = "call"
    EMAIL = "email"
    IN_PERSON = "in_person"
    OTHER = "other"
    RECOMMENDATION = "recommendation"
    SKIP = "skip"
    SOCIAL = "social"
    TEXT = "text"
    VIDEO = "video"

    def __str__(self) -> str:
        return str(self.value)
