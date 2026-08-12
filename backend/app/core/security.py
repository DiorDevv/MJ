import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return str(pwd_context.hash(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bool(pwd_context.verify(plain_password, hashed_password))


def _create_token(
    subject: uuid.UUID, expires_delta: timedelta, token_type: Literal["access", "refresh"]
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: uuid.UUID) -> str:
    return _create_token(user_id, timedelta(minutes=settings.access_token_expire_minutes), "access")


def create_refresh_token(user_id: uuid.UUID) -> tuple[str, uuid.UUID, datetime]:
    """Returns (token, jti, expires_at) — the jti/expiry are persisted separately
    (see RefreshToken) so a token can be revoked before its natural expiry."""
    jti = uuid.uuid4()
    now = datetime.now(UTC)
    expires_at = now + timedelta(days=settings.refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": expires_at,
        "jti": str(jti),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
