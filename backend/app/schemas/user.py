import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, model_validator

USERNAME_PATTERN = r"^[a-zA-Z0-9_.]+$"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=USERNAME_PATTERN)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    telegram_chat_id: int | None
    created_at: datetime
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None


class UserPreferencesUpdate(BaseModel):
    """Quiet hours: both fields together, or both null to disable."""

    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None

    @model_validator(mode="after")
    def both_or_neither(self) -> "UserPreferencesUpdate":
        if (self.quiet_hours_start is None) != (self.quiet_hours_end is None):
            raise ValueError("quiet_hours_start va quiet_hours_end birga berilishi kerak")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TelegramLinkCodeResponse(BaseModel):
    code: str
    expires_at: datetime
