from pydantic import BaseModel


class CategoryStat(BaseModel):
    category_id: str | None
    name: str
    color: str
    count: int


class StatsResponse(BaseModel):
    period: str
    completed: int
    pending: int
    total: int
    completion_rate: float
    by_category: list[CategoryStat]
