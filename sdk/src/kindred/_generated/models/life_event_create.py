from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="LifeEventCreate")


@_attrs_define
class LifeEventCreate:
    """
    Attributes:
        event_type (str): Kind of milestone: job_change, move, wedding, baby, graduation, birthday, anniversary, etc.
        title (str): Event title.
        occurred_at (datetime.date): Date the event happened.
        contact_id (UUID):
        description (None | str | Unset): Extra details about the event.
        create_annual_reminder (bool | Unset): If true, auto-create a yearly recurring reminder on this date. Default:
            False.
    """

    event_type: str
    title: str
    occurred_at: datetime.date
    contact_id: UUID
    description: None | str | Unset = UNSET
    create_annual_reminder: bool | Unset = False
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        event_type = self.event_type

        title = self.title

        occurred_at = self.occurred_at.isoformat()

        contact_id = str(self.contact_id)

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        create_annual_reminder = self.create_annual_reminder

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "event_type": event_type,
                "title": title,
                "occurred_at": occurred_at,
                "contact_id": contact_id,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if create_annual_reminder is not UNSET:
            field_dict["create_annual_reminder"] = create_annual_reminder

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        event_type = d.pop("event_type")

        title = d.pop("title")

        occurred_at = datetime.date.fromisoformat(d.pop("occurred_at"))

        contact_id = UUID(d.pop("contact_id"))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        create_annual_reminder = d.pop("create_annual_reminder", UNSET)

        life_event_create = cls(
            event_type=event_type,
            title=title,
            occurred_at=occurred_at,
            contact_id=contact_id,
            description=description,
            create_annual_reminder=create_annual_reminder,
        )

        life_event_create.additional_properties = d
        return life_event_create

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
