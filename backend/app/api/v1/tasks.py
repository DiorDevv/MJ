import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.enums import Priority, TaskStatus
from app.models.task import Task
from app.models.user import User
from app.schemas.task import SnoozeRequest, TaskCreate, TaskListResponse, TaskRead, TaskUpdate
from app.services import task_service
from app.services.task_service import FilterName, SortBy, SortOrder

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.create_task(db, current_user.id, task_in)


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    filter_: FilterName | None = Query(default=None, alias="filter"),
    category_id: uuid.UUID | None = Query(default=None),
    priority: Priority | None = Query(default=None),
    status_: TaskStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=200),
    sort_by: SortBy = Query(default="due_date"),
    sort_order: SortOrder = Query(default="asc"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskListResponse:
    items, total = await task_service.list_tasks(
        db,
        current_user.id,
        filter_name=filter_,
        category_id=category_id,
        priority=priority,
        status=status_,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return TaskListResponse.model_validate(
        {"items": items, "total": total, "limit": limit, "offset": offset}
    )


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.get_task(db, current_user.id, task_id)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID,
    task_in: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.update_task(db, current_user.id, task_id, task_in)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await task_service.delete_task(db, current_user.id, task_id)


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.complete_task(db, current_user.id, task_id)


@router.post("/{task_id}/reopen", response_model=TaskRead)
async def reopen_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.reopen_task(db, current_user.id, task_id)


@router.post("/{task_id}/snooze", response_model=TaskRead)
async def snooze_task(
    task_id: uuid.UUID,
    snooze_in: SnoozeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.snooze_task(db, current_user.id, task_id, snooze_in)


@router.post("/{task_id}/skip", response_model=TaskRead)
async def skip_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Task:
    return await task_service.skip_task(db, current_user.id, task_id)
