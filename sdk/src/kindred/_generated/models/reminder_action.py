from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.frequency import Frequency
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="ReminderAction")


@_attrs_define
class ReminderAction:
    """
    Attributes:
        id (UUID):
        kind (Literal['reminder']):
        evidence (str):
        title (str):
        enabled (bool | Unset):  Default: True.
        review_warning (None | str | Unset):
        contact_id (None | Unset | UUID):
        description (None | str | Unset):
        remind_at (datetime.datetime | None | Unset):
        frequency (Frequency | Unset):
        is_active (bool | Unset):  Default: True.
    """

    id: UUID
    kind: Literal["reminder"]
    evidence: str
    title: str
    enabled: bool | Unset = True
    review_warning: None | str | Unset = UNSET
    contact_id: None | Unset | UUID = UNSET
    description: None | str | Unset = UNSET
    remind_at: datetime.datetime | None | Unset = UNSET
    frequency: Frequency | Unset = UNSET
    is_active: bool | Unset = True

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        kind = self.kind

        evidence = self.evidence

        title = self.title

        enabled = self.enabled

        review_warning: None | str | Unset
        if isinstance(self.review_warning, Unset):
            review_warning = UNSET
        else:
            review_warning = self.review_warning

        contact_id: None | str | Unset
        if isinstance(self.contact_id, Unset):
            contact_id = UNSET
        elif isinstance(self.contact_id, UUID):
            contact_id = str(self.contact_id)
        else:
            contact_id = self.contact_id

        description: None | str | Unset
        if isinstance(self.description, Unset):
            description = UNSET
        else:
            description = self.description

        remind_at: None | str | Unset
        if isinstance(self.remind_at, Unset):
            remind_at = UNSET
        elif isinstance(self.remind_at, datetime.datetime):
            remind_at = self.remind_at.isoformat()
        else:
            remind_at = self.remind_at

        frequency: str | Unset = UNSET
        if not isinstance(self.frequency, Unset):
            frequency = self.frequency.value

        is_active = self.is_active

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "evidence": evidence,
                "title": title,
            }
        )
        if enabled is not UNSET:
            field_dict["enabled"] = enabled
        if review_warning is not UNSET:
            field_dict["review_warning"] = review_warning
        if contact_id is not UNSET:
            field_dict["contact_id"] = contact_id
        if description is not UNSET:
            field_dict["description"] = description
        if remind_at is not UNSET:
            field_dict["remind_at"] = remind_at
        if frequency is not UNSET:
            field_dict["frequency"] = frequency
        if is_active is not UNSET:
            field_dict["is_active"] = is_active

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        kind = cast(Literal["reminder"], d.pop("kind"))
        if kind != "reminder":
            raise ValueError(f"kind must match const 'reminder', got '{kind}'")

        evidence = d.pop("evidence")

        title = d.pop("title")

        enabled = d.pop("enabled", UNSET)

        def _parse_review_warning(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        review_warning = _parse_review_warning(d.pop("review_warning", UNSET))

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

        def _parse_description(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        description = _parse_description(d.pop("description", UNSET))

        def _parse_remind_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                remind_at_type_0 = isoparse(data)

                return remind_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        remind_at = _parse_remind_at(d.pop("remind_at", UNSET))

        _frequency = d.pop("frequency", UNSET)
        frequency: Frequency | Unset
        if isinstance(_frequency, Unset):
            frequency = UNSET
        else:
            frequency = Frequency(_frequency)

        is_active = d.pop("is_active", UNSET)

        reminder_action = cls(
            id=id,
            kind=kind,
            evidence=evidence,
            title=title,
            enabled=enabled,
            review_warning=review_warning,
            contact_id=contact_id,
            description=description,
            remind_at=remind_at,
            frequency=frequency,
            is_active=is_active,
        )

        return reminder_action
