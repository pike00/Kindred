from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from typing import Literal, cast
from uuid import UUID
import datetime


T = TypeVar("T", bound="LifeEventAction")


@_attrs_define
class LifeEventAction:
    """
    Attributes:
        id (UUID):
        kind (Literal['life_event']):
        evidence (str):
        event_type (str):
        title (str):
        enabled (bool | Unset):  Default: True.
        review_warning (None | str | Unset):
        contact_id (None | Unset | UUID):
        description (None | str | Unset):
        occurred_at (datetime.date | None | Unset):
        create_annual_reminder (bool | Unset):  Default: False.
    """

    id: UUID
    kind: Literal["life_event"]
    evidence: str
    event_type: str
    title: str
    enabled: bool | Unset = True
    review_warning: None | str | Unset = UNSET
    contact_id: None | Unset | UUID = UNSET
    description: None | str | Unset = UNSET
    occurred_at: datetime.date | None | Unset = UNSET
    create_annual_reminder: bool | Unset = False

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        kind = self.kind

        evidence = self.evidence

        event_type = self.event_type

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

        occurred_at: None | str | Unset
        if isinstance(self.occurred_at, Unset):
            occurred_at = UNSET
        elif isinstance(self.occurred_at, datetime.date):
            occurred_at = self.occurred_at.isoformat()
        else:
            occurred_at = self.occurred_at

        create_annual_reminder = self.create_annual_reminder

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "kind": kind,
                "evidence": evidence,
                "event_type": event_type,
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
        if occurred_at is not UNSET:
            field_dict["occurred_at"] = occurred_at
        if create_annual_reminder is not UNSET:
            field_dict["create_annual_reminder"] = create_annual_reminder

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        kind = cast(Literal["life_event"], d.pop("kind"))
        if kind != "life_event":
            raise ValueError(f"kind must match const 'life_event', got '{kind}'")

        evidence = d.pop("evidence")

        event_type = d.pop("event_type")

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

        def _parse_occurred_at(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                occurred_at_type_0 = isoparse(data).date()

                return occurred_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        occurred_at = _parse_occurred_at(d.pop("occurred_at", UNSET))

        create_annual_reminder = d.pop("create_annual_reminder", UNSET)

        life_event_action = cls(
            id=id,
            kind=kind,
            evidence=evidence,
            event_type=event_type,
            title=title,
            enabled=enabled,
            review_warning=review_warning,
            contact_id=contact_id,
            description=description,
            occurred_at=occurred_at,
            create_annual_reminder=create_annual_reminder,
        )

        return life_event_action
