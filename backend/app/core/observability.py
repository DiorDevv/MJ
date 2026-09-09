"""Logging + error reporting wiring. Both features are opt-in:

* structured JSON logs are on unless ``ENVIRONMENT=development`` (or ``LOG_JSON``
  is set explicitly);
* Sentry only initialises when ``SENTRY_DSN`` is non-empty.

Every log record and every Sentry event carries the request id (from the
``X-Request-ID`` header, or a generated one), so a client-side error report and
the server logs for that request can be lined up.
"""

import logging
import uuid
from collections.abc import Awaitable, Callable
from contextvars import ContextVar

from pythonjsonlogger.json import JsonFormatter
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.core.config import settings

_request_id: ContextVar[str] = ContextVar("request_id", default="-")

REQUEST_ID_HEADER = "X-Request-ID"


def current_request_id() -> str:
    return _request_id.get()


class _RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


def configure_logging() -> None:
    """Install a single stderr handler on the root logger. Idempotent."""
    root = logging.getLogger()
    root.handlers.clear()

    handler = logging.StreamHandler()
    handler.addFilter(_RequestIdFilter())
    if settings.logs_as_json:
        handler.setFormatter(
            JsonFormatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
                rename_fields={"asctime": "ts", "levelname": "level", "name": "logger"},
            )
        )
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-8s [%(request_id)s] %(name)s: %(message)s")
        )

    root.addHandler(handler)
    root.setLevel(logging.INFO)
    # uvicorn installs its own handlers on these — let them bubble to root instead.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = True


class RequestIdMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        rid = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        token = _request_id.set(rid)
        try:
            response = await call_next(request)
        finally:
            _request_id.reset(token)
        response.headers[REQUEST_ID_HEADER] = rid
        return response


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
