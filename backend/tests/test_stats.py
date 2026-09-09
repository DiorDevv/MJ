from datetime import UTC, date, datetime, time, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import CreatedVia, Priority, TaskStatus
from app.models.task import Task
from app.models.user import User
from app.services import stats_service
from tests.helpers import register_user


async def _make_user(db_session: AsyncSession, username: str) -> User:
    user = User(username=username, hashed_password=hash_password("supersecret123"))
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _completed_on(db_session: AsyncSession, user: User, day: date, *, title: str) -> Task:
    """A completed task whose completed_at lands on `day` (local noon → no tz edge)."""
    ts = datetime.combine(day, time(12, 0)).astimezone().astimezone(UTC)
    task = Task(
        user_id=user.id,
        title=title,
        due_date=day,
        due_time=time(9, 0),
        priority=Priority.MEDIUM,
        status=TaskStatus.COMPLETED,
        completed_at=ts,
        created_via=CreatedVia.WEB,
    )
    db_session.add(task)
    await db_session.commit()
    return task


# --- /stats by_priority ---


async def test_stats_reports_all_priorities(client: AsyncClient) -> None:
    headers = await register_user(client, "stats_prio")
    today = date.today().isoformat()
    for prio in ("high", "high", "low"):
        resp = await client.post(
            "/api/v1/tasks",
            json={
                "title": f"t-{prio}",
                "due_date": today,
                "due_time": "10:00:00",
                "priority": prio,
            },
            headers=headers,
        )
        assert resp.status_code == 201

    body = (await client.get("/api/v1/stats?period=daily", headers=headers)).json()
    by_priority = {row["priority"]: row["count"] for row in body["by_priority"]}
    assert by_priority == {"high": 2, "medium": 0, "low": 1}
    assert [row["priority"] for row in body["by_priority"]] == ["high", "medium", "low"]


# --- /stats/activity ---


async def test_activity_window_is_dense_and_ascending(client: AsyncClient) -> None:
    headers = await register_user(client, "stats_activity")
    await client.post(
        "/api/v1/tasks",
        json={"title": "done today", "due_date": date.today().isoformat(), "due_time": "10:00:00"},
        headers=headers,
    )
    tasks = (await client.get("/api/v1/tasks", headers=headers)).json()["items"]
    await client.post(f"/api/v1/tasks/{tasks[0]['id']}/complete", headers=headers)

    body = (await client.get("/api/v1/stats/activity?days=7", headers=headers)).json()
    days = body["days"]
    assert len(days) == 7
    assert [d["date"] for d in days] == sorted(d["date"] for d in days)
    assert days[-1]["date"] == date.today().isoformat()
    assert days[-1]["completed"] >= 1
    assert days[-1]["created"] >= 1
    assert sum(d["completed"] for d in days[:-1]) == 0


async def test_activity_days_param_is_clamped(client: AsyncClient) -> None:
    headers = await register_user(client, "stats_activity_clamp")
    one = (await client.get("/api/v1/stats/activity?days=1", headers=headers)).json()
    assert len(one["days"]) == 1
    over = await client.get("/api/v1/stats/activity?days=9999", headers=headers)
    assert over.status_code == 422  # ge/le on the query param


# --- /stats/streak ---


async def test_streak_empty(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "streak_empty")
    result = await stats_service.get_streak(db_session, user.id)
    assert result.current == 0
    assert result.longest == 0


async def test_streak_counts_back_from_today_with_grace(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "streak_run")
    today = date.today()
    # yesterday, day-before, day-3 → 3-day run; nothing today yet (grace).
    for offset in (1, 2, 3):
        await _completed_on(db_session, user, today - timedelta(days=offset), title=f"d{offset}")

    result = await stats_service.get_streak(db_session, user.id)
    assert result.current == 3
    assert result.longest == 3


async def test_streak_breaks_on_a_gap(db_session: AsyncSession) -> None:
    user = await _make_user(db_session, "streak_gap")
    today = date.today()
    await _completed_on(db_session, user, today, title="a")
    await _completed_on(db_session, user, today - timedelta(days=1), title="b")
    # gap at day-2, then a longer older run
    for offset in (4, 5, 6, 7):
        await _completed_on(db_session, user, today - timedelta(days=offset), title=f"o{offset}")

    result = await stats_service.get_streak(db_session, user.id)
    assert result.current == 2
    assert result.longest == 4
