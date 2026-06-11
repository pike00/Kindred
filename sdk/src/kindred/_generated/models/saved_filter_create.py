from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast
from uuid import UUID

if TYPE_CHECKING:
    from ..models.saved_filter_create_filter_json import SavedFilterCreateFilterJson


T = TypeVar("T", bound="SavedFilterCreate")


@_attrs_define
class SavedFilterCreate:
    """
    Attributes:
        name (str): User-visible name for the smart list.
        filter_json (SavedFilterCreateFilterJson): Structured filter: {conditions: FilterCondition[], op: 'and'|'or'}.
        tag_id (None | Unset | UUID): Optional tag; if set, filter is shared with users who have TagShare access.
    """

    name: str
    filter_json: SavedFilterCreateFilterJson
    tag_id: None | Unset | UUID = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.saved_filter_create_filter_json import SavedFilterCreateFilterJson

        name = self.name

        filter_json = self.filter_json.to_dict()

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
            }
        )
        if tag_id is not UNSET:
            field_dict["tag_id"] = tag_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.saved_filter_create_filter_json import SavedFilterCreateFilterJson

        d = dict(src_dict)
        name = d.pop("name")

        filter_json = SavedFilterCreateFilterJson.from_dict(d.pop("filter_json"))

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

        saved_filter_create = cls(
            name=name,
            filter_json=filter_json,
            tag_id=tag_id,
        )

        saved_filter_create.additional_properties = d
        return saved_filter_create

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
