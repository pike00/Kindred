from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.reminder_frequency import ReminderFrequency
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="ReminderCreate")


@_attrs_define
class ReminderCreate:
    """
    Attributes:
        title (str): Reminder title.
        remind_at (datetime.datetime): When to fire the reminder.
        description (None | str | Unset): Extra details shown with the reminder.
        frequency (ReminderFrequency | Unset):
        is_active (bool | Unset): Enable or disable without deleting. Default: True.
        contact_id (None | Unset | UUID):
    """

    title: str
    remind_at: datetime.datetime
    description: None | str | Unset = UNSET
    frequency: ReminderFrequency | Unset = UNSET
    is_active: bool | Unset = True
    contact_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        title = self.title

        remind_at = self.remind_at.isoformat()

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        frequency: str | Unset = UNSET
        if not isinstance(self.frequency, Unset):
            frequency = self.frequency.value

        is_active = self.is_active

        contact_id: None | str | Unset
        if isinstance(self.contact_id, Unset):
            contact_id = UNSET
        elif isinstance(self.contact_id, UUID):
            contact_id = str(self.contact_id)
        else:
            contact_id = self.contact_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "title": title,
                "remind_at": remind_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if frequency is not UNSET:
            field_dict["frequency"] = frequency
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if contact_id is not UNSET:
            field_dict["contact_id"] = contact_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        title = d.pop("title")

        remind_at = isoparse(d.pop("remind_at"))

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

        def _parse_contact_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                contact_id_type_0 = UUID(data)

                return contact_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        contact_id = _parse_contact_id(d.pop("contact_id", UNSET))

        reminder_create = cls(
            title=title,
            remind_at=remind_at,
            description=description,
            frequency=frequency,
            is_active=is_active,
            contact_id=contact_id,
        )

        reminder_create.additional_properties = d
        return reminder_create

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
