"""Logging + error reporting wiring, shared by the API and the Telegram bot.

Kept dependency-light on purpose — the bot's image installs neither Starlette nor
sentry-sdk, so nothing here may import them at module load. The ASGI request-id
middleware lives in ``app.core.request_id`` (API only); Sentry is imported lazily.

* structured JSON logs are on unless ``ENVIRONMENT=development`` (or ``LOG_JSON``
  is set explicitly) — falls back to a readable line if python-json-logger
  isn't installed;
* Sentry only initialises when ``SENTRY_DSN`` is non-empty.
"""

import logging
from contextvars import ContextVar, Token

from app.core.config import settings

_request_id: ContextVar[str] = ContextVar("request_id", default="-")

REQUEST_ID_HEADER = "X-Request-ID"


def current_request_id() -> str:
    return _request_id.get()


def set_request_id(value: str) -> Token[str]:
    return _request_id.set(value)


def reset_request_id(token: Token[str]) -> None:
    _request_id.reset(token)


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


def _json_formatter() -> logging.Formatter | None:
    try:
        from pythonjsonlogger.json import JsonFormatter
    except ModuleNotFoundError:
        return None
    return JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        rename_fields={"asctime": "ts", "levelname": "level", "name": "logger"},
    )


def configure_logging() -> None:
    """Install a single stderr handler on the root logger. Idempotent."""
    root = logging.getLogger()
    root.handlers.clear()

    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())

    formatter = _json_formatter() if settings.logs_as_json else None
    handler.setFormatter(
        formatter
        or logging.Formatter("%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s")
    )

    root.addHandler(handler)
    root.setLevel(logging.INFO)
    # uvicorn installs its own handlers on these — let them bubble to root instead.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = True


def init_sentry() -> None:
    if not settings.sentry_dsn:
        return
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        # Don't ship request bodies / headers by default — tasks are personal.
        send_default_pii=False,
    )
