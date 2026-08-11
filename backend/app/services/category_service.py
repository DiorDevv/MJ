import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import CategoryNotFoundError
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


async def create_category(
    db: AsyncSession, user_id: uuid.UUID, category_in: CategoryCreate
) -> Category:
    category = Category(user_id=user_id, name=category_in.name, color=category_in.color)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def list_categories(db: AsyncSession, user_id: uuid.UUID) -> list[Category]:
    result = await db.execute(
        select(Category).where(Category.user_id == user_id).order_by(Category.name)
    )
    return list(result.scalars().all())


async def get_category(db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID) -> Category:
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise CategoryNotFoundError()
    return category


async def update_category(
    db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID, category_in: CategoryUpdate
) -> Category:
    category = await get_category(db, user_id, category_id)
    for field, value in category_in.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, user_id: uuid.UUID, category_id: uuid.UUID) -> None:
    category = await get_category(db, user_id, category_id)
    await db.delete(category)
    await db.commit()
