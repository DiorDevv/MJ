from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"

    database_url: str

    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # Whether the refresh-token cookie gets the `Secure` flag (HTTPS-only).
    # Leave unset to derive it from `environment` (secure everywhere except
    # "development"). Set it explicitly to `false` when serving production over
    # plain HTTP — e.g. an internal VM reached by IP with no TLS — otherwise the
    # browser silently drops the cookie and every page reload logs the user out.
    cookie_secure: bool | None = None

    # Completed tasks older than this many days are hard-deleted by a daily
    # scheduler job (recurring occurrences pile up fastest). 0 = keep forever.
    completed_task_retention_days: int = 0

    cors_origins: str = "http://localhost:5173"

    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_email: str = "mailto:admin@example.com"

    telegram_bot_token: str = ""

    # --- Observability (both opt-in) ---
    # JSON-structured logs. Unset -> on unless environment == "development".
    log_json: bool | None = None
    # Error reporting. Empty -> Sentry disabled.
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.0

    # Any OpenAI-compatible /v1/audio/transcriptions backend — the hosted OpenAI
    # API by default, or a self-hosted server (e.g. speaches, see docker-compose.yml)
    # by pointing stt_base_url at it and leaving stt_api_key blank.
    stt_base_url: str = "https://api.openai.com/v1/audio/transcriptions"
    stt_api_key: str = ""
    stt_model: str = "whisper-1"

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    @field_validator("cookie_secure", "log_json", mode="before")
    @classmethod
    def _blank_optional_bool_is_unset(cls, v: object) -> object:
        # An empty `KEY=` line in .env means "not set" (derive from environment),
        # not an invalid bool.
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def refresh_cookie_secure(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return self.environment != "development"

    @property
    def logs_as_json(self) -> bool:
        if self.log_json is not None:
            return self.log_json
        return self.environment != "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
