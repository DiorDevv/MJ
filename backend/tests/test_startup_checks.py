import logging

from app.core.config import settings
from app.core.startup_checks import warn_if_insecure_defaults


def test_no_warning_in_development(caplog: "logging.LogCaptureFixture") -> None:
    original_env = settings.environment
    settings.environment = "development"
    try:
        with caplog.at_level(logging.WARNING):
            warn_if_insecure_defaults()
        assert caplog.records == []
    finally:
        settings.environment = original_env


def test_warns_on_placeholder_secret_outside_development(
    caplog: "logging.LogCaptureFixture",
) -> None:
    original_env = settings.environment
    original_secret = settings.secret_key
    settings.environment = "production"
    settings.secret_key = "change_me_to_a_long_random_string"
    try:
        with caplog.at_level(logging.WARNING):
            warn_if_insecure_defaults()
        assert any("SECRET_KEY" in record.message for record in caplog.records)
    finally:
        settings.environment = original_env
        settings.secret_key = original_secret


def test_no_warning_with_real_looking_secrets(caplog: "logging.LogCaptureFixture") -> None:
    original_env = settings.environment
    original_secret = settings.secret_key
    original_db_url = settings.database_url
    settings.environment = "production"
    settings.secret_key = "a" * 40
    # The test suite's own DATABASE_URL literally contains "change_me" (see
    # conftest.py), so it must be swapped out too or this assertion would
    # (correctly) still trip on that — not on anything this test is checking.
    settings.database_url = "postgresql+asyncpg://mj_user:a-real-password@localhost:5432/mj_db"
    try:
        with caplog.at_level(logging.WARNING):
            warn_if_insecure_defaults()
        assert caplog.records == []
    finally:
        settings.environment = original_env
        settings.secret_key = original_secret
        settings.database_url = original_db_url
