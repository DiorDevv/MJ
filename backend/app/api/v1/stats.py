from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.stats import ActivityResponse, StatsResponse, StreakResponse
from app.services import stats_service

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def read_stats(
    period: Literal["daily", "weekly", "monthly"] = Query(default="weekly"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StatsResponse:
    return await stats_service.get_stats(db, current_user.id, period)


@router.get("/activity", response_model=ActivityResponse)
async def read_activity(
    days: int = Query(default=84, ge=1, le=366),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActivityResponse:
    return await stats_service.get_activity(db, current_user.id, days)


@router.get("/streak", response_model=StreakResponse)
async def read_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreakResponse:
    return await stats_service.get_streak(db, current_user.id)
