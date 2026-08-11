import uuid

from fastapi import APIRouter, Depends, Request, Response
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
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


def _issue_tokens(response: Response, user_id: uuid.UUID) -> str:
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
    )
    return access_token


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    user_in: UserCreate, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    user = await auth_service.create_user(db, user_in)
    access_token = _issue_tokens(response, user.id)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    user = await auth_service.authenticate_user(db, credentials.username, credentials.password)
    access_token = _issue_tokens(response, user.id)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token is None:
        raise InvalidTokenError("Refresh token topilmadi")

    try:
        payload = decode_token(refresh_token)
    except PyJWTError as exc:
        raise InvalidTokenError() from exc

    if payload.get("type") != "refresh":
        raise InvalidTokenError()

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError() from exc

    user = await auth_service.get_user_by_id(db, user_id)
    if user is None:
        raise InvalidTokenError()

    access_token = _issue_tokens(response, user.id)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
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
