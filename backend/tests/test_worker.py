"""Regression tests for reminder and cadence scheduling."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app import worker
from app.models import Contact, Reminder, ReminderFrequency


class _Result:
    def __init__(self, rows: list[Any] | None = None) -> None:
        self._rows = rows or []

    def all(self) -> list[Any]:
        return self._rows

    def first(self) -> Any | None:
        return self._rows[0] if self._rows else None

    def one(self) -> Any:
        return self._rows[0]


class _FakeSession:
    def __init__(
        self,
        *,
        primary_rows: list[Any] | None = None,
        contacts_by_id: dict[uuid.UUID, Contact] | None = None,
        refresh_reminder: Any | None = None,
    ) -> None:
        self._primary_rows = primary_rows or []
        self._contacts_by_id = contacts_by_id or {}
        self._call_count = 0
        self.commits = 0
        self._refresh_reminder = refresh_reminder

    def exec(self, _statement: Any) -> _Result:
        self._call_count += 1
        if self._call_count == 1:
            return _Result(self._primary_rows)
        return _Result()

    def get(self, _model: type, identifier: uuid.UUID) -> Contact | None:
        return self._contacts_by_id.get(identifier)

    def add(self, _obj: Any) -> None:
        return None

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, obj: Any) -> None:
        if self._refresh_reminder is not None:
            self._refresh_reminder(obj)

    def reset_queries(self) -> None:
        self._call_count = 0


class _SessionContext:
    def __init__(self, session: _FakeSession) -> None:
        self._session = session

    def __enter__(self) -> _FakeSession:
        return self._session

    def __exit__(self, *_args: object) -> None:
        return None


class _FakeRedis:
    def __init__(self, claim_result: bool = True) -> None:
        self.claim_result = claim_result
        self.claims: set[str] = set()
        self.deleted: list[str] = []

    async def set(self, key: str, _value: str, *, nx: bool, ex: int) -> bool:
        assert nx is True
        assert ex > 0
        if not self.claim_result:
            return False
        self.claims.add(key)
        return True

    async def delete(self, key: str) -> None:
        self.deleted.append(key)
        self.claims.discard(key)


class _Notifier:
    def __init__(self, result: bool = True) -> None:
        self.result = result
        self.items: list[dict[str, str]] = []

    def notify(self, *, title: str, body: str) -> bool:
        self.items.append({"title": title, "body": body})
        return self.result


def _install_fakes(
    monkeypatch,
    session: _FakeSession,
    notifier: _Notifier,
) -> _FakeRedis:
    redis = _FakeRedis()
    monkeypatch.setattr(worker, "Session", lambda _engine: _SessionContext(session))
    monkeypatch.setattr(worker, "_get_apprise", lambda: notifier)
    return redis


def test_failed_once_reminder_is_not_consumed(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    contact = Contact(first_name="Alice", owner_id=uuid.uuid4())
    reminder = Reminder(
        owner_id=contact.owner_id,
        contact_id=contact.id,
        title="Call Alice",
        remind_at=now - timedelta(minutes=5),
        frequency=ReminderFrequency.ONCE,
        is_active=True,
    )
    session = _FakeSession(
        primary_rows=[reminder],
        contacts_by_id={contact.id: contact},
    )
    notifier = _Notifier(result=False)
    redis = _install_fakes(monkeypatch, session, notifier)
    ctx = {"engine": object(), "redis": redis}

    asyncio.run(worker._check_reminders(ctx, now=now))

    assert notifier.items
    assert reminder.is_active is True
    assert reminder.last_sent_at is None
    assert reminder.remind_at == now - timedelta(minutes=5)
    assert reminder.delivery_attempts == 1
    assert reminder.next_delivery_at == now + timedelta(minutes=1)
    assert session.commits >= 1
    assert not redis.claims


def test_failed_reminder_stops_after_bounded_retries(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    contact = Contact(first_name="Alice Brady", owner_id=uuid.uuid4())
    reminder = Reminder(
        owner_id=contact.owner_id,
        contact_id=contact.id,
        title="Call Alice Brady",
        remind_at=now - timedelta(minutes=5),
        frequency=ReminderFrequency.ONCE,
        is_active=True,
        delivery_attempts=4,
    )
    session = _FakeSession(
        primary_rows=[reminder],
        contacts_by_id={contact.id: contact},
    )
    notifier = _Notifier(result=False)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(worker._check_reminders({"engine": object(), "redis": redis}, now=now))

    assert reminder.delivery_attempts == 5
    assert reminder.is_active is False
    assert reminder.next_delivery_at is None


def test_successful_recurring_reminder_advances(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    contact = Contact(first_name="Alice", owner_id=uuid.uuid4())
    reminder = Reminder(
        owner_id=contact.owner_id,
        contact_id=contact.id,
        title="Call Alice",
        remind_at=now - timedelta(minutes=5),
        frequency=ReminderFrequency.WEEKLY,
        is_active=True,
    )
    session = _FakeSession(
        primary_rows=[reminder],
        contacts_by_id={contact.id: contact},
    )
    notifier = _Notifier(result=True)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(worker._check_reminders({"engine": object(), "redis": redis}, now=now))

    assert reminder.is_active is True
    assert reminder.last_sent_at == now
    assert reminder.remind_at == now + timedelta(weeks=1)
    assert reminder.delivery_attempts == 0
    assert reminder.next_delivery_at is None


def test_stale_reminder_row_is_rechecked_after_claim(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    contact = Contact(first_name="Alice", owner_id=uuid.uuid4())
    reminder = Reminder(
        owner_id=contact.owner_id,
        contact_id=contact.id,
        title="Call Alice",
        remind_at=now - timedelta(minutes=5),
        frequency=ReminderFrequency.ONCE,
        is_active=True,
    )

    def mark_already_sent(row: Reminder) -> None:
        row.is_active = False
        row.last_sent_at = now

    session = _FakeSession(
        primary_rows=[reminder],
        contacts_by_id={contact.id: contact},
        refresh_reminder=mark_already_sent,
    )
    notifier = _Notifier(result=True)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(worker._check_reminders({"engine": object(), "redis": redis}, now=now))

    assert notifier.items == []
    assert not redis.claims


def test_deleted_contact_reminder_is_deactivated(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    contact = Contact(
        first_name="Alice",
        owner_id=uuid.uuid4(),
        deleted_at=now,
    )
    reminder = Reminder(
        owner_id=contact.owner_id,
        contact_id=contact.id,
        title="Call Alice",
        remind_at=now - timedelta(minutes=5),
        frequency=ReminderFrequency.ONCE,
        is_active=True,
    )
    session = _FakeSession(
        primary_rows=[reminder],
        contacts_by_id={contact.id: contact},
    )
    notifier = _Notifier(result=True)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(worker._check_reminders({"engine": object(), "redis": redis}, now=now))

    assert notifier.items == []
    assert reminder.is_active is False


def test_duplicate_reminder_claim_blocks_second_send(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc)
    contact = Contact(first_name="Alice", owner_id=uuid.uuid4())
    reminder = Reminder(
        owner_id=contact.owner_id,
        contact_id=contact.id,
        title="Call Alice",
        remind_at=now - timedelta(minutes=5),
        frequency=ReminderFrequency.ONCE,
        is_active=True,
    )
    session = _FakeSession(
        primary_rows=[reminder],
        contacts_by_id={contact.id: contact},
    )
    notifier = _Notifier(result=True)
    _install_fakes(monkeypatch, session, notifier)
    redis = _FakeRedis(claim_result=False)

    asyncio.run(worker._check_reminders({"engine": object(), "redis": redis}, now=now))

    assert notifier.items == []
    assert reminder.is_active is True


def test_empty_cadence_set_does_not_raise(monkeypatch) -> None:
    session = _FakeSession(primary_rows=[])
    notifier = _Notifier(result=True)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(
        worker._check_cadences(
            {"engine": object(), "redis": redis},
            now=datetime(2026, 1, 15, 15, 30, tzinfo=timezone.utc),
        )
    )

    assert notifier.items == []


def test_cadence_notifies_each_overdue_contact(monkeypatch) -> None:
    now = datetime(2026, 1, 15, 15, 30, tzinfo=timezone.utc)
    owner_id = uuid.uuid4()
    overdue_a = Contact(
        first_name="A",
        owner_id=owner_id,
        contact_frequency_days=30,
        last_contacted_at=now - timedelta(days=60),
        timezone="UTC",
    )
    current_b = Contact(
        first_name="B",
        owner_id=owner_id,
        contact_frequency_days=30,
        last_contacted_at=now - timedelta(days=2),
        timezone="UTC",
    )
    overdue_c = Contact(
        first_name="C",
        owner_id=owner_id,
        contact_frequency_days=30,
        last_contacted_at=None,
        timezone="UTC",
    )
    session = _FakeSession(primary_rows=[overdue_a, current_b, overdue_c])
    notifier = _Notifier(result=True)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(worker._check_cadences({"engine": object(), "redis": redis}, now=now))

    assert [item["title"] for item in notifier.items] == [
        "Losing touch: A",
        "Losing touch: C",
    ]


def test_cadence_waits_until_local_nine_am(monkeypatch) -> None:
    contact = Contact(
        first_name="Chicago",
        owner_id=uuid.uuid4(),
        contact_frequency_days=30,
        last_contacted_at=datetime(
            2025,
            11,
            1,
            tzinfo=timezone.utc,
        ),
        timezone="America/Chicago",
    )
    session = _FakeSession(primary_rows=[contact])
    notifier = _Notifier(result=True)
    redis = _install_fakes(monkeypatch, session, notifier)

    asyncio.run(
        worker._check_cadences(
            {"engine": object(), "redis": redis},
            now=datetime(2026, 1, 15, 9, 30, tzinfo=timezone.utc),
        )
    )
    assert notifier.items == []

    session.reset_queries()
    asyncio.run(
        worker._check_cadences(
            {"engine": object(), "redis": redis},
            now=datetime(2026, 1, 15, 15, 30, tzinfo=timezone.utc),
        )
    )
    assert [item["title"] for item in notifier.items] == ["Losing touch: Chicago"]
