import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_PLACEHOLDER_MARKERS = ("change_me", "change_this")


def warn_if_insecure_defaults() -> None:
    """Logs a loud warning on startup if obvious .env.example placeholders are
    still in use outside development — cheap insurance against a forgotten
    `change_me` shipping to a real deployment."""
    if settings.environment == "development":
        return

    problems = []
    if len(settings.secret_key) < 32 or any(
        marker in settings.secret_key.lower() for marker in _PLACEHOLDER_MARKERS
    ):
        problems.append("SECRET_KEY")
    if any(marker in settings.database_url.lower() for marker in _PLACEHOLDER_MARKERS):
        problems.append("POSTGRES_PASSWORD (in DATABASE_URL)")

    if problems:
        logger.warning(
            "INSECURE DEFAULT VALUE(S) DETECTED for: %s. "
            "Set real, random values in .env before exposing this deployment to real users.",
            ", ".join(problems),
        )
