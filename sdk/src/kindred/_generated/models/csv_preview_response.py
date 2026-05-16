from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.csv_preview_response_detected_mapping import CSVPreviewResponseDetectedMapping
    from ..models.csv_preview_response_sample_rows_item import CSVPreviewResponseSampleRowsItem


T = TypeVar("T", bound="CSVPreviewResponse")


@_attrs_define
class CSVPreviewResponse:
    """Preview of CSV import: column mapping and sample rows.

    Attributes:
        headers (list[str]):
        detected_mapping (CSVPreviewResponseDetectedMapping):
        sample_rows (list[CSVPreviewResponseSampleRowsItem]):
        total_rows (int):
        encoding (str):
    """

    headers: list[str]
    detected_mapping: CSVPreviewResponseDetectedMapping
    sample_rows: list[CSVPreviewResponseSampleRowsItem]
    total_rows: int
    encoding: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        headers = self.headers

        detected_mapping = self.detected_mapping.to_dict()

        sample_rows = []
        for sample_rows_item_data in self.sample_rows:
            sample_rows_item = sample_rows_item_data.to_dict()
            sample_rows.append(sample_rows_item)

        total_rows = self.total_rows

        encoding = self.encoding

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "headers": headers,
                "detected_mapping": detected_mapping,
                "sample_rows": sample_rows,
                "total_rows": total_rows,
                "encoding": encoding,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.csv_preview_response_detected_mapping import CSVPreviewResponseDetectedMapping
        from ..models.csv_preview_response_sample_rows_item import CSVPreviewResponseSampleRowsItem

        d = dict(src_dict)
        headers = cast(list[str], d.pop("headers"))

        detected_mapping = CSVPreviewResponseDetectedMapping.from_dict(d.pop("detected_mapping"))

        sample_rows = []
        _sample_rows = d.pop("sample_rows")
        for sample_rows_item_data in _sample_rows:
            sample_rows_item = CSVPreviewResponseSampleRowsItem.from_dict(sample_rows_item_data)

            sample_rows.append(sample_rows_item)

        total_rows = d.pop("total_rows")

        encoding = d.pop("encoding")

        csv_preview_response = cls(
            headers=headers,
            detected_mapping=detected_mapping,
            sample_rows=sample_rows,
            total_rows=total_rows,
            encoding=encoding,
        )

        csv_preview_response.additional_properties = d
        return csv_preview_response

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
