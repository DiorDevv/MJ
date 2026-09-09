import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import ColumnElement, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.enums import RepeatType, TaskStatus
from app.models.task import Task
from app.models.user import User
from app.services import notification_service
from app.services.task_service import build_next_occurrence

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _revert_expired_snoozes(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    result = await db.execute(
        select(Task).where(Task.status == TaskStatus.SNOOZED, Task.snoozed_until <= now)
    )
    expired_tasks = result.scalars().all()
    for task in expired_tasks:
        task.status = TaskStatus.PENDING
        task.snoozed_until = None
    if expired_tasks:
        await db.commit()


async def _create_next_occurrence(db: AsyncSession, task: Task) -> None:
    # The just-notified occurrence and the newly spawned next occurrence are
    # committed together in a single transaction, so a crash mid-way never
    # leaves a recurring task without exactly one active successor.
    new_task = build_next_occurrence(task)
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.now(UTC)
    db.add(new_task)
    await db.commit()


def _in_quiet_hours(user: User, now: datetime) -> bool:
    start, end = user.quiet_hours_start, user.quiet_hours_end
    if start is None or end is None:
        return False
    t = now.time()
    if start <= end:
        return start <= t < end
    # window wraps midnight (e.g. 22:00–07:00)
    return t >= start or t < end


async def _process_due_tasks(db: AsyncSession) -> None:
    now_naive = datetime.now()
    due_at = Task.due_date.op("+")(Task.due_time)
    # populate_existing forces a fresh overwrite of already-identity-mapped User/Task
    # objects (e.g. push_subscriptions added/removed since they were last loaded in
    # this session) instead of silently returning stale cached relationship state.
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.user).selectinload(User.push_subscriptions))
        .where(Task.status == TaskStatus.PENDING, due_at <= now_naive)
        .execution_options(populate_existing=True)
    )
    due_tasks = result.scalars().all()

    for task in due_tasks:
        # Quiet hours: leave the task PENDING and untouched — it'll be picked up
        # on a later tick once the window has passed (which also defers the
        # recurring-successor spawn until the reminder actually goes out).
        if _in_quiet_hours(task.user, now_naive):
            continue

        try:
            await notification_service.send_task_reminder(db, task)
        except Exception:
            # A single task's reminder failing must never stop the rest of the batch.
            logger.exception(
                "Vazifa uchun eslatma jarayonida kutilmagan xatolik: task_id=%s", task.id
            )
            continue

        if task.repeat_type != RepeatType.NONE:
            try:
                await _create_next_occurrence(db, task)
            except Exception:
                logger.exception(
                    "Keyingi takroriy vazifani yaratishda xatolik: task_id=%s", task.id
                )


async def run_reminder_check(db: AsyncSession) -> None:
    await _revert_expired_snoozes(db)
    await _process_due_tasks(db)


async def purge_old_completed_tasks(db: AsyncSession, retention_days: int) -> int:
    """Hard-delete completed tasks whose completion is older than the retention
    window. No-op when retention_days <= 0. Returns the row count deleted."""
    if retention_days <= 0:
        return 0
    cutoff = datetime.now(UTC) - timedelta(days=retention_days)
    predicate: list[ColumnElement[bool]] = [
        Task.status == TaskStatus.COMPLETED,
        Task.completed_at.is_not(None),
        Task.completed_at < cutoff,
    ]
    count = await db.scalar(select(func.count()).select_from(Task).where(*predicate)) or 0
    if count:
        await db.execute(delete(Task).where(*predicate))
        await db.commit()
    return int(count)


async def _reminder_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            await run_reminder_check(db)
        except Exception:
            logger.exception("Eslatma tekshiruvi muvaffaqiyatsiz tugadi")


async def _retention_job() -> None:
    async with AsyncSessionLocal() as db:
        try:
            deleted = await purge_old_completed_tasks(db, settings.completed_task_retention_days)
            if deleted:
                logger.info("Retention: %d ta eski bajarilgan vazifa o'chirildi", deleted)
        except Exception:
            logger.exception("Retention tozalash muvaffaqiyatsiz tugadi")


def start_scheduler() -> None:
    scheduler.add_job(
        _reminder_job,
        "interval",
        seconds=60,
        id="reminder_check",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        _retention_job,
        "interval",
        hours=24,
        id="completed_task_retention",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()


def shutdown_scheduler() -> None:
    scheduler.shutdown(wait=False)
