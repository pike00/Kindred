from enum import Enum


class VoiceCapturePublicStatus(str, Enum):
    COMMITTED = "committed"
    DRAFT = "draft"
    READY = "ready"

    def __str__(self) -> str:
        return str(self.value)
