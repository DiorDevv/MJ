from httpx import AsyncClient


async def test_request_id_header_generated(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    rid = resp.headers.get("X-Request-ID")
    assert rid and len(rid) >= 8


async def test_request_id_header_echoed(client: AsyncClient) -> None:
    resp = await client.get("/health", headers={"X-Request-ID": "abc123def456"})
    assert resp.headers.get("X-Request-ID") == "abc123def456"
