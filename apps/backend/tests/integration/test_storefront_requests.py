from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    storefront_request_rate_limiter,
)


async def _enable_storefront(client, **overrides) -> dict:
    payload = {"storefront_slug": "ferreteria-lopez", "storefront_enabled": True, **overrides}
    response = await client.patch("/api/v1/store", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


async def _create_product(client, **overrides) -> str:
    payload = {"name": "Martillo", "price": "45.00", "stock": 5, **overrides}
    response = await client.post("/api/v1/products", json=payload)
    assert response.status_code == 201
    return response.json()["id"]


async def test_create_request_from_public_catalog(client):
    await _enable_storefront(client)
    product_id = await _create_product(client)

    response = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122", "note": "Lo necesito manana"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["product_id"] == product_id
    assert body["product_name"] == "Martillo"
    assert body["customer_name"] == "Juan Perez"
    assert body["status"] == "pending"


async def test_create_request_rejects_invalid_phone(client):
    await _enable_storefront(client)
    product_id = await _create_product(client)

    response = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "abc"},
    )

    assert response.status_code == 422


async def test_create_request_for_unknown_product_returns_404(client):
    await _enable_storefront(client)

    response = await client.post(
        "/api/v1/public/storefront/ferreteria-lopez/products/00000000-0000-0000-0000-000000000000/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )

    assert response.status_code == 404


async def test_create_request_disabled_storefront_returns_404(client):
    product_id = await _create_product(client)

    response = await client.post(
        f"/api/v1/public/storefront/no-existe/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )

    assert response.status_code == 404


async def test_create_request_rate_limited(client):
    await _enable_storefront(client)
    product_id = await _create_product(client)
    storefront_request_rate_limiter.reset()

    for _ in range(5):
        ok = await client.post(
            f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
            json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
        )
        assert ok.status_code == 201

    limited = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )
    assert limited.status_code == 429


async def test_owner_can_list_and_update_requests(client):
    await _enable_storefront(client)
    product_id = await _create_product(client)
    created = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )
    request_id = created.json()["id"]

    listed = await client.get("/api/v1/storefront-requests")
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    assert body["pending_count"] == 1
    assert body["items"][0]["id"] == request_id

    updated = await client.patch(
        f"/api/v1/storefront-requests/{request_id}/status", json={"status": "contacted"}
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "contacted"

    listed_again = await client.get("/api/v1/storefront-requests")
    assert listed_again.json()["pending_count"] == 0


async def test_update_status_rejects_unknown_request(client):
    response = await client.patch(
        "/api/v1/storefront-requests/00000000-0000-0000-0000-000000000000/status",
        json={"status": "contacted"},
    )
    assert response.status_code == 404


async def test_update_status_rejects_invalid_value(client):
    await _enable_storefront(client)
    product_id = await _create_product(client)
    created = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )
    request_id = created.json()["id"]

    response = await client.patch(
        f"/api/v1/storefront-requests/{request_id}/status", json={"status": "no-existe"}
    )
    assert response.status_code == 422


async def test_requests_are_scoped_to_store(client, db_session):
    from uuid import uuid4

    from src.infrastructure.database.models import StoreModel

    await _enable_storefront(client)
    product_id = await _create_product(client)
    await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}/requests",
        json={"customer_name": "Juan Perez", "customer_phone": "70011122"},
    )

    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Otra tienda"))
    await db_session.commit()

    from src.main import app
    from src.presentation import dependencies

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user
    try:
        response = await client.get("/api/v1/storefront-requests")
    finally:
        app.dependency_overrides[dependencies.get_current_user] = lambda: {
            "id": dependencies.DEV_USER_ID,
            "email": "dev@local.dev",
            "store_id": dependencies.DEV_STORE_ID,
        }

    assert response.status_code == 200
    assert response.json()["total"] == 0
