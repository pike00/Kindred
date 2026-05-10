from enum import Enum


class ReminderFrequency(str, Enum):
    DAILY = "daily"
    MONTHLY = "monthly"
    ONCE = "once"
    WEEKLY = "weekly"
    YEARLY = "yearly"

    def __str__(self) -> str:
        return str(self.value)
