from enum import StrEnum


class ReminderFrequency(StrEnum):
    DAILY = "daily"
    MONTHLY = "monthly"
    ONCE = "once"
    WEEKLY = "weekly"
    YEARLY = "yearly"

    def __str__(self) -> str:
        return str(self.value)
