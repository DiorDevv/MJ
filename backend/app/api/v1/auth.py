import uuid

from fastapi import APIRouter, Depends, Request, Response
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.db.session import get_db
from app.exceptions import InvalidTokenError
from app.models.user import User
from app.schemas.user import (
    TelegramLinkCodeResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"

# Per-IP limits slow down scripted abuse; the per-username login limit caps how many
# times a single account can be guessed against even if the attacker rotates IPs.
REGISTER_IP_LIMIT = (10, 3600)
LOGIN_IP_LIMIT = (10, 300)
LOGIN_USERNAME_LIMIT = (5, 900)


def _client_ip(request: Request) -> str:
    return request.headers.get("x-real-ip") or (
        request.client.host if request.client is not None else "unknown"
    )


async def _issue_tokens(db: AsyncSession, response: Response, user_id: uuid.UUID) -> str:
    access_token = create_access_token(user_id)
    refresh_token, jti, expires_at = create_refresh_token(user_id)
    await auth_service.store_refresh_token(db, jti, user_id, expires_at)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )
    return access_token


def _decode_refresh_cookie(request: Request) -> tuple[uuid.UUID, uuid.UUID] | None:
    """Returns (user_id, jti) for a syntactically valid refresh cookie, or None."""
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token is None:
        return None
    try:
        payload = decode_token(refresh_token)
    except PyJWTError:
        return None
    if payload.get("type") != "refresh":
        return None
    try:
        return uuid.UUID(str(payload["sub"])), uuid.UUID(str(payload["jti"]))
    except (KeyError, ValueError):
        return None


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    user_in: UserCreate, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    check_rate_limit(f"register-ip:{_client_ip(request)}", *REGISTER_IP_LIMIT)
    user = await auth_service.create_user(db, user_in)
    access_token = await _issue_tokens(db, response, user.id)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    check_rate_limit(f"login-ip:{_client_ip(request)}", *LOGIN_IP_LIMIT)
    check_rate_limit(f"login-user:{credentials.username.lower()}", *LOGIN_USERNAME_LIMIT)
    user = await auth_service.authenticate_user(db, credentials.username, credentials.password)
    access_token = await _issue_tokens(db, response, user.id)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    decoded = _decode_refresh_cookie(request)
    if decoded is None:
        raise InvalidTokenError()
    user_id, jti = decoded

    if not await auth_service.is_refresh_token_valid(db, jti):
        raise InvalidTokenError()

    user = await auth_service.get_user_by_id(db, user_id)
    if user is None:
        raise InvalidTokenError()

    # Deliberately not rotated: several requests can 401 at once when the access
    # token expires, each triggering its own concurrent /refresh call (see
    # authorizedRequest.ts). Rotating here would let the first response revoke the
    # cookie out from under the others, logging the user out. The refresh token
    # itself is still revocable — via /logout and /logout-all.
    access_token = create_access_token(user.id)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> None:
    decoded = _decode_refresh_cookie(request)
    if decoded is not None:
        _, jti = decoded
        await auth_service.revoke_refresh_token(db, jti)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.post("/logout-all", status_code=204)
async def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Revokes every refresh token issued to this user — signs out all devices/sessions."""
    await auth_service.revoke_all_refresh_tokens(db, current_user.id)
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/telegram/link-code", response_model=TelegramLinkCodeResponse)
async def create_telegram_link_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TelegramLinkCodeResponse:
    code, expires_at = await auth_service.generate_telegram_link_code(db, current_user)
    return TelegramLinkCodeResponse(code=code, expires_at=expires_at)
