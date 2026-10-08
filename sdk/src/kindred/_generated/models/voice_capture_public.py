from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.voice_capture_public_status import VoiceCapturePublicStatus
from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
from uuid import UUID
import datetime

if TYPE_CHECKING:
    from ..models.contact_update_action import ContactUpdateAction
    from ..models.interaction_action import InteractionAction
    from ..models.life_event_action import LifeEventAction
    from ..models.note_action import NoteAction
    from ..models.reminder_action import ReminderAction
    from ..models.voice_capture_public_results_type_0 import VoiceCapturePublicResultsType0


T = TypeVar("T", bound="VoiceCapturePublic")


@_attrs_define
class VoiceCapturePublic:
    """
    Attributes:
        id (UUID):
        raw_text (str):
        corrected_text (str):
        timezone (str):
        recorded_at (datetime.datetime):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        status (VoiceCapturePublicStatus):
        revision (int):
        actions (list[ContactUpdateAction | InteractionAction | LifeEventAction | NoteAction | ReminderAction]):
        warnings (list[str]):
        analysis_error (None | str | Unset):
        committed_at (datetime.datetime | None | Unset):
        results (None | Unset | VoiceCapturePublicResultsType0):
    """

    id: UUID
    raw_text: str
    corrected_text: str
    timezone: str
    recorded_at: datetime.datetime
    created_at: datetime.datetime
    updated_at: datetime.datetime
    status: VoiceCapturePublicStatus
    revision: int
    actions: list[ContactUpdateAction | InteractionAction | LifeEventAction | NoteAction | ReminderAction]
    warnings: list[str]
    analysis_error: None | str | Unset = UNSET
    committed_at: datetime.datetime | None | Unset = UNSET
    results: None | Unset | VoiceCapturePublicResultsType0 = UNSET

    def to_dict(self) -> dict[str, Any]:
        from ..models.contact_update_action import ContactUpdateAction
        from ..models.interaction_action import InteractionAction
        from ..models.life_event_action import LifeEventAction
        from ..models.note_action import NoteAction
        from ..models.reminder_action import ReminderAction
        from ..models.voice_capture_public_results_type_0 import VoiceCapturePublicResultsType0

        id = str(self.id)

        raw_text = self.raw_text

        corrected_text = self.corrected_text

        timezone = self.timezone

        recorded_at = self.recorded_at.isoformat()

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        status = self.status.value

        revision = self.revision

        actions = []
        for actions_item_data in self.actions:
            actions_item: dict[str, Any]
            if isinstance(actions_item_data, InteractionAction):
                actions_item = actions_item_data.to_dict()
            elif isinstance(actions_item_data, NoteAction):
                actions_item = actions_item_data.to_dict()
            elif isinstance(actions_item_data, ContactUpdateAction):
                actions_item = actions_item_data.to_dict()
            elif isinstance(actions_item_data, LifeEventAction):
                actions_item = actions_item_data.to_dict()
            else:
                actions_item = actions_item_data.to_dict()

            actions.append(actions_item)

        warnings = self.warnings

        analysis_error: None | str | Unset
        if isinstance(self.analysis_error, Unset):
            analysis_error = UNSET
        else:
            analysis_error = self.analysis_error

        committed_at: None | str | Unset
        if isinstance(self.committed_at, Unset):
            committed_at = UNSET
        elif isinstance(self.committed_at, datetime.datetime):
            committed_at = self.committed_at.isoformat()
        else:
            committed_at = self.committed_at

        results: dict[str, Any] | None | Unset
        if isinstance(self.results, Unset):
            results = UNSET
        elif isinstance(self.results, VoiceCapturePublicResultsType0):
            results = self.results.to_dict()
        else:
            results = self.results

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "id": id,
                "raw_text": raw_text,
                "corrected_text": corrected_text,
                "timezone": timezone,
                "recorded_at": recorded_at,
                "created_at": created_at,
                "updated_at": updated_at,
                "status": status,
                "revision": revision,
                "actions": actions,
                "warnings": warnings,
            }
        )
        if analysis_error is not UNSET:
            field_dict["analysis_error"] = analysis_error
        if committed_at is not UNSET:
            field_dict["committed_at"] = committed_at
        if results is not UNSET:
            field_dict["results"] = results

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.contact_update_action import ContactUpdateAction
        from ..models.interaction_action import InteractionAction
        from ..models.life_event_action import LifeEventAction
        from ..models.note_action import NoteAction
        from ..models.reminder_action import ReminderAction
        from ..models.voice_capture_public_results_type_0 import VoiceCapturePublicResultsType0

        d = dict(src_dict)
        id = UUID(d.pop("id"))

        raw_text = d.pop("raw_text")

        corrected_text = d.pop("corrected_text")

        timezone = d.pop("timezone")

        recorded_at = isoparse(d.pop("recorded_at"))

        created_at = isoparse(d.pop("created_at"))

        updated_at = isoparse(d.pop("updated_at"))

        status = VoiceCapturePublicStatus(d.pop("status"))

        revision = d.pop("revision")

        actions = []
        _actions = d.pop("actions")
        for actions_item_data in _actions:

            def _parse_actions_item(
                data: object,
            ) -> ContactUpdateAction | InteractionAction | LifeEventAction | NoteAction | ReminderAction:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_0 = InteractionAction.from_dict(data)

                    return actions_item_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_1 = NoteAction.from_dict(data)

                    return actions_item_type_1
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_2 = ContactUpdateAction.from_dict(data)

                    return actions_item_type_2
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    actions_item_type_3 = LifeEventAction.from_dict(data)

                    return actions_item_type_3
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                actions_item_type_4 = ReminderAction.from_dict(data)

                return actions_item_type_4

            actions_item = _parse_actions_item(actions_item_data)

            actions.append(actions_item)

        warnings = cast(list[str], d.pop("warnings"))

        def _parse_analysis_error(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        analysis_error = _parse_analysis_error(d.pop("analysis_error", UNSET))

        def _parse_committed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                committed_at_type_0 = isoparse(data)

                return committed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        committed_at = _parse_committed_at(d.pop("committed_at", UNSET))

        def _parse_results(data: object) -> None | Unset | VoiceCapturePublicResultsType0:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                results_type_0 = VoiceCapturePublicResultsType0.from_dict(data)

                return results_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | VoiceCapturePublicResultsType0, data)

        results = _parse_results(d.pop("results", UNSET))

        voice_capture_public = cls(
            id=id,
            raw_text=raw_text,
            corrected_text=corrected_text,
            timezone=timezone,
            recorded_at=recorded_at,
            created_at=created_at,
            updated_at=updated_at,
            status=status,
            revision=revision,
            actions=actions,
            warnings=warnings,
            analysis_error=analysis_error,
            committed_at=committed_at,
            results=results,
        )

        return voice_capture_public
