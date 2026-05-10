"""Kindred SDK - A typed Python client for Personal CRM."""

from .client import KindredClient
from .resources.activity_logs import ActivityLogsResource
from .resources.addresses import AddressesResource
from .resources.calendar import CalendarResource
from .resources.contacts import ContactsResource
from .resources.custom_fields import CustomFieldsResource
from .resources.debts import DebtsResource
from .resources.gifts import GiftsResource
from .resources.groups import GroupsResource
from .resources.interactions import InteractionsResource
from .resources.journal import JournalResource
from .resources.life_events import LifeEventsResource
from .resources.notes import NotesResource
from .resources.pets import PetsResource
from .resources.relationships import RelationshipsResource
from .resources.reminders import RemindersResource
from .resources.tags import TagsResource

__all__ = [
    "KindredClient",
    "ContactsResource",
    "GroupsResource",
    "InteractionsResource",
    "TagsResource",
    "NotesResource",
    "GiftsResource",
    "DebtsResource",
    "PetsResource",
    "AddressesResource",
    "RelationshipsResource",
    "RemindersResource",
    "LifeEventsResource",
    "JournalResource",
    "CustomFieldsResource",
    "ActivityLogsResource",
    "CalendarResource",
]
