import uuid
from datetime import date, timedelta
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.enums import TaskStatus
from app.models.task import Task
from app.schemas.stats import CategoryStat, StatsResponse

Period = Literal["daily", "weekly", "monthly"]


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


async def get_stats(db: AsyncSession, user_id: uuid.UUID, period: Period) -> StatsResponse:
    start, end = _period_range(period, date.today())

    status_result = await db.execute(
        select(Task.status, func.count())
        .where(Task.user_id == user_id, Task.due_date.between(start, end))
        .group_by(Task.status)
    )
    counts: dict[TaskStatus, int] = {row[0]: row[1] for row in status_result.all()}
    completed = counts.get(TaskStatus.COMPLETED, 0)
    total = sum(counts.values())
    pending = total - completed

    category_result = await db.execute(
        select(Category.id, Category.name, Category.color, func.count(Task.id))
        .join(Task, Task.category_id == Category.id)
        .where(Task.user_id == user_id, Task.due_date.between(start, end))
        .group_by(Category.id, Category.name, Category.color)
    )
    by_category = [
        CategoryStat(category_id=str(category_id), name=name, color=color, count=count)
        for category_id, name, color, count in category_result.all()
    ]

    return StatsResponse(
        period=period,
        completed=completed,
        pending=pending,
        total=total,
        completion_rate=round(completed / total, 4) if total else 0.0,
        by_category=by_category,
    )
