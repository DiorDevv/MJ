import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.enums import (
    CreatedVia,
    NotificationChannel,
    NotificationStatus,
    Priority,
    RepeatType,
    TaskStatus,
)
from app.models.notification_log import NotificationLog
from app.models.push_subscription import PushSubscription
from app.models.task import Task
from app.models.user import User
from app.services import notification_service


async def _make_user_with_channels(
    db_session: AsyncSession, *, telegram: bool = True, push: bool = True
) -> User:
    user = User(
        username="notif_user",
        hashed_password=hash_password("supersecret123"),
        telegram_chat_id=123456789 if telegram else None,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    if push:
        db_session.add(
            PushSubscription(
                user_id=user.id,
                endpoint="https://fcm.example.com/fake",
                p256dh_key="fakekey",
                auth_key="fakeauth",
            )
        )
        await db_session.commit()

    # send_task_reminder accesses user.push_subscriptions synchronously (no await);
    # on an async session that requires it to already be eagerly loaded, otherwise
    # the implicit lazy load crashes with MissingGreenlet outside the DB context.
    result = await db_session.execute(
        select(User)
        .options(selectinload(User.push_subscriptions))
        .where(User.id == user.id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def _make_due_task(db_session: AsyncSession, user: User, title: str = "Test task") -> Task:
    now = datetime.now() - timedelta(minutes=1)
    task = Task(
        user_id=user.id,
        title=title,
        due_date=now.date(),
        due_time=now.time().replace(microsecond=0),
        repeat_type=RepeatType.NONE,
        priority=Priority.MEDIUM,
        status=TaskStatus.PENDING,
        created_via=CreatedVia.WEB,
    )
    task.user = user
    db_session.add(task)
    await db_session.commit()
    return task


async def _count_logs(
    db_session: AsyncSession,
    task_id: uuid.UUID,
    channel: NotificationChannel,
    status: NotificationStatus,
) -> int:
    result = await db_session.execute(
        select(NotificationLog).where(
            NotificationLog.task_id == task_id,
            NotificationLog.channel == channel,
            NotificationLog.status == status,
        )
    )
    return len(result.scalars().all())


async def test_reminder_sent_once_per_channel(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _make_user_with_channels(db_session)
    task = await _make_due_task(db_session, user)

    telegram_calls = 0
    push_calls = 0

    async def fake_telegram(chat_id: int, task_arg: Task) -> None:
        nonlocal telegram_calls
        telegram_calls += 1

    def fake_push(subscription: PushSubscription, task_arg: Task) -> None:
        nonlocal push_calls
        push_calls += 1

    monkeypatch.setattr(notification_service, "_send_telegram", fake_telegram)
    monkeypatch.setattr(notification_service, "_send_web_push_sync", fake_push)

    await notification_service.send_task_reminder(db_session, task)
    assert telegram_calls == 1
    assert push_calls == 1
    assert (
        await _count_logs(
            db_session, task.id, NotificationChannel.TELEGRAM, NotificationStatus.SENT
        )
        == 1
    )
    assert (
        await _count_logs(
            db_session, task.id, NotificationChannel.WEB_PUSH, NotificationStatus.SENT
        )
        == 1
    )

    # second call same day must not resend (dedupe via notifications_log)
    await notification_service.send_task_reminder(db_session, task)
    assert telegram_calls == 1, "telegram must not be resent the same day"
    assert push_calls == 1, "web push must not be resent the same day"


async def test_channel_failure_is_isolated(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _make_user_with_channels(db_session)
    task = await _make_due_task(db_session, user)

    async def failing_telegram(chat_id: int, task_arg: Task) -> None:
        raise RuntimeError("simulated telegram outage")

    push_calls = 0

    def fake_push(subscription: PushSubscription, task_arg: Task) -> None:
        nonlocal push_calls
        push_calls += 1

    monkeypatch.setattr(notification_service, "_send_telegram", failing_telegram)
    monkeypatch.setattr(notification_service, "_send_web_push_sync", fake_push)

    # must not raise — a failing channel must not abort the whole reminder attempt
    await notification_service.send_task_reminder(db_session, task)

    assert push_calls == 1, "web push must still be attempted despite telegram failing"
    assert (
        await _count_logs(
            db_session, task.id, NotificationChannel.TELEGRAM, NotificationStatus.FAILED
        )
        == 1
    )
    assert (
        await _count_logs(
            db_session, task.id, NotificationChannel.WEB_PUSH, NotificationStatus.SENT
        )
        == 1
    )


async def test_stale_push_subscription_is_deleted(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _make_user_with_channels(db_session, telegram=False, push=True)
    task = await _make_due_task(db_session, user)

    result = await db_session.execute(
        select(PushSubscription).where(PushSubscription.user_id == user.id)
    )
    subscription = result.scalar_one()
    subscription_id = subscription.id

    def raise_stale(subscription_arg: PushSubscription, task_arg: Task) -> None:
        raise notification_service._StaleSubscriptionError

    monkeypatch.setattr(notification_service, "_send_web_push_sync", raise_stale)

    await notification_service.send_task_reminder(db_session, task)

    result = await db_session.execute(
        select(PushSubscription).where(PushSubscription.id == subscription_id)
    )
    assert result.scalar_one_or_none() is None, "expired (404/410) subscription should be removed"
    assert (
        await _count_logs(
            db_session, task.id, NotificationChannel.WEB_PUSH, NotificationStatus.FAILED
        )
        == 1
    )


async def test_no_channels_configured_sends_nothing(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    user = await _make_user_with_channels(db_session, telegram=False, push=False)
    task = await _make_due_task(db_session, user)

    # if these are ever called, the test should fail loudly
    async def unexpected_telegram(*args: object, **kwargs: object) -> None:
        raise AssertionError("telegram should not be attempted with no chat id")

    def unexpected_push(*args: object, **kwargs: object) -> None:
        raise AssertionError("push should not be attempted with no subscriptions")

    monkeypatch.setattr(notification_service, "_send_telegram", unexpected_telegram)
    monkeypatch.setattr(notification_service, "_send_web_push_sync", unexpected_push)

    await notification_service.send_task_reminder(db_session, task)

    result = await db_session.execute(
        select(NotificationLog).where(NotificationLog.task_id == task.id)
    )
    assert result.scalars().all() == []
