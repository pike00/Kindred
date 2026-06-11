from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.reminder_frequency import ReminderFrequency
from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
    from ..models.reminder_contact_info import ReminderContactInfo


T = TypeVar("T", bound="ReminderDuePublic")


@_attrs_define
class ReminderDuePublic:
    """
    Attributes:
        title (str): Reminder title.
        remind_at (datetime.datetime): When to fire the reminder.
        id (UUID):
        contact_id (None | UUID):
        last_sent_at (datetime.datetime | None):
        snoozed_until (datetime.datetime | None):
        created_at (datetime.datetime):
        description (None | str | Unset): Extra details shown with the reminder.
        frequency (ReminderFrequency | Unset):
        is_active (bool | Unset): Enable or disable without deleting. Default: True.
        deleted_at (datetime.datetime | None | Unset):
        contact_name (None | str | Unset):
        contact (None | ReminderContactInfo | Unset):
    """

    title: str
    remind_at: datetime.datetime
    id: UUID
    contact_id: None | UUID
    last_sent_at: datetime.datetime | None
    snoozed_until: datetime.datetime | None
    created_at: datetime.datetime
    description: None | str | Unset = UNSET
    frequency: ReminderFrequency | Unset = UNSET
    is_active: bool | Unset = True
    deleted_at: datetime.datetime | None | Unset = UNSET
    contact_name: None | str | Unset = UNSET
    contact: None | ReminderContactInfo | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.reminder_contact_info import ReminderContactInfo

        title = self.title

        remind_at = self.remind_at.isoformat()

        id = str(self.id)

        contact_id: None | str
        if isinstance(self.contact_id, UUID):
            contact_id = str(self.contact_id)
        else:
            contact_id = self.contact_id

        last_sent_at: None | str
        if isinstance(self.last_sent_at, datetime.datetime):
            last_sent_at = self.last_sent_at.isoformat()
        else:
            last_sent_at = self.last_sent_at

        snoozed_until: None | str
        if isinstance(self.snoozed_until, datetime.datetime):
            snoozed_until = self.snoozed_until.isoformat()
        else:
            snoozed_until = self.snoozed_until

        created_at = self.created_at.isoformat()

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        frequency: str | Unset = UNSET
        if not isinstance(self.frequency, Unset):
            frequency = self.frequency.value

        is_active = self.is_active

        deleted_at: None | str | Unset
        if isinstance(self.deleted_at, Unset):
            deleted_at = UNSET
        elif isinstance(self.deleted_at, datetime.datetime):
            deleted_at = self.deleted_at.isoformat()
        else:
            deleted_at = self.deleted_at

        contact_name: None | str | Unset
        if isinstance(self.contact_name, Unset):
            contact_name = UNSET
        else:
            contact_name = self.contact_name

        contact: dict[str, Any] | None | Unset
        if isinstance(self.contact, Unset):
            contact = UNSET
        elif isinstance(self.contact, ReminderContactInfo):
            contact = self.contact.to_dict()
        else:
            contact = self.contact

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "title": title,
                "remind_at": remind_at,
                "id": id,
                "contact_id": contact_id,
                "last_sent_at": last_sent_at,
                "snoozed_until": snoozed_until,
                "created_at": created_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if frequency is not UNSET:
            field_dict["frequency"] = frequency
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if deleted_at is not UNSET:
            field_dict["deleted_at"] = deleted_at
        if contact_name is not UNSET:
            field_dict["contact_name"] = contact_name
        if contact is not UNSET:
            field_dict["contact"] = contact

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.reminder_contact_info import ReminderContactInfo

        d = dict(src_dict)
        title = d.pop("title")

        remind_at = datetime.datetime.fromisoformat(d.pop("remind_at"))

        id = UUID(d.pop("id"))

        def _parse_contact_id(data: object) -> None | UUID:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                contact_id_type_0 = UUID(data)

                return contact_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | UUID, data)

        contact_id = _parse_contact_id(d.pop("contact_id"))

        def _parse_last_sent_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_sent_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_sent_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_sent_at = _parse_last_sent_at(d.pop("last_sent_at"))

        def _parse_snoozed_until(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                snoozed_until_type_0 = datetime.datetime.fromisoformat(data)

                return snoozed_until_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        snoozed_until = _parse_snoozed_until(d.pop("snoozed_until"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        _frequency = d.pop("frequency", UNSET)
        frequency: ReminderFrequency | Unset
        if isinstance(_frequency, Unset):
            frequency = UNSET
        else:
            frequency = ReminderFrequency(_frequency)

        is_active = d.pop("is_active", UNSET)

        def _parse_deleted_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deleted_at_type_0 = datetime.datetime.fromisoformat(data)

                return deleted_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        deleted_at = _parse_deleted_at(d.pop("deleted_at", UNSET))

        def _parse_contact_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        contact_name = _parse_contact_name(d.pop("contact_name", UNSET))

        def _parse_contact(data: object) -> None | ReminderContactInfo | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                contact_type_0 = ReminderContactInfo.from_dict(data)

                return contact_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | ReminderContactInfo | Unset, data)

        contact = _parse_contact(d.pop("contact", UNSET))

        reminder_due_public = cls(
            title=title,
            remind_at=remind_at,
            id=id,
            contact_id=contact_id,
            last_sent_at=last_sent_at,
            snoozed_until=snoozed_until,
            created_at=created_at,
            description=description,
            frequency=frequency,
            is_active=is_active,
            deleted_at=deleted_at,
            contact_name=contact_name,
            contact=contact,
        )

        reminder_due_public.additional_properties = d
        return reminder_due_public

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
