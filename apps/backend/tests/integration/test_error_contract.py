from uuid import uuid4


async def test_request_id_header_is_returned(client):
    response = await client.get("/health/live")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]


async def test_existing_request_id_is_preserved(client):
    response = await client.get("/health/live", headers={"X-Request-ID": "test-request-id"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "test-request-id"


async def test_application_error_includes_request_id(client):
    response = await client.get(f"/api/v1/products/{uuid4()}", headers={"X-Request-ID": "missing-product"})

    assert response.status_code == 404
    assert response.json()["error"] == "not_found"
    assert response.json()["request_id"] == "missing-product"
    assert response.headers["X-Request-ID"] == "missing-product"


async def test_validation_error_response_has_request_id_header(client):
    response = await client.get("/api/v1/products?limit=0", headers={"X-Request-ID": "bad-query"})

    assert response.status_code == 422
    assert response.headers["X-Request-ID"] == "bad-query"
