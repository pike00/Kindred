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
    from ..models.bulk_filters import BulkFilters
    from ..models.bulk_operations import BulkOperations


T = TypeVar("T", bound="BulkUpdateRequest")


@_attrs_define
class BulkUpdateRequest:
    """
    Attributes:
        operations (BulkOperations):
        contact_ids (list[UUID] | None | Unset):
        select_all_filtered (bool | Unset):  Default: False.
        filters (BulkFilters | None | Unset):
        limit (int | Unset):  Default: 500.
    """

    operations: BulkOperations
    contact_ids: list[UUID] | None | Unset = UNSET
    select_all_filtered: bool | Unset = False
    filters: BulkFilters | None | Unset = UNSET
    limit: int | Unset = 500
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.bulk_filters import BulkFilters
        from ..models.bulk_operations import BulkOperations

        operations = self.operations.to_dict()

        contact_ids: list[str] | None | Unset
        if isinstance(self.contact_ids, Unset):
            contact_ids = UNSET
        elif isinstance(self.contact_ids, list):
            contact_ids = []
            for contact_ids_type_0_item_data in self.contact_ids:
                contact_ids_type_0_item = str(contact_ids_type_0_item_data)
                contact_ids.append(contact_ids_type_0_item)

        else:
            contact_ids = self.contact_ids

        select_all_filtered = self.select_all_filtered

        filters: dict[str, Any] | None | Unset
        if isinstance(self.filters, Unset):
            filters = UNSET
        elif isinstance(self.filters, BulkFilters):
            filters = self.filters.to_dict()
        else:
            filters = self.filters

        limit = self.limit

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "operations": operations,
            }
        )
        if contact_ids is not UNSET:
            field_dict["contact_ids"] = contact_ids
        if select_all_filtered is not UNSET:
            field_dict["select_all_filtered"] = select_all_filtered
        if filters is not UNSET:
            field_dict["filters"] = filters
        if limit is not UNSET:
            field_dict["limit"] = limit

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.bulk_filters import BulkFilters
        from ..models.bulk_operations import BulkOperations

        d = dict(src_dict)
        operations = BulkOperations.from_dict(d.pop("operations"))

        def _parse_contact_ids(data: object) -> list[UUID] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                contact_ids_type_0 = []
                _contact_ids_type_0 = data
                for contact_ids_type_0_item_data in _contact_ids_type_0:
                    contact_ids_type_0_item = UUID(contact_ids_type_0_item_data)

                    contact_ids_type_0.append(contact_ids_type_0_item)

                return contact_ids_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[UUID] | None | Unset, data)

        contact_ids = _parse_contact_ids(d.pop("contact_ids", UNSET))

        select_all_filtered = d.pop("select_all_filtered", UNSET)

        def _parse_filters(data: object) -> BulkFilters | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                filters_type_0 = BulkFilters.from_dict(data)

                return filters_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(BulkFilters | None | Unset, data)

        filters = _parse_filters(d.pop("filters", UNSET))

        limit = d.pop("limit", UNSET)

        bulk_update_request = cls(
            operations=operations,
            contact_ids=contact_ids,
            select_all_filtered=select_all_filtered,
            filters=filters,
            limit=limit,
        )

        bulk_update_request.additional_properties = d
        return bulk_update_request

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
