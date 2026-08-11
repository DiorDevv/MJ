from httpx import AsyncClient

from tests.helpers import DEFAULT_PASSWORD, register_user


async def test_register_success(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register", json={"username": "alice", "password": DEFAULT_PASSWORD}
    )
    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.cookies.get("refresh_token") is not None


async def test_register_duplicate_username_conflicts(client: AsyncClient) -> None:
    payload = {"username": "bob", "password": DEFAULT_PASSWORD}
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


async def test_register_short_password_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register", json={"username": "carol", "password": "short"}
    )
    assert response.status_code == 422


async def test_register_invalid_username_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register", json={"username": "in valid!", "password": DEFAULT_PASSWORD}
    )
    assert response.status_code == 422


async def test_login_success(client: AsyncClient) -> None:
    await register_user(client, "dave")
    response = await client.post(
        "/api/v1/auth/login", json={"username": "dave", "password": DEFAULT_PASSWORD}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_login_wrong_password_rejected(client: AsyncClient) -> None:
    await register_user(client, "erin")
    response = await client.post(
        "/api/v1/auth/login", json={"username": "erin", "password": "wrongpassword"}
    )
    assert response.status_code == 401


async def test_login_nonexistent_user_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/login", json={"username": "ghost", "password": "whatever123"}
    )
    assert response.status_code == 401


async def test_me_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_me_rejects_garbage_token(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not.a.real.token"}
    )
    assert response.status_code == 401


async def test_me_returns_current_user(client: AsyncClient) -> None:
    headers = await register_user(client, "frank")
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "frank"


async def test_refresh_issues_new_access_token(client: AsyncClient) -> None:
    await register_user(client, "grace")
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert "access_token" in response.json()


async def test_refresh_without_cookie_rejected(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


async def test_logout_clears_refresh_cookie(client: AsyncClient) -> None:
    await register_user(client, "heidi")
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    refresh_after = await client.post("/api/v1/auth/refresh")
    assert refresh_after.status_code == 401
