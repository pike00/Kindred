"""Kindred SDK client for Personal CRM."""

from personal_crm_client import AuthenticatedClient, Client

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


class KindredClient:
    """A high-level client for the Personal CRM API.

    This client provides a clean, resource-oriented interface over the
    generated ``personal_crm_client``. Use it for scripting, automations,
    and any custom integrations.

    Example:
        >>> from kindred_sdk import KindredClient
        >>> client = KindredClient(base_url="http://localhost:8000", token="my-token")
        >>> contacts = client.contacts.list()
    """

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        *,
        verify_ssl: bool = True,
        timeout: float | None = None,
    ) -> None:
        """Initialize the Kindred client.

        Args:
            base_url: The base URL of the Personal CRM API.
            token: Optional Bearer token for authenticated requests.
            verify_ssl: Whether to verify SSL certificates.
            timeout: Request timeout in seconds.
        """
        if token:
            self._client: AuthenticatedClient | Client = AuthenticatedClient(
                base_url=base_url,
                token=token,
                verify_ssl=verify_ssl,
            )
        else:
            self._client = Client(
                base_url=base_url,
                verify_ssl=verify_ssl,
            )
        if timeout is not None:
            self._client = self._client.with_timeout(timeout)

        # Initialize resources
        self.contacts = ContactsResource(self._client)
        self.groups = GroupsResource(self._client)
        self.interactions = InteractionsResource(self._client)
        self.tags = TagsResource(self._client)
        self.notes = NotesResource(self._client)
        self.gifts = GiftsResource(self._client)
        self.debts = DebtsResource(self._client)
        self.pets = PetsResource(self._client)
        self.addresses = AddressesResource(self._client)
        self.relationships = RelationshipsResource(self._client)
        self.reminders = RemindersResource(self._client)
        self.life_events = LifeEventsResource(self._client)
        self.journal = JournalResource(self._client)
        self.custom_fields = CustomFieldsResource(self._client)
        self.activity_logs = ActivityLogsResource(self._client)
        self.calendar = CalendarResource(self._client)

    def __enter__(self) -> "KindredClient":
        """Enter context manager."""
        self._client.__enter__()
        return self

    def __exit__(self, *args: object, **kwargs: object) -> None:
        """Exit context manager."""
        self._client.__exit__(*args, **kwargs)

    async def __aenter__(self) -> "KindredClient":
        """Enter async context manager."""
        await self._client.__aenter__()
        return self

    async def __aexit__(self, *args: object, **kwargs: object) -> None:
        """Exit async context manager."""
        await self._client.__aexit__(*args, **kwargs)
