from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import scheduler
from app.core.security import hash_password
from app.models.enums import CreatedVia, Priority, RepeatType, TaskStatus
from app.models.task import Task
from app.models.user import User
from app.services.task_service import next_due_date


async def _make_user(db_session: AsyncSession, username: str = "sched_user") -> User:
    # No telegram_chat_id / push subscriptions: send_task_reminder has nothing to
    # send to, so these tests exercise the scheduler's own logic in isolation
    # without needing to mock the notification channels.
    user = User(username=username, hashed_password=hash_password("supersecret123"))
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_due_task(
    db_session: AsyncSession,
    user: User,
    *,
    title: str = "Due task",
    repeat_type: RepeatType = RepeatType.NONE,
    minutes_overdue: int = 1,
) -> Task:
    due_at = datetime.now() - timedelta(minutes=minutes_overdue)
    task = Task(
        user_id=user.id,
        title=title,
        due_date=due_at.date(),
        due_time=due_at.time().replace(microsecond=0),
        repeat_type=repeat_type,
        priority=Priority.MEDIUM,
        status=TaskStatus.PENDING,
        created_via=CreatedVia.WEB,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


async def _tasks_with_title(db_session: AsyncSession, title: str) -> list[Task]:
    result = await db_session.execute(
        select(Task).where(Task.title == title).execution_options(populate_existing=True)
    )
    return list(result.scalars().all())


# --- retention ---


async def _completed_task(
    db_session: AsyncSession, user: User, *, title: str, completed_days_ago: float
) -> Task:
    task = Task(
        user_id=user.id,
        title=title,
        due_date=date.today(),
        due_time=time(9, 0),
        repeat_type=RepeatType.NONE,
        priority=Priority.MEDIUM,
        status=TaskStatus.COMPLETED,
        completed_at=datetime.now(UTC) - timedelta(days=completed_days_ago),
        created_via=CreatedVia.WEB,
    )
    db_session.add(task)
    await db_session.commit()
    return task


async def test_retention_deletes_only_old_completed(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "retention_user")
    old = await _completed_task(db_session, user, title="eski", completed_days_ago=40)
    recent = await _completed_task(db_session, user, title="yaqin", completed_days_ago=5)
    pending = await _make_due_task(db_session, user, title="ochiq", minutes_overdue=0)

    deleted = await scheduler.purge_old_completed_tasks(db_session, retention_days=30)
    assert deleted == 1

    remaining = {r.id for r in (await db_session.execute(select(Task))).scalars().all()}
    assert old.id not in remaining
    assert recent.id in remaining
    assert pending.id in remaining


async def test_retention_disabled_when_zero(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "retention_off")
    await _completed_task(db_session, user, title="juda eski", completed_days_ago=999)
    assert await scheduler.purge_old_completed_tasks(db_session, retention_days=0) == 0


# --- recurrence ---


async def test_recurring_task_spawns_next_occurrence(db_session: AsyncSession) -> None:
    user = await _make_user(db_session)
    original = await _make_due_task(
        db_session, user, title="Kundalik vazifa", repeat_type=RepeatType.DAILY
    )

    await scheduler.run_reminder_check(db_session)

    rows = await _tasks_with_title(db_session, "Kundalik vazifa")
    assert len(rows) == 2

    completed = next(r for r in rows if r.id == original.id)
    assert completed.status == TaskStatus.COMPLETED

    spawned = next(r for r in rows if r.id != original.id)
    assert spawned.status == TaskStatus.PENDING
    assert spawned.due_date == original.due_date + timedelta(days=1)
    assert spawned.due_time == original.due_time
    assert spawned.priority == original.priority


async def test_recurring_task_does_not_duplicate_on_second_tick(db_session: AsyncSession) -> None:
    user = await _make_user(db_session)
    await _make_due_task(db_session, user, title="Haftalik vazifa", repeat_type=RepeatType.WEEKLY)

    await scheduler.run_reminder_check(db_session)
    await scheduler.run_reminder_check(db_session)

    rows = await _tasks_with_title(db_session, "Haftalik vazifa")
    assert len(rows) == 2, "the newly spawned occurrence is not due yet and must not re-fire"


async def test_non_repeating_task_stays_pending_after_reminder(db_session: AsyncSession) -> None:
    user = await _make_user(db_session)
    task = await _make_due_task(db_session, user, title="Bir martalik", repeat_type=RepeatType.NONE)

    await scheduler.run_reminder_check(db_session)

    result = await db_session.execute(
        select(Task).where(Task.id == task.id).execution_options(populate_existing=True)
    )
    reloaded = result.scalar_one()
    assert (
        reloaded.status == TaskStatus.PENDING
    ), "a one-off task stays pending/overdue until the user acts"


# --- recurrence date math ---


def test_daily_and_weekly_offsets() -> None:
    start = date(2026, 3, 10)
    assert next_due_date(start, RepeatType.DAILY) == date(2026, 3, 11)
    assert next_due_date(start, RepeatType.WEEKLY) == date(2026, 3, 17)


def test_monthly_recurrence_clamps_to_shorter_month() -> None:
    assert next_due_date(date(2026, 1, 31), RepeatType.MONTHLY) == date(2026, 2, 28)
    assert next_due_date(date(2024, 1, 31), RepeatType.MONTHLY) == date(2024, 2, 29)


def test_monthly_recurrence_wraps_year() -> None:
    assert next_due_date(date(2025, 12, 31), RepeatType.MONTHLY) == date(2026, 1, 31)


# --- snooze expiry ---


async def test_expired_snooze_reverts_to_pending(db_session: AsyncSession) -> None:
    user = await _make_user(db_session)
    task = Task(
        user_id=user.id,
        title="Kechiktirilgan",
        due_date=date.today(),
        due_time=time(23, 59),
        repeat_type=RepeatType.NONE,
        priority=Priority.MEDIUM,
        status=TaskStatus.SNOOZED,
        snoozed_until=datetime.now(UTC) - timedelta(minutes=1),
        created_via=CreatedVia.WEB,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    await scheduler.run_reminder_check(db_session)

    result = await db_session.execute(
        select(Task).where(Task.id == task.id).execution_options(populate_existing=True)
    )
    reloaded = result.scalar_one()
    assert reloaded.status == TaskStatus.PENDING
    assert reloaded.snoozed_until is None


async def test_unexpired_snooze_remains_snoozed(db_session: AsyncSession) -> None:
    user = await _make_user(db_session)
    future = datetime.now(UTC) + timedelta(hours=1)
    task = Task(
        user_id=user.id,
        title="Hali kechiktirilgan",
        due_date=date.today(),
        due_time=time(23, 59),
        repeat_type=RepeatType.NONE,
        priority=Priority.MEDIUM,
        status=TaskStatus.SNOOZED,
        snoozed_until=future,
        created_via=CreatedVia.WEB,
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)

    await scheduler.run_reminder_check(db_session)

    result = await db_session.execute(
        select(Task).where(Task.id == task.id).execution_options(populate_existing=True)
    )
    reloaded = result.scalar_one()
    assert reloaded.status == TaskStatus.SNOOZED
    assert reloaded.snoozed_until == future
