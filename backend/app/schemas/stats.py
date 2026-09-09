from pydantic import BaseModel


class CategoryStat(BaseModel):
    category_id: str | None
    name: str
    color: str
    count: int


class PriorityStat(BaseModel):
    priority: str
    count: int


class StatsResponse(BaseModel):
    period: str
    completed: int
    pending: int
    total: int
    completion_rate: float
    by_category: list[CategoryStat]
    by_priority: list[PriorityStat]


class ActivityDay(BaseModel):
    date: str  # "YYYY-MM-DD" (local wall-clock day)
    completed: int
    created: int


class ActivitySummary(BaseModel):
    total_completed: int
    avg_per_day: float
    # 0 = Monday … 6 = Sunday; null when nothing was completed in the window.
    best_weekday: int | None


class ActivityResponse(BaseModel):
    days: list[ActivityDay]
    summary: ActivitySummary


class StreakResponse(BaseModel):
    current: int
    longest: int
