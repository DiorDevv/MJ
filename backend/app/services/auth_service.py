import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.exceptions import InvalidCredentialsError, UsernameAlreadyExistsError
from app.models.user import User
from app.schemas.user import UserCreate

TELEGRAM_LINK_CODE_TTL_MINUTES = 5


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_in: UserCreate) -> User:
    existing = await get_user_by_username(db, user_in.username)
    if existing is not None:
        raise UsernameAlreadyExistsError()

    user = User(username=user_in.username, hashed_password=hash_password(user_in.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    user = await get_user_by_username(db, username)
    if user is None or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError()
    return user


async def generate_telegram_link_code(db: AsyncSession, user: User) -> tuple[str, datetime]:
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=TELEGRAM_LINK_CODE_TTL_MINUTES)

    # Collisions are exceedingly unlikely (1-in-a-million, 5 min window) but a
    # 6-digit code lookup by the bot must resolve to exactly one user, so guard
    # against a currently-active duplicate rather than trust the odds.
    code = ""
    for _ in range(5):
        candidate = f"{secrets.randbelow(1_000_000):06d}"
        result = await db.execute(
            select(User.id).where(
                User.telegram_link_code == candidate,
                User.telegram_link_code_expires_at > now,
            )
        )
        if result.scalar_one_or_none() is None:
            code = candidate
            break
    if not code:
        code = f"{secrets.randbelow(1_000_000):06d}"

    user.telegram_link_code = code
    user.telegram_link_code_expires_at = expires_at
    await db.commit()
    return code, expires_at
