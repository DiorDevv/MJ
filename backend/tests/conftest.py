import asyncio
import contextlib
import os
from collections.abc import AsyncGenerator

import asyncpg
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Must be set before any `app.*` import: app.core.config.settings is instantiated
# eagerly at import time, so the DB URL has to already point at the test database.
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only-32-bytes-min")
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://mj_user:change_me@localhost:5432/mj_test_db"
)

TEST_DATABASE_URL = os.environ["DATABASE_URL"]

# `setdefault` above only kicks in when DATABASE_URL isn't already set — but it
# always is inside the backend/bot containers (docker-compose passes the real
# dev DB through). Without this check, running pytest in-container points
# _setup_schema's drop_all/create_all straight at that live database instead of
# a throwaway one. Learned the hard way: this wiped every real user/task/category
# row in the dev database. The database name is the one signal available this
# early (before any app.* import) that distinguishes "safe to nuke" from "not".
if "test" not in TEST_DATABASE_URL.rsplit("/", 1)[-1].lower():
    raise RuntimeError(
        f"Refusing to run tests against DATABASE_URL={TEST_DATABASE_URL!r} — its "
        "database name doesn't contain 'test'. This fixture drops and recreates "
        "every table, so it must never point at a real database. Run tests with "
        "DATABASE_URL unset (the mj_test_db default applies) or pointed at a "
        "database whose name contains 'test'."
    )


async def _ensure_test_database_exists() -> None:
    admin_url = TEST_DATABASE_URL.replace("+asyncpg", "").rsplit("/", 1)[0] + "/postgres"
    conn = await asyncpg.connect(admin_url)
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", "mj_test_db")
        if not exists:
            await conn.execute("CREATE DATABASE mj_test_db")
    finally:
        await conn.close()


asyncio.run(_ensure_test_database_exists())

import app.db.session as db_session_module  # noqa: E402
from app.core.rate_limit import reset_rate_limits  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.main import app  # noqa: E402

# pytest-asyncio gives each test function its own event loop. A pooled asyncpg
# connection created in one test's loop is unusable in the next ("attached to a
# different loop"). NullPool sidesteps this entirely: every checkout opens a fresh
# connection instead of reusing one from a pool tied to a now-dead loop. This test
# engine replaces the app's module-level engine/sessionmaker so both API requests
# (via the `client` fixture's `get_db` dependency) and direct DB access (via the
# `db_session` fixture) share the same loop-safe engine.
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False, autoflush=False)
db_session_module.engine = test_engine
db_session_module.AsyncSessionLocal = TestSessionLocal


@pytest_asyncio.fixture(autouse=True)
async def _setup_schema() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    reset_rate_limits()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    session = TestSessionLocal()
    try:
        yield session
    finally:
        # pytest-asyncio's fixture teardown can run after the test's event loop has
        # started shutting down, racing asyncpg's own connection-close bookkeeping
        # ("attached to a different loop"/"event loop is closed"). The test's
        # assertions have already completed by this point either way — swallow the
        # close-time race rather than turning a passing test into a fixture ERROR.
        with contextlib.suppress(RuntimeError):
            await session.close()
