async def test_liveness_returns_ok_without_auth(client):
    response = await client.get("/health/live")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["app"] == "Inventory API"


async def test_readiness_returns_ready_when_database_available(client):
    response = await client.get("/health/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["checks"]["database"] == "ok"


async def test_readiness_does_not_require_auth(client):
    response = await client.get("/health/ready")

    assert response.status_code == 200
    assert "checks" in response.json()
