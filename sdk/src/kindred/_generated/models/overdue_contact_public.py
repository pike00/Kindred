from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.contact_source import ContactSource
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
    from ..models.overdue_contact_public_imessage_profile_type_0 import (
        OverdueContactPublicImessageProfileType0,
    )
    from ..models.tag_public import TagPublic


T = TypeVar("T", bound="OverdueContactPublic")


@_attrs_define
class OverdueContactPublic:
    """
    Attributes:
        first_name (str): Given name; required.
        id (UUID):
        avatar_url (None | str):
        last_contacted_at (datetime.datetime | None):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        last_name (None | str | Unset): Family name.
        middle_name (None | str | Unset): Middle name or initial.
        prefix (None | str | Unset): Honorific like Dr., Mr., Ms.
        suffix (None | str | Unset): Suffix like Jr., PhD.
        nickname (None | str | Unset): Preferred or informal name.
        company (None | str | Unset): Organization name.
        department (None | str | Unset): Department within the company.
        title (None | str | Unset): Job title.
        birthday (datetime.date | None | Unset): Date of birth; used for milestone and birthday reminders.
        how_we_met (None | str | Unset): Short story of how the introduction happened.
        is_favorite (bool | Unset): Pinned to the top of contact lists. Default: False.
        is_archived (bool | Unset): Soft-deleted; excluded from default lists. Default: False.
        is_deceased (bool | Unset): Marks the contact as deceased. Default: False.
        deceased_at (datetime.date | None | Unset): Date the contact passed away.
        contact_frequency_days (int | None | Unset):
        do_not_contact (bool | Unset):  Default: False.
        do_not_contact_reason (None | str | Unset):
        stage (None | str | Unset): Kanban stage like Active, Dormant, Lost.
        source (ContactSource | Unset):
        source_external_id (None | str | Unset): Opaque external ID for idempotent upserts from integrations.
        deleted_at (datetime.datetime | None | Unset):
        tags (list[TagPublic] | Unset):
        imessage_id (None | str | Unset):
        imessage_synced_at (datetime.datetime | None | Unset):
        imessage_profile (None | OverdueContactPublicImessageProfileType0 | Unset):
        days_overdue (int | None | Unset):
    """

    first_name: str
    id: UUID
    avatar_url: None | str
    last_contacted_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    last_name: None | str | Unset = UNSET
    middle_name: None | str | Unset = UNSET
    prefix: None | str | Unset = UNSET
    suffix: None | str | Unset = UNSET
    nickname: None | str | Unset = UNSET
    company: None | str | Unset = UNSET
    department: None | str | Unset = UNSET
    title: None | str | Unset = UNSET
    birthday: datetime.date | None | Unset = UNSET
    how_we_met: None | str | Unset = UNSET
    is_favorite: bool | Unset = False
    is_archived: bool | Unset = False
    is_deceased: bool | Unset = False
    deceased_at: datetime.date | None | Unset = UNSET
    contact_frequency_days: int | None | Unset = UNSET
    do_not_contact: bool | Unset = False
    do_not_contact_reason: None | str | Unset = UNSET
    stage: None | str | Unset = UNSET
    source: ContactSource | Unset = UNSET
    source_external_id: None | str | Unset = UNSET
    deleted_at: datetime.datetime | None | Unset = UNSET
    tags: list[TagPublic] | Unset = UNSET
    imessage_id: None | str | Unset = UNSET
    imessage_synced_at: datetime.datetime | None | Unset = UNSET
    imessage_profile: None | OverdueContactPublicImessageProfileType0 | Unset = UNSET
    days_overdue: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.overdue_contact_public_imessage_profile_type_0 import (
            OverdueContactPublicImessageProfileType0,
        )
        from ..models.tag_public import TagPublic

        first_name = self.first_name

        id = str(self.id)

        avatar_url: None | str
        avatar_url = self.avatar_url

        last_contacted_at: None | str
        if isinstance(self.last_contacted_at, datetime.datetime):
            last_contacted_at = self.last_contacted_at.isoformat()
        else:
            last_contacted_at = self.last_contacted_at

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        last_name: None | str | Unset
        if isinstance(self.last_name, Unset):
            last_name = UNSET
        else:
            last_name = self.last_name

        middle_name: None | str | Unset
        if isinstance(self.middle_name, Unset):
            middle_name = UNSET
        else:
            middle_name = self.middle_name

        prefix: None | str | Unset
        if isinstance(self.prefix, Unset):
            prefix = UNSET
        else:
            prefix = self.prefix

        suffix: None | str | Unset
        if isinstance(self.suffix, Unset):
            suffix = UNSET
        else:
            suffix = self.suffix

        nickname: None | str | Unset
        if isinstance(self.nickname, Unset):
            nickname = UNSET
        else:
            nickname = self.nickname

        company: None | str | Unset
        if isinstance(self.company, Unset):
            company = UNSET
        else:
            company = self.company

        department: None | str | Unset
        if isinstance(self.department, Unset):
            department = UNSET
        else:
            department = self.department

        title: None | str | Unset
        if isinstance(self.title, Unset):
            title = UNSET
        else:
            title = self.title

        birthday: None | str | Unset
        if isinstance(self.birthday, Unset):
            birthday = UNSET
        elif isinstance(self.birthday, datetime.date):
            birthday = self.birthday.isoformat()
        else:
            birthday = self.birthday

        how_we_met: None | str | Unset
        if isinstance(self.how_we_met, Unset):
            how_we_met = UNSET
        else:
            how_we_met = self.how_we_met

        is_favorite = self.is_favorite

        is_archived = self.is_archived

        is_deceased = self.is_deceased

        deceased_at: None | str | Unset
        if isinstance(self.deceased_at, Unset):
            deceased_at = UNSET
        elif isinstance(self.deceased_at, datetime.date):
            deceased_at = self.deceased_at.isoformat()
        else:
            deceased_at = self.deceased_at

        contact_frequency_days: int | None | Unset
        if isinstance(self.contact_frequency_days, Unset):
            contact_frequency_days = UNSET
        else:
            contact_frequency_days = self.contact_frequency_days

        do_not_contact = self.do_not_contact

        do_not_contact_reason: None | str | Unset
        if isinstance(self.do_not_contact_reason, Unset):
            do_not_contact_reason = UNSET
        else:
            do_not_contact_reason = self.do_not_contact_reason

        stage: None | str | Unset
        if isinstance(self.stage, Unset):
            stage = UNSET
        else:
            stage = self.stage

        source: str | Unset = UNSET
        if not isinstance(self.source, Unset):
            source = self.source.value

        source_external_id: None | str | Unset
        if isinstance(self.source_external_id, Unset):
            source_external_id = UNSET
        else:
            source_external_id = self.source_external_id

        deleted_at: None | str | Unset
        if isinstance(self.deleted_at, Unset):
            deleted_at = UNSET
        elif isinstance(self.deleted_at, datetime.datetime):
            deleted_at = self.deleted_at.isoformat()
        else:
            deleted_at = self.deleted_at

        tags: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.tags, Unset):
            tags = []
            for tags_item_data in self.tags:
                tags_item = tags_item_data.to_dict()
                tags.append(tags_item)

        imessage_id: None | str | Unset
        if isinstance(self.imessage_id, Unset):
            imessage_id = UNSET
        else:
            imessage_id = self.imessage_id

        imessage_synced_at: None | str | Unset
        if isinstance(self.imessage_synced_at, Unset):
            imessage_synced_at = UNSET
        elif isinstance(self.imessage_synced_at, datetime.datetime):
            imessage_synced_at = self.imessage_synced_at.isoformat()
        else:
            imessage_synced_at = self.imessage_synced_at

        imessage_profile: dict[str, Any] | None | Unset
        if isinstance(self.imessage_profile, Unset):
            imessage_profile = UNSET
        elif isinstance(self.imessage_profile, OverdueContactPublicImessageProfileType0):
            imessage_profile = self.imessage_profile.to_dict()
        else:
            imessage_profile = self.imessage_profile

        days_overdue: int | None | Unset
        if isinstance(self.days_overdue, Unset):
            days_overdue = UNSET
        else:
            days_overdue = self.days_overdue

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "first_name": first_name,
                "id": id,
                "avatar_url": avatar_url,
                "last_contacted_at": last_contacted_at,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if last_name is not UNSET:
            field_dict["last_name"] = last_name
        if middle_name is not UNSET:
            field_dict["middle_name"] = middle_name
        if prefix is not UNSET:
            field_dict["prefix"] = prefix
        if suffix is not UNSET:
            field_dict["suffix"] = suffix
        if nickname is not UNSET:
            field_dict["nickname"] = nickname
        if company is not UNSET:
            field_dict["company"] = company
        if department is not UNSET:
            field_dict["department"] = department
        if title is not UNSET:
            field_dict["title"] = title
        if birthday is not UNSET:
            field_dict["birthday"] = birthday
        if how_we_met is not UNSET:
            field_dict["how_we_met"] = how_we_met
        if is_favorite is not UNSET:
            field_dict["is_favorite"] = is_favorite
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived
        if is_deceased is not UNSET:
            field_dict["is_deceased"] = is_deceased
        if deceased_at is not UNSET:
            field_dict["deceased_at"] = deceased_at
        if contact_frequency_days is not UNSET:
            field_dict["contact_frequency_days"] = contact_frequency_days
        if do_not_contact is not UNSET:
            field_dict["do_not_contact"] = do_not_contact
        if do_not_contact_reason is not UNSET:
            field_dict["do_not_contact_reason"] = do_not_contact_reason
        if stage is not UNSET:
            field_dict["stage"] = stage
        if source is not UNSET:
            field_dict["source"] = source
        if source_external_id is not UNSET:
            field_dict["source_external_id"] = source_external_id
        if deleted_at is not UNSET:
            field_dict["deleted_at"] = deleted_at
        if tags is not UNSET:
            field_dict["tags"] = tags
        if imessage_id is not UNSET:
            field_dict["imessage_id"] = imessage_id
        if imessage_synced_at is not UNSET:
            field_dict["imessage_synced_at"] = imessage_synced_at
        if imessage_profile is not UNSET:
            field_dict["imessage_profile"] = imessage_profile
        if days_overdue is not UNSET:
            field_dict["days_overdue"] = days_overdue

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.overdue_contact_public_imessage_profile_type_0 import (
            OverdueContactPublicImessageProfileType0,
        )
        from ..models.tag_public import TagPublic

        d = dict(src_dict)
        first_name = d.pop("first_name")

        id = UUID(d.pop("id"))

        def _parse_avatar_url(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        avatar_url = _parse_avatar_url(d.pop("avatar_url"))

        def _parse_last_contacted_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_contacted_at_type_0 = isoparse(data)

                return last_contacted_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_contacted_at = _parse_last_contacted_at(d.pop("last_contacted_at"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        def _parse_last_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        last_name = _parse_last_name(d.pop("last_name", UNSET))

        def _parse_middle_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        middle_name = _parse_middle_name(d.pop("middle_name", UNSET))

        def _parse_prefix(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        prefix = _parse_prefix(d.pop("prefix", UNSET))

        def _parse_suffix(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        suffix = _parse_suffix(d.pop("suffix", UNSET))

        def _parse_nickname(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        nickname = _parse_nickname(d.pop("nickname", UNSET))

        def _parse_company(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        company = _parse_company(d.pop("company", UNSET))

        def _parse_department(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        department = _parse_department(d.pop("department", UNSET))

        def _parse_title(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        title = _parse_title(d.pop("title", UNSET))

        def _parse_birthday(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                birthday_type_0 = isoparse(data).date()

                return birthday_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        birthday = _parse_birthday(d.pop("birthday", UNSET))

        def _parse_how_we_met(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        how_we_met = _parse_how_we_met(d.pop("how_we_met", UNSET))

        is_favorite = d.pop("is_favorite", UNSET)

        is_archived = d.pop("is_archived", UNSET)

        is_deceased = d.pop("is_deceased", UNSET)

        def _parse_deceased_at(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                deceased_at_type_0 = isoparse(data).date()

                return deceased_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        deceased_at = _parse_deceased_at(d.pop("deceased_at", UNSET))

        def _parse_contact_frequency_days(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        contact_frequency_days = _parse_contact_frequency_days(d.pop("contact_frequency_days", UNSET))

        do_not_contact = d.pop("do_not_contact", UNSET)

        def _parse_do_not_contact_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        do_not_contact_reason = _parse_do_not_contact_reason(d.pop("do_not_contact_reason", UNSET))

        def _parse_stage(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        stage = _parse_stage(d.pop("stage", UNSET))

        _source = d.pop("source", UNSET)
        source: ContactSource | Unset
        if isinstance(_source, Unset):
            source = UNSET
        else:
            source = ContactSource(_source)

        def _parse_source_external_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_external_id = _parse_source_external_id(d.pop("source_external_id", UNSET))

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

        _tags = d.pop("tags", UNSET)
        tags: list[TagPublic] | Unset = UNSET
        if _tags is not UNSET:
            tags = []
            for tags_item_data in _tags:
                tags_item = TagPublic.from_dict(tags_item_data)

                tags.append(tags_item)

        def _parse_imessage_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        imessage_id = _parse_imessage_id(d.pop("imessage_id", UNSET))

        def _parse_imessage_synced_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                imessage_synced_at_type_0 = isoparse(data)

                return imessage_synced_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        imessage_synced_at = _parse_imessage_synced_at(d.pop("imessage_synced_at", UNSET))

        def _parse_imessage_profile(data: object) -> None | OverdueContactPublicImessageProfileType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                imessage_profile_type_0 = OverdueContactPublicImessageProfileType0.from_dict(data)

                return imessage_profile_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | OverdueContactPublicImessageProfileType0 | Unset, data)

        imessage_profile = _parse_imessage_profile(d.pop("imessage_profile", UNSET))

        def _parse_days_overdue(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        days_overdue = _parse_days_overdue(d.pop("days_overdue", UNSET))

        overdue_contact_public = cls(
            first_name=first_name,
            id=id,
            avatar_url=avatar_url,
            last_contacted_at=last_contacted_at,
            created_at=created_at,
            updated_at=updated_at,
            last_name=last_name,
            middle_name=middle_name,
            prefix=prefix,
            suffix=suffix,
            nickname=nickname,
            company=company,
            department=department,
            title=title,
            birthday=birthday,
            how_we_met=how_we_met,
            is_favorite=is_favorite,
            is_archived=is_archived,
            is_deceased=is_deceased,
            deceased_at=deceased_at,
            contact_frequency_days=contact_frequency_days,
            do_not_contact=do_not_contact,
            do_not_contact_reason=do_not_contact_reason,
            stage=stage,
            source=source,
            source_external_id=source_external_id,
            deleted_at=deleted_at,
            tags=tags,
            imessage_id=imessage_id,
            imessage_synced_at=imessage_synced_at,
            imessage_profile=imessage_profile,
            days_overdue=days_overdue,
        )

        overdue_contact_public.additional_properties = d
        return overdue_contact_public

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
