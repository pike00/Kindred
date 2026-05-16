from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="LifeEventPublic")


@_attrs_define
class LifeEventPublic:
    """
    Attributes:
        event_type (str): Kind of milestone: job_change, move, wedding, baby, graduation, birthday, anniversary, etc.
        title (str): Event title.
        occurred_at (datetime.date): Date the event happened.
        id (UUID):
        contact_id (UUID):
        created_at (datetime.datetime):
        description (None | str | Unset): Extra details about the event.
        create_annual_reminder (bool | Unset): If true, auto-create a yearly recurring reminder on this date. Default:
            False.
        deleted_at (datetime.datetime | None | Unset):
    """

    event_type: str
    title: str
    occurred_at: datetime.date
    id: UUID
    contact_id: UUID
    created_at: datetime.datetime
    description: None | str | Unset = UNSET
    create_annual_reminder: bool | Unset = False
    deleted_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        event_type = self.event_type

        title = self.title

        occurred_at = self.occurred_at.isoformat()

        id = str(self.id)

        contact_id = str(self.contact_id)

        created_at = self.created_at.isoformat()

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        create_annual_reminder = self.create_annual_reminder

        deleted_at: None | str | Unset
        if isinstance(self.deleted_at, Unset):
            deleted_at = UNSET
        elif isinstance(self.deleted_at, datetime.datetime):
            deleted_at = self.deleted_at.isoformat()
        else:
            deleted_at = self.deleted_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "event_type": event_type,
                "title": title,
                "occurred_at": occurred_at,
                "id": id,
                "contact_id": contact_id,
                "created_at": created_at,
            }
        )
        if description is not UNSET:
            field_dict["description"] = description
        if create_annual_reminder is not UNSET:
            field_dict["create_annual_reminder"] = create_annual_reminder
        if deleted_at is not UNSET:
            field_dict["deleted_at"] = deleted_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        event_type = d.pop("event_type")

        title = d.pop("title")

        occurred_at = isoparse(d.pop("occurred_at")).date()

        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        created_at = isoparse(d.pop("created_at"))

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        create_annual_reminder = d.pop("create_annual_reminder", UNSET)

        def _parse_deleted_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deleted_at_type_0 = isoparse(data)

                return deleted_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        deleted_at = _parse_deleted_at(d.pop("deleted_at", UNSET))

        life_event_public = cls(
            event_type=event_type,
            title=title,
            occurred_at=occurred_at,
            id=id,
            contact_id=contact_id,
            created_at=created_at,
            description=description,
            create_annual_reminder=create_annual_reminder,
            deleted_at=deleted_at,
        )

        life_event_public.additional_properties = d
        return life_event_public

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
