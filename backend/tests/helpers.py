from httpx import AsyncClient

DEFAULT_PASSWORD = "supersecret123"


async def register_user(client: AsyncClient, username: str = "testuser") -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/register", json={"username": username, "password": DEFAULT_PASSWORD}
    )
    assert response.status_code == 201, response.text
    token: str = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
