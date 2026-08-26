from src.config.settings import settings


async def test_rate_limit_blocks_after_threshold_on_login(client):
    payload = {"email": "no-existe@example.com", "password": "wrong-password"}

    responses = [await client.post("/api/v1/auth/login", json=payload) for _ in range(settings.RATE_LIMIT_LOGIN_MAX)]
    assert all(r.status_code == 401 for r in responses)

    blocked = await client.post("/api/v1/auth/login", json=payload)
    assert blocked.status_code == 429


async def test_rate_limit_returns_429_with_clear_message(client):
    payload = {"email": "a@example.com", "password": "whatever-123"}
    for _ in range(settings.RATE_LIMIT_LOGIN_MAX):
        await client.post("/api/v1/auth/login", json=payload)

    response = await client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == 429
    assert "Demasiados intentos" in response.json()["detail"]


async def test_rate_limit_applies_generously_across_authenticated_api(client):
    """La red de seguridad general no debe activarse con uso normal de la API."""
    for _ in range(20):
        response = await client.get("/api/v1/products")
        assert response.status_code == 200


async def test_rate_limit_global_blocks_after_threshold(client):
    for _ in range(settings.RATE_LIMIT_GLOBAL_MAX):
        await client.get("/api/v1/products")

    response = await client.get("/api/v1/products")

    assert response.status_code == 429
    assert response.json()["error"] == "rate_limited"


async def test_health_check_is_never_rate_limited(client):
    for _ in range(settings.RATE_LIMIT_GLOBAL_MAX + 5):
        await client.get("/health/live")

    response = await client.get("/health/live")

    assert response.status_code != 429
