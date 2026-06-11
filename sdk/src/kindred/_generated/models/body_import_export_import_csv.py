from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field
import json
from .. import types

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
    from ..models.body_import_export_import_csv_column_mapping_type_0 import (
        BodyImportExportImportCsvColumnMappingType0,
    )


T = TypeVar("T", bound="BodyImportExportImportCsv")


@_attrs_define
class BodyImportExportImportCsv:
    """
    Attributes:
        file (str):
        column_mapping (BodyImportExportImportCsvColumnMappingType0 | None | Unset):
    """

    file: str
    column_mapping: BodyImportExportImportCsvColumnMappingType0 | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.body_import_export_import_csv_column_mapping_type_0 import (
            BodyImportExportImportCsvColumnMappingType0,
        )

        file = self.file

        column_mapping: dict[str, Any] | None | Unset
        if isinstance(self.column_mapping, Unset):
            column_mapping = UNSET
        elif isinstance(self.column_mapping, BodyImportExportImportCsvColumnMappingType0):
            column_mapping = self.column_mapping.to_dict()
        else:
            column_mapping = self.column_mapping

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "file": file,
            }
        )
        if column_mapping is not UNSET:
            field_dict["column_mapping"] = column_mapping

        return field_dict

    def to_multipart(self) -> types.RequestFiles:
        from ..models.body_import_export_import_csv_column_mapping_type_0 import (
            BodyImportExportImportCsvColumnMappingType0,
        )

        files: types.RequestFiles = []

        files.append(("file", (None, str(self.file).encode(), "text/plain")))

        if not isinstance(self.column_mapping, Unset):
            if isinstance(self.column_mapping, BodyImportExportImportCsvColumnMappingType0):
                files.append(
                    (
                        "column_mapping",
                        (None, json.dumps(self.column_mapping.to_dict()).encode(), "application/json"),
                    )
                )
            else:
                files.append(("column_mapping", (None, str(self.column_mapping).encode(), "text/plain")))

        for prop_name, prop in self.additional_properties.items():
            files.append((prop_name, (None, str(prop).encode(), "text/plain")))

        return files

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.body_import_export_import_csv_column_mapping_type_0 import (
            BodyImportExportImportCsvColumnMappingType0,
        )

        d = dict(src_dict)
        file = d.pop("file")

        def _parse_column_mapping(data: object) -> BodyImportExportImportCsvColumnMappingType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                column_mapping_type_0 = BodyImportExportImportCsvColumnMappingType0.from_dict(data)

                return column_mapping_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(BodyImportExportImportCsvColumnMappingType0 | None | Unset, data)

        column_mapping = _parse_column_mapping(d.pop("column_mapping", UNSET))

        body_import_export_import_csv = cls(
            file=file,
            column_mapping=column_mapping,
        )

        body_import_export_import_csv.additional_properties = d
        return body_import_export_import_csv

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
