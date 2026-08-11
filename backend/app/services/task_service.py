import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any, Literal

from sqlalchemy import Select, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.exceptions import CategoryNotFoundError, InvalidSnoozeTimeError, TaskNotFoundError
from app.models.category import Category
from app.models.enums import CreatedVia, Priority, TaskStatus
from app.models.task import Task
from app.schemas.task import SnoozeRequest, TaskCreate, TaskUpdate

# due_date/due_time are stored as naive local wall-clock values (the app runs in a single
# fixed timezone, set via the container's TZ env var — there is no per-user timezone).
# All other timestamps (snoozed_until, created_at, ...) are timezone-aware UTC.
# `datetime.now()` (naive) is used to compare against due_date/due_time;
# `datetime.now(UTC)` (aware) is used for tz-aware columns.

FilterName = Literal["today", "tomorrow", "this_week", "overdue", "completed"]
SortBy = Literal["due_date", "priority", "created_at"]
SortOrder = Literal["asc", "desc"]

_SNOOZE_PRESET_DELTAS = {"15m": timedelta(minutes=15), "1h": timedelta(hours=1)}


async def _get_owned_category(
    db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID
) -> Category:
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise CategoryNotFoundError()
    return category


async def create_task(db: AsyncSession, user_id: uuid.UUID, task_in: TaskCreate) -> Task:
    if task_in.category_id is not None:
        await _get_owned_category(db, user_id, task_in.category_id)

    task = Task(
        user_id=user_id,
        title=task_in.title,
        description=task_in.description,
        due_date=task_in.due_date,
        due_time=task_in.due_time,
        repeat_type=task_in.repeat_type,
        category_id=task_in.category_id,
        priority=task_in.priority,
        status=TaskStatus.PENDING,
        created_via=CreatedVia.WEB,
    )
    db.add(task)
    await db.commit()
    task = await _reload_task(db, task.id)
    return task


async def get_task(db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.category))
        .where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise TaskNotFoundError()
    return task


async def _reload_task(db: AsyncSession, task_id: uuid.UUID) -> Task:
    # A plain db.refresh(task, attribute_names=[...]) leaves every column NOT named
    # expired; FastAPI's response serialization then triggers a lazy load outside the
    # async context and crashes with MissingGreenlet. A full re-select is the safe way
    # to get a fully-loaded, eager-relationship instance after a mutation — but the
    # session's identity map returns the same cached object without overwriting an
    # already-loaded relationship (e.g. a cleared category_id) unless populate_existing
    # is set, so it must be forced explicitly.
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.category))
        .where(Task.id == task_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


def _priority_rank() -> ColumnElement[int]:
    return case(
        (Task.priority == Priority.LOW, 1),
        (Task.priority == Priority.MEDIUM, 2),
        (Task.priority == Priority.HIGH, 3),
    )


def _apply_high_level_filter(
    stmt: Select[tuple[Task]], filter_name: FilterName | None, today: date, now_naive: datetime
) -> Select[tuple[Task]]:
    if filter_name == "today":
        return stmt.where(Task.due_date == today)
    if filter_name == "tomorrow":
        return stmt.where(Task.due_date == today + timedelta(days=1))
    if filter_name == "this_week":
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        return stmt.where(Task.due_date.between(week_start, week_end))
    if filter_name == "overdue":
        due_at = Task.due_date.op("+")(Task.due_time)
        return stmt.where(Task.status == TaskStatus.PENDING, due_at < now_naive)
    if filter_name == "completed":
        return stmt.where(Task.status == TaskStatus.COMPLETED)
    return stmt


async def list_tasks(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    filter_name: FilterName | None,
    category_id: uuid.UUID | None,
    priority: Priority | None,
    status: TaskStatus | None,
    search: str | None,
    sort_by: SortBy,
    sort_order: SortOrder,
    limit: int,
    offset: int,
) -> tuple[list[Task], int]:
    stmt = select(Task).where(Task.user_id == user_id)
    stmt = _apply_high_level_filter(stmt, filter_name, date.today(), datetime.now())

    if category_id is not None:
        stmt = stmt.where(Task.category_id == category_id)
    if priority is not None:
        stmt = stmt.where(Task.priority == priority)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Task.title.ilike(pattern) | Task.description.ilike(pattern))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()

    descending = sort_order == "desc"
    order_cols: list[Any]
    if sort_by == "priority":
        order_cols = [_priority_rank()]
    elif sort_by == "created_at":
        order_cols = [Task.created_at]
    else:
        order_cols = [Task.due_date, Task.due_time]
    stmt = stmt.order_by(*[col.desc() if descending else col.asc() for col in order_cols])

    stmt = stmt.options(selectinload(Task.category)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def update_task(
    db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID, task_in: TaskUpdate
) -> Task:
    task = await get_task(db, user_id, task_id)
    update_data = task_in.model_dump(exclude_unset=True)

    if update_data.get("category_id") is not None:
        await _get_owned_category(db, user_id, update_data["category_id"])

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    task = await _reload_task(db, task.id)
    return task


async def delete_task(db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID) -> None:
    task = await get_task(db, user_id, task_id)
    await db.delete(task)
    await db.commit()


async def complete_task(db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
    task = await get_task(db, user_id, task_id)
    task.status = TaskStatus.COMPLETED
    task.snoozed_until = None
    await db.commit()
    task = await _reload_task(db, task.id)
    return task


async def reopen_task(db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID) -> Task:
    task = await get_task(db, user_id, task_id)
    task.status = TaskStatus.PENDING
    task.snoozed_until = None
    await db.commit()
    task = await _reload_task(db, task.id)
    return task


async def snooze_task(
    db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID, snooze_in: SnoozeRequest
) -> Task:
    task = await get_task(db, user_id, task_id)
    now = datetime.now(UTC)

    if snooze_in.preset == "tomorrow":
        tomorrow = date.today() + timedelta(days=1)
        snoozed_until = datetime.combine(tomorrow, task.due_time).astimezone()
    elif snooze_in.preset in _SNOOZE_PRESET_DELTAS:
        snoozed_until = now + _SNOOZE_PRESET_DELTAS[snooze_in.preset]
    else:
        assert snooze_in.snoozed_until is not None
        if snooze_in.snoozed_until <= now:
            raise InvalidSnoozeTimeError()
        snoozed_until = snooze_in.snoozed_until

    task.status = TaskStatus.SNOOZED
    task.snoozed_until = snoozed_until
    await db.commit()
    task = await _reload_task(db, task.id)
    return task
