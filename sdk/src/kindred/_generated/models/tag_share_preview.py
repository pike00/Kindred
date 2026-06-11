from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from typing import cast
from uuid import UUID

if TYPE_CHECKING:
    from ..models.share_preview_entity import SharePreviewEntity


T = TypeVar("T", bound="TagSharePreview")


@_attrs_define
class TagSharePreview:
    """Preview of what will be shared when granting access to a tag.

    Attributes:
        tag_id (UUID):
        tag_name (str):
        contact_count (int):
        sample_contacts (list[str]):
        entities (list[SharePreviewEntity]):
        total_related_rows (int):
    """

    tag_id: UUID
    tag_name: str
    contact_count: int
    sample_contacts: list[str]
    entities: list[SharePreviewEntity]
    total_related_rows: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.share_preview_entity import SharePreviewEntity

        tag_id = str(self.tag_id)

        tag_name = self.tag_name

        contact_count = self.contact_count

        sample_contacts = self.sample_contacts

        entities = []
        for entities_item_data in self.entities:
            entities_item = entities_item_data.to_dict()
            entities.append(entities_item)

        total_related_rows = self.total_related_rows

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "tag_id": tag_id,
                "tag_name": tag_name,
                "contact_count": contact_count,
                "sample_contacts": sample_contacts,
                "entities": entities,
                "total_related_rows": total_related_rows,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.share_preview_entity import SharePreviewEntity

        d = dict(src_dict)
        tag_id = UUID(d.pop("tag_id"))

        tag_name = d.pop("tag_name")

        contact_count = d.pop("contact_count")

        sample_contacts = cast(list[str], d.pop("sample_contacts"))

        entities = []
        _entities = d.pop("entities")
        for entities_item_data in _entities:
            entities_item = SharePreviewEntity.from_dict(entities_item_data)

            entities.append(entities_item)

        total_related_rows = d.pop("total_related_rows")

        tag_share_preview = cls(
            tag_id=tag_id,
            tag_name=tag_name,
            contact_count=contact_count,
            sample_contacts=sample_contacts,
            entities=entities,
            total_related_rows=total_related_rows,
        )

        tag_share_preview.additional_properties = d
        return tag_share_preview

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
