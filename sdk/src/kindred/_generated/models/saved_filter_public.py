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

if TYPE_CHECKING:
    from ..models.saved_filter_public_filter_json import SavedFilterPublicFilterJson


T = TypeVar("T", bound="SavedFilterPublic")


@_attrs_define
class SavedFilterPublic:
    """
    Attributes:
        name (str): User-visible name for the smart list.
        filter_json (SavedFilterPublicFilterJson): Structured filter: {conditions: FilterCondition[], op: 'and'|'or'}.
        id (UUID):
        owner_id (UUID):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        tag_id (None | Unset | UUID): Optional tag; if set, filter is shared with users who have TagShare access.
    """

    name: str
    filter_json: SavedFilterPublicFilterJson
    id: UUID
    owner_id: UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime
    tag_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.saved_filter_public_filter_json import SavedFilterPublicFilterJson

        name = self.name

        filter_json = self.filter_json.to_dict()

        id = str(self.id)

        owner_id = str(self.owner_id)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        tag_id: None | str | Unset
        if isinstance(self.tag_id, Unset):
            tag_id = UNSET
        elif isinstance(self.tag_id, UUID):
            tag_id = str(self.tag_id)
        else:
            tag_id = self.tag_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "name": name,
                "filter_json": filter_json,
                "id": id,
                "owner_id": owner_id,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if tag_id is not UNSET:
            field_dict["tag_id"] = tag_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.saved_filter_public_filter_json import SavedFilterPublicFilterJson

        d = dict(src_dict)
        name = d.pop("name")

        filter_json = SavedFilterPublicFilterJson.from_dict(d.pop("filter_json"))

        id = UUID(d.pop("id"))

        owner_id = UUID(d.pop("owner_id"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_tag_id(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                tag_id_type_0 = UUID(data)

                return tag_id_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        tag_id = _parse_tag_id(d.pop("tag_id", UNSET))

        saved_filter_public = cls(
            name=name,
            filter_json=filter_json,
            id=id,
            owner_id=owner_id,
            created_at=created_at,
            updated_at=updated_at,
            tag_id=tag_id,
        )

        saved_filter_public.additional_properties = d
        return saved_filter_public

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
