import uuid
from collections import Counter
from datetime import date, datetime, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.enums import Priority, TaskStatus
from app.models.task import Task
from app.schemas.stats import (
    ActivityDay,
    ActivityResponse,
    CategoryStat,
    PriorityStat,
    StatsResponse,
    StreakResponse,
)

Period = Literal["daily", "weekly", "monthly"]

_MAX_ACTIVITY_DAYS = 366


def _period_range(period: Period, today: date) -> tuple[date, date]:
    if period == "daily":
        return today, today
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    start = today.replace(day=1)
    next_month = (
        start.replace(year=start.year + 1, month=1)
        if start.month == 12
        else start.replace(month=start.month + 1)
    )
    return start, next_month - timedelta(days=1)


def _local_date(value: datetime) -> date:
    """Bucket a tz-aware UTC timestamp into a local wall-clock day, matching how
    the rest of the app treats "today" (the container runs in one fixed TZ)."""
    return value.astimezone().date()


async def get_stats(db: AsyncSession, user_id: uuid.UUID, period: Period) -> StatsResponse:
    start, end = _period_range(period, date.today())
    window = (Task.user_id == user_id, Task.due_date.between(start, end))

    status_result = await db.execute(
        select(Task.status, func.count()).where(*window).group_by(Task.status)
    )
    counts: dict[TaskStatus, int] = {row[0]: row[1] for row in status_result.all()}
    completed = counts.get(TaskStatus.COMPLETED, 0)
    total = sum(counts.values())
    pending = total - completed

    category_result = await db.execute(
        select(Category.id, Category.name, Category.color, func.count(Task.id))
        .join(Task, Task.category_id == Category.id)
        .where(*window)
        .group_by(Category.id, Category.name, Category.color)
    )
    by_category = [
        CategoryStat(category_id=str(category_id), name=name, color=color, count=count)
        for category_id, name, color, count in category_result.all()
    ]

    priority_result = await db.execute(
        select(Task.priority, func.count()).where(*window).group_by(Task.priority)
    )
    priority_counts: dict[Priority, int] = {row[0]: row[1] for row in priority_result.all()}
    # Always emit all three, in a stable order, so the chart axis never jumps.
    by_priority = [
        PriorityStat(priority=p.value, count=priority_counts.get(p, 0))
        for p in (Priority.HIGH, Priority.MEDIUM, Priority.LOW)
    ]

    return StatsResponse(
        period=period,
        completed=completed,
        pending=pending,
        total=total,
        completion_rate=round(completed / total, 4) if total else 0.0,
        by_category=by_category,
        by_priority=by_priority,
    )


async def get_activity(db: AsyncSession, user_id: uuid.UUID, days: int) -> ActivityResponse:
    days = max(1, min(days, _MAX_ACTIVITY_DAYS))
    today = date.today()
    window_start = today - timedelta(days=days - 1)

    completed_rows = await db.execute(
        select(Task.completed_at).where(Task.user_id == user_id, Task.completed_at.is_not(None))
    )
    created_rows = await db.execute(select(Task.created_at).where(Task.user_id == user_id))

    completed_by_day: Counter[date] = Counter(
        _local_date(ts) for (ts,) in completed_rows.all() if ts is not None
    )
    created_by_day: Counter[date] = Counter(_local_date(ts) for (ts,) in created_rows.all())

    out = [
        ActivityDay(
            date=(day := window_start + timedelta(days=offset)).isoformat(),
            completed=completed_by_day.get(day, 0),
            created=created_by_day.get(day, 0),
        )
        for offset in range(days)
    ]
    return ActivityResponse(days=out)


async def get_streak(db: AsyncSession, user_id: uuid.UUID) -> StreakResponse:
    rows = await db.execute(
        select(Task.completed_at).where(Task.user_id == user_id, Task.completed_at.is_not(None))
    )
    active: set[date] = {_local_date(ts) for (ts,) in rows.all() if ts is not None}
    if not active:
        return StreakResponse(current=0, longest=0)

    # current: count back from today; today not yet required (grace day) — the
    # streak only breaks once yesterday is also empty.
    today = date.today()
    cursor = today if today in active else today - timedelta(days=1)
    current = 0
    while cursor in active:
        current += 1
        cursor -= timedelta(days=1)

    # longest: walk the sorted distinct days, counting consecutive runs.
    longest = run = 0
    prev: date | None = None
    for day in sorted(active):
        run = run + 1 if prev is not None and day - prev == timedelta(days=1) else 1
        longest = max(longest, run)
        prev = day

    return StreakResponse(current=current, longest=longest)
