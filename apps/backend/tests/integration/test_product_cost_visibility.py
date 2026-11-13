from datetime import UTC, datetime

from src.infrastructure.database.models import UserModel
from src.presentation import dependencies


async def _as_cashier(db_session) -> None:
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()


async def _product_with_cost(client) -> dict:
    response = await client.post(
        "/api/v1/products",
        json={"name": "Aceite", "price": "18.00", "cost_price": "12.00", "stock": 4, "qr_code": "QR-ACEITE"},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_owner_sees_cost_price_everywhere(client):
    product = await _product_with_cost(client)

    assert product["cost_price"] == "12.00"
    assert (await client.get(f"/api/v1/products/{product['id']}")).json()["cost_price"] == "12.00"
    assert (await client.get("/api/v1/products")).json()["items"][0]["cost_price"] == "12.00"
    assert (await client.get("/api/v1/products/qr/QR-ACEITE")).json()["cost_price"] == "12.00"
    pull = await client.post(
        "/api/v1/sync/pull",
        json={"device_id": "owner-device", "since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )
    payload = next(c["payload"] for c in pull.json()["changes"] if c["entity"] == "product")
    assert payload["cost_price"] == "12.00"


async def test_cashier_never_receives_cost_price(client, db_session):
    product = await _product_with_cost(client)
    await client.patch(f"/api/v1/products/{product['id']}", json={"min_stock": 10})
    await _as_cashier(db_session)

    detail = await client.get(f"/api/v1/products/{product['id']}")
    assert detail.status_code == 200
    assert detail.json()["cost_price"] is None
    listed = (await client.get("/api/v1/products")).json()["items"][0]
    assert listed["cost_price"] is None
    assert (await client.get("/api/v1/products/qr/QR-ACEITE")).json()["cost_price"] is None
    low = (await client.get("/api/v1/products/low-stock")).json()
    assert low and all(item["cost_price"] is None for item in low)
    pull = await client.post(
        "/api/v1/sync/pull",
        json={"device_id": "cashier-device", "since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )
    assert pull.status_code == 200
    payload = next(c["payload"] for c in pull.json()["changes"] if c["entity"] == "product")
    assert payload["cost_price"] is None
    # Lo demas sigue llegando igual.
    assert detail.json()["price"] == "18.00"
    assert payload["price"] == "18.00"
