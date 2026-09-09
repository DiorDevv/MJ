from datetime import date, timedelta
from typing import Any

from httpx import AsyncClient

from tests.helpers import register_user


async def _create_category(client: AsyncClient, headers: dict[str, str], name: str = "Ish") -> str:
    response = await client.post(
        "/api/v1/categories", json={"name": name, "color": "#FF5733"}, headers=headers
    )
    assert response.status_code == 201
    category_id: str = response.json()["id"]
    return category_id


async def _create_task(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    title: str = "Vazifa",
    due_date: date | None = None,
    due_time: str = "10:00:00",
    priority: str = "medium",
    category_id: str | None = None,
    repeat_type: str = "none",
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "title": title,
        "due_date": (due_date or date.today()).isoformat(),
        "due_time": due_time,
        "priority": priority,
        "repeat_type": repeat_type,
    }
    if category_id is not None:
        body["category_id"] = category_id
    response = await client.post("/api/v1/tasks", json=body, headers=headers)
    assert response.status_code == 201, response.text
    result: dict[str, Any] = response.json()
    return result


# --- categories ---


async def test_create_category(client: AsyncClient) -> None:
    headers = await register_user(client, "cat_owner")
    response = await client.post(
        "/api/v1/categories", json={"name": "Ish", "color": "#FF5733"}, headers=headers
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Ish"


async def test_create_category_invalid_color_rejected(client: AsyncClient) -> None:
    headers = await register_user(client, "cat_owner2")
    response = await client.post(
        "/api/v1/categories", json={"name": "Bad", "color": "notahex"}, headers=headers
    )
    assert response.status_code == 422


async def test_category_not_visible_to_other_user(client: AsyncClient) -> None:
    owner_headers = await register_user(client, "cat_owner3")
    other_headers = await register_user(client, "cat_intruder")
    category_id = await _create_category(client, owner_headers)

    response = await client.get(f"/api/v1/categories/{category_id}", headers=other_headers)
    assert response.status_code == 404


async def test_delete_category_nulls_out_task_category(client: AsyncClient) -> None:
    headers = await register_user(client, "cat_cascade")
    category_id = await _create_category(client, headers)
    task = await _create_task(client, headers, category_id=category_id)

    delete_response = await client.delete(f"/api/v1/categories/{category_id}", headers=headers)
    assert delete_response.status_code == 204

    get_response = await client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert get_response.json()["category"] is None


# --- task CRUD ---


async def test_create_task(client: AsyncClient) -> None:
    headers = await register_user(client, "task_owner")
    task = await _create_task(client, headers, title="Yangi vazifa", priority="high")
    assert task["title"] == "Yangi vazifa"
    assert task["priority"] == "high"
    assert task["status"] == "pending"
    assert task["created_via"] == "web"


async def test_create_task_with_invalid_category_rejected(client: AsyncClient) -> None:
    headers = await register_user(client, "task_owner2")
    response = await client.post(
        "/api/v1/tasks",
        json={
            "title": "Invalid cat",
            "due_date": date.today().isoformat(),
            "due_time": "10:00:00",
            "category_id": "00000000-0000-0000-0000-000000000000",
        },
        headers=headers,
    )
    assert response.status_code == 404


async def test_create_task_empty_title_rejected(client: AsyncClient) -> None:
    headers = await register_user(client, "task_owner3")
    response = await client.post(
        "/api/v1/tasks",
        json={"title": "", "due_date": date.today().isoformat(), "due_time": "10:00:00"},
        headers=headers,
    )
    assert response.status_code == 422


async def test_task_not_visible_to_other_user(client: AsyncClient) -> None:
    owner_headers = await register_user(client, "task_owner4")
    other_headers = await register_user(client, "task_intruder")
    task = await _create_task(client, owner_headers)

    response = await client.get(f"/api/v1/tasks/{task['id']}", headers=other_headers)
    assert response.status_code == 404


async def test_update_task_priority(client: AsyncClient) -> None:
    headers = await register_user(client, "task_updater")
    task = await _create_task(client, headers, priority="low")

    response = await client.patch(
        f"/api/v1/tasks/{task['id']}", json={"priority": "high"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["priority"] == "high"


async def test_update_task_can_clear_category(client: AsyncClient) -> None:
    headers = await register_user(client, "task_clear_cat")
    category_id = await _create_category(client, headers)
    task = await _create_task(client, headers, category_id=category_id)
    assert task["category"] is not None

    response = await client.patch(
        f"/api/v1/tasks/{task['id']}", json={"category_id": None}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["category"] is None


async def test_delete_task(client: AsyncClient) -> None:
    headers = await register_user(client, "task_deleter")
    task = await _create_task(client, headers)

    delete_response = await client.delete(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert delete_response.status_code == 204

    get_response = await client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert get_response.status_code == 404


# --- status transitions ---


async def test_complete_and_reopen_task(client: AsyncClient) -> None:
    headers = await register_user(client, "task_completer")
    task = await _create_task(client, headers)

    complete_response = await client.post(f"/api/v1/tasks/{task['id']}/complete", headers=headers)
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "completed"

    reopen_response = await client.post(f"/api/v1/tasks/{task['id']}/reopen", headers=headers)
    assert reopen_response.status_code == 200
    assert reopen_response.json()["status"] == "pending"


async def test_completing_a_recurring_task_spawns_the_next_occurrence(client: AsyncClient) -> None:
    headers = await register_user(client, "recurring_completer")
    task = await _create_task(
        client, headers, title="Kunlik odat", due_date=date(2026, 3, 10), repeat_type="daily"
    )

    complete_response = await client.post(f"/api/v1/tasks/{task['id']}/complete", headers=headers)
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "completed"

    listed = await client.get("/api/v1/tasks", headers=headers)
    assert listed.status_code == 200
    items = listed.json()["items"]
    assert len(items) == 2

    successor = next(t for t in items if t["status"] == "pending")
    assert successor["id"] != task["id"]
    assert successor["title"] == "Kunlik odat"
    assert successor["due_date"] == "2026-03-11"
    assert successor["repeat_type"] == "daily"


async def test_completing_a_one_off_task_spawns_nothing(client: AsyncClient) -> None:
    headers = await register_user(client, "oneoff_completer")
    task = await _create_task(client, headers, repeat_type="none")

    await client.post(f"/api/v1/tasks/{task['id']}/complete", headers=headers)

    listed = await client.get("/api/v1/tasks", headers=headers)
    assert [t["id"] for t in listed.json()["items"]] == [task["id"]]


async def test_snooze_preset(client: AsyncClient) -> None:
    headers = await register_user(client, "task_snoozer")
    task = await _create_task(client, headers)

    response = await client.post(
        f"/api/v1/tasks/{task['id']}/snooze", json={"preset": "15m"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "snoozed"
    assert response.json()["snoozed_until"] is not None


async def test_snooze_requires_exactly_one_option(client: AsyncClient) -> None:
    headers = await register_user(client, "task_snoozer2")
    task = await _create_task(client, headers)

    both = await client.post(
        f"/api/v1/tasks/{task['id']}/snooze",
        json={"preset": "15m", "snoozed_until": "2099-01-01T10:00:00+00:00"},
        headers=headers,
    )
    assert both.status_code == 422

    neither = await client.post(f"/api/v1/tasks/{task['id']}/snooze", json={}, headers=headers)
    assert neither.status_code == 422


async def test_snooze_past_custom_time_rejected(client: AsyncClient) -> None:
    headers = await register_user(client, "task_snoozer3")
    task = await _create_task(client, headers)

    response = await client.post(
        f"/api/v1/tasks/{task['id']}/snooze",
        json={"snoozed_until": "2020-01-01T10:00:00+00:00"},
        headers=headers,
    )
    assert response.status_code == 422


async def test_snooze_naive_datetime_rejected(client: AsyncClient) -> None:
    headers = await register_user(client, "task_snoozer4")
    task = await _create_task(client, headers)

    response = await client.post(
        f"/api/v1/tasks/{task['id']}/snooze",
        json={"snoozed_until": "2099-01-01T10:00:00"},
        headers=headers,
    )
    assert response.status_code == 422


# --- filtering, search, sort ---


async def test_filter_today(client: AsyncClient) -> None:
    headers = await register_user(client, "filter_today")
    today_task = await _create_task(client, headers, title="Bugungi")
    await _create_task(client, headers, title="Ertangi", due_date=date.today() + timedelta(days=1))

    response = await client.get("/api/v1/tasks", params={"filter": "today"}, headers=headers)
    titles = [t["title"] for t in response.json()["items"]]
    assert titles == [today_task["title"]]


async def test_filter_overdue_excludes_completed(client: AsyncClient) -> None:
    headers = await register_user(client, "filter_overdue")
    overdue_task = await _create_task(
        client, headers, title="Kechikkan", due_date=date.today() - timedelta(days=2)
    )

    response = await client.get("/api/v1/tasks", params={"filter": "overdue"}, headers=headers)
    assert [t["title"] for t in response.json()["items"]] == ["Kechikkan"]

    await client.post(f"/api/v1/tasks/{overdue_task['id']}/complete", headers=headers)

    response_after = await client.get(
        "/api/v1/tasks", params={"filter": "overdue"}, headers=headers
    )
    assert response_after.json()["total"] == 0


async def test_search_by_title(client: AsyncClient) -> None:
    headers = await register_user(client, "search_user")
    await _create_task(client, headers, title="Non yopish")
    await _create_task(client, headers, title="Kitob o'qish")

    response = await client.get("/api/v1/tasks", params={"search": "yopish"}, headers=headers)
    assert [t["title"] for t in response.json()["items"]] == ["Non yopish"]


async def test_filter_by_category(client: AsyncClient) -> None:
    headers = await register_user(client, "filter_cat_user")
    category_id = await _create_category(client, headers)
    matching = await _create_task(client, headers, title="Ish vazifasi", category_id=category_id)
    await _create_task(client, headers, title="Boshqa vazifa")

    response = await client.get(
        "/api/v1/tasks", params={"category_id": category_id}, headers=headers
    )
    assert [t["title"] for t in response.json()["items"]] == [matching["title"]]


async def test_sort_by_priority_desc(client: AsyncClient) -> None:
    headers = await register_user(client, "sort_user")
    await _create_task(client, headers, title="low one", priority="low")
    await _create_task(client, headers, title="high one", priority="high")
    await _create_task(client, headers, title="medium one", priority="medium")

    response = await client.get(
        "/api/v1/tasks", params={"sort_by": "priority", "sort_order": "desc"}, headers=headers
    )
    priorities = [t["priority"] for t in response.json()["items"]]
    assert priorities == ["high", "medium", "low"]


# --- skip (recurring tasks only) ---


async def test_skip_daily_task_advances_one_day(client: AsyncClient) -> None:
    headers = await register_user(client, "skip_daily")
    task = await _create_task(
        client, headers, title="Kunlik mashq", due_date=date(2026, 3, 10), repeat_type="daily"
    )

    response = await client.post(f"/api/v1/tasks/{task['id']}/skip", headers=headers)
    assert response.status_code == 200
    skipped = response.json()
    assert skipped["due_date"] == "2026-03-11"
    assert skipped["status"] == "pending"
    assert skipped["title"] == "Kunlik mashq"
    assert skipped["id"] != task["id"]


async def test_skip_removes_the_original_occurrence(client: AsyncClient) -> None:
    headers = await register_user(client, "skip_gone")
    task = await _create_task(client, headers, repeat_type="weekly")

    await client.post(f"/api/v1/tasks/{task['id']}/skip", headers=headers)

    get_response = await client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert get_response.status_code == 404


async def test_skip_does_not_count_as_completed(client: AsyncClient) -> None:
    headers = await register_user(client, "skip_not_done")
    task = await _create_task(client, headers, repeat_type="daily")

    await client.post(f"/api/v1/tasks/{task['id']}/skip", headers=headers)

    response = await client.get("/api/v1/tasks", params={"status": "completed"}, headers=headers)
    assert response.json()["items"] == []


async def test_skip_non_recurring_task_rejected(client: AsyncClient) -> None:
    headers = await register_user(client, "skip_oneoff")
    task = await _create_task(client, headers, repeat_type="none")

    response = await client.post(f"/api/v1/tasks/{task['id']}/skip", headers=headers)
    assert response.status_code == 422


async def test_skip_other_users_task_not_found(client: AsyncClient) -> None:
    owner_headers = await register_user(client, "skip_owner")
    other_headers = await register_user(client, "skip_intruder")
    task = await _create_task(client, owner_headers, repeat_type="daily")

    response = await client.post(f"/api/v1/tasks/{task['id']}/skip", headers=other_headers)
    assert response.status_code == 404
