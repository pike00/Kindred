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


T = TypeVar("T", bound="CommunicationPreferencePublic")


@_attrs_define
class CommunicationPreferencePublic:
    """
    Attributes:
        id (UUID):
        contact_id (UUID):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        preferred_channel (None | str | Unset):
        best_time_local (None | str | Unset):
        do_not_contact (bool | Unset):  Default: False.
        do_not_contact_reason (None | str | Unset):
    """

    id: UUID
    contact_id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    preferred_channel: None | str | Unset = UNSET
    best_time_local: None | str | Unset = UNSET
    do_not_contact: bool | Unset = False
    do_not_contact_reason: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = str(self.id)

        contact_id = str(self.contact_id)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        preferred_channel: None | str | Unset
        if isinstance(self.preferred_channel, Unset):
            preferred_channel = UNSET
        else:
            preferred_channel = self.preferred_channel

        best_time_local: None | str | Unset
        if isinstance(self.best_time_local, Unset):
            best_time_local = UNSET
        else:
            best_time_local = self.best_time_local

        do_not_contact = self.do_not_contact

        do_not_contact_reason: None | str | Unset
        if isinstance(self.do_not_contact_reason, Unset):
            do_not_contact_reason = UNSET
        else:
            do_not_contact_reason = self.do_not_contact_reason

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "contact_id": contact_id,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if preferred_channel is not UNSET:
            field_dict["preferred_channel"] = preferred_channel
        if best_time_local is not UNSET:
            field_dict["best_time_local"] = best_time_local
        if do_not_contact is not UNSET:
            field_dict["do_not_contact"] = do_not_contact
        if do_not_contact_reason is not UNSET:
            field_dict["do_not_contact_reason"] = do_not_contact_reason

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = UUID(d.pop("id"))

        contact_id = UUID(d.pop("contact_id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_preferred_channel(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        preferred_channel = _parse_preferred_channel(d.pop("preferred_channel", UNSET))

        def _parse_best_time_local(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        best_time_local = _parse_best_time_local(d.pop("best_time_local", UNSET))

        do_not_contact = d.pop("do_not_contact", UNSET)

        def _parse_do_not_contact_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        do_not_contact_reason = _parse_do_not_contact_reason(d.pop("do_not_contact_reason", UNSET))

        communication_preference_public = cls(
            id=id,
            contact_id=contact_id,
            created_at=created_at,
            updated_at=updated_at,
            preferred_channel=preferred_channel,
            best_time_local=best_time_local,
            do_not_contact=do_not_contact,
            do_not_contact_reason=do_not_contact_reason,
        )

        communication_preference_public.additional_properties = d
        return communication_preference_public

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
