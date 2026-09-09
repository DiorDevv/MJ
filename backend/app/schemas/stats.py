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


class ActivityResponse(BaseModel):
    days: list[ActivityDay]


class StreakResponse(BaseModel):
    current: int
    longest: int
