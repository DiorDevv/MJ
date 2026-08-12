import asyncio

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


async def test_logout_revokes_refresh_token_server_side(client: AsyncClient) -> None:
    await register_user(client, "ivan")
    stolen_cookie = client.cookies.get("refresh_token")
    assert stolen_cookie is not None

    logout_response = await client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    # A copy of the token taken before logout must not work afterwards, even
    # though the browser's own cookie jar has already forgotten it.
    client.cookies.set("refresh_token", stolen_cookie)
    replay = await client.post("/api/v1/auth/refresh")
    assert replay.status_code == 401


async def test_refresh_is_not_single_use(client: AsyncClient) -> None:
    # Several requests can 401 at once when the access token expires, each firing
    # its own concurrent /refresh call — so the same refresh token must keep
    # working across repeated calls instead of being invalidated after one use.
    await register_user(client, "judy")

    first_refresh = await client.post("/api/v1/auth/refresh")
    assert first_refresh.status_code == 200

    second_refresh = await client.post("/api/v1/auth/refresh")
    assert second_refresh.status_code == 200


async def test_concurrent_refreshes_all_succeed(client: AsyncClient) -> None:
    # Regression test: authorizedRequest.ts fires one /refresh per failed request,
    # so several can be in flight at once when the access token expires. None of
    # them should fail the others out by invalidating the cookie they all share.
    await register_user(client, "mallory")

    responses = await asyncio.gather(*(client.post("/api/v1/auth/refresh") for _ in range(5)))

    assert all(response.status_code == 200 for response in responses)


async def test_logout_all_revokes_every_session(client: AsyncClient) -> None:
    headers = await register_user(client, "kevin")
    other_cookie = client.cookies.get("refresh_token")
    assert other_cookie is not None

    response = await client.post("/api/v1/auth/logout-all", headers=headers)
    assert response.status_code == 204

    client.cookies.set("refresh_token", other_cookie)
    replay = await client.post("/api/v1/auth/refresh")
    assert replay.status_code == 401


async def test_login_rate_limited_after_repeated_failures(client: AsyncClient) -> None:
    await register_user(client, "liam")
    for _ in range(5):
        response = await client.post(
            "/api/v1/auth/login", json={"username": "liam", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    limited = await client.post(
        "/api/v1/auth/login", json={"username": "liam", "password": "wrongpassword"}
    )
    assert limited.status_code == 429
