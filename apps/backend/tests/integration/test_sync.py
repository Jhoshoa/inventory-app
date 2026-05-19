from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select

from src.infrastructure.database.models.stock_movement_model import StockMovementModel
from src.infrastructure.database.models.store_model import StoreModel
from src.main import app
from src.presentation import dependencies


def _change(
    *,
    client_change_id: str,
    entity: str,
    operation: str,
    entity_id: str,
    payload: dict,
) -> dict:
    return {
        "client_change_id": client_change_id,
        "entity": entity,
        "operation": operation,
        "entity_id": entity_id,
        "client_created_at": datetime.now(UTC).isoformat(),
        "payload": payload,
    }


async def test_sync_push_product_upsert_returns_result(client):
    product_id = str(uuid4())

    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "device-a",
            "changes": [
                _change(
                    client_change_id="product-upsert-1",
                    entity="product",
                    operation="upsert",
                    entity_id=product_id,
                    payload={"name": "Arroz", "price": "12.50", "stock": 10},
                )
            ],
        },
    )

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["status"] == "accepted"
    assert result["entity_id"] == product_id

    pull_response = await client.post(
        "/api/v1/sync/pull",
        json={"device_id": "device-a", "since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )
    assert pull_response.status_code == 200
    assert any(
        change["entity"] == "product" and change["entity_id"] == product_id
        for change in pull_response.json()["changes"]
    )


async def test_sync_push_sale_create_is_idempotent_and_reduces_stock_once(client, db_session):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "Aceite", "price": "18.00", "stock": 5},
    )
    product_id = product_response.json()["id"]
    sale_id = str(uuid4())
    payload = {
        "payment_method": "efectivo",
        "items": [{"product_id": product_id, "quantity": 2}],
    }
    body = {
        "device_id": "device-sale",
        "changes": [
            _change(
                client_change_id="sale-create-1",
                entity="sale",
                operation="create",
                entity_id=sale_id,
                payload=payload,
            )
        ],
    }

    first_response = await client.post("/api/v1/sync/push", json=body)
    second_response = await client.post("/api/v1/sync/push", json=body)

    assert first_response.status_code == 200
    assert first_response.json()["results"][0]["status"] == "accepted"
    assert second_response.status_code == 200
    assert second_response.json()["results"][0]["status"] == "duplicate"

    product_after_sync = await client.get(f"/api/v1/products/{product_id}")
    assert product_after_sync.json()["stock"] == 3

    sales_response = await client.get("/api/v1/sales")
    assert len(sales_response.json()) == 1

    movement_result = await db_session.execute(
        select(StockMovementModel).where(StockMovementModel.product_id == UUID(product_id))
    )
    movements = movement_result.scalars().all()
    assert len(movements) == 1
    assert movements[0].quantity_delta == -2


async def test_sync_push_rejects_cross_store_product(client, db_session):
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.flush()

    product_response = await client.post(
        "/api/v1/products",
        json={"name": "Cafe", "price": "20.00", "stock": 4},
    )
    product_id = product_response.json()["id"]

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "device-other",
            "changes": [
                _change(
                    client_change_id="cross-store-1",
                    entity="product",
                    operation="upsert",
                    entity_id=product_id,
                    payload={"name": "Cafe editado", "price": "22.00", "stock": 9},
                )
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["results"][0]["status"] == "conflict"


async def test_sync_pull_includes_products_sales_and_stock_movements(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "Leche", "price": "9.00", "stock": 5},
    )
    product_id = product_response.json()["id"]

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 1}]},
    )
    assert sale_response.status_code == 201

    pull_response = await client.post(
        "/api/v1/sync/pull",
        json={"device_id": "device-pull", "since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )

    assert pull_response.status_code == 200
    entities = {change["entity"] for change in pull_response.json()["changes"]}
    assert {"product", "sale", "stock_movement"}.issubset(entities)


async def test_sync_push_batch_continues_after_invalid_change(client):
    product_id = str(uuid4())

    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "device-batch",
            "changes": [
                _change(
                    client_change_id="invalid-product",
                    entity="product",
                    operation="upsert",
                    entity_id=str(uuid4()),
                    payload={"price": "8.50", "stock": 2},
                ),
                _change(
                    client_change_id="valid-product",
                    entity="product",
                    operation="upsert",
                    entity_id=product_id,
                    payload={"name": "Fideo", "price": "8.50", "stock": 2},
                ),
            ],
        },
    )

    assert response.status_code == 200
    statuses = {result["client_change_id"]: result["status"] for result in response.json()["results"]}
    assert statuses["invalid-product"] == "rejected"
    assert statuses["valid-product"] == "accepted"


async def test_sync_push_manual_stock_adjustment_records_movement(client, db_session):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "Azucar", "price": "10.00", "stock": 3},
    )
    product_id = product_response.json()["id"]

    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "device-stock",
            "changes": [
                _change(
                    client_change_id="stock-adjust-1",
                    entity="stock_movement",
                    operation="create",
                    entity_id=product_id,
                    payload={
                        "product_id": product_id,
                        "quantity_delta": 4,
                        "movement_type": "manual_adjustment",
                        "reason": "conteo offline",
                    },
                )
            ],
        },
    )

    assert response.status_code == 200
    assert response.json()["results"][0]["status"] == "accepted"

    product_after_adjustment = await client.get(f"/api/v1/products/{product_id}")
    assert product_after_adjustment.json()["stock"] == 7

    movement_result = await db_session.execute(
        select(StockMovementModel).where(StockMovementModel.product_id == UUID(product_id))
    )
    movement = movement_result.scalar_one()
    assert movement.movement_type == "manual_adjustment"
    assert movement.quantity_delta == 4
    assert movement.stock_after == 7


async def test_sync_pull_does_not_leak_other_store_data(client, db_session):
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.flush()

    await client.post("/api/v1/products", json={"name": "Arroz", "price": "12.00", "stock": 1})

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user
    await client.post("/api/v1/products", json={"name": "Cafe", "price": "20.00", "stock": 1})

    pull_response = await client.post(
        "/api/v1/sync/pull",
        json={"device_id": "device-other-pull", "since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )

    assert pull_response.status_code == 200
    names = {
        change["payload"].get("name")
        for change in pull_response.json()["changes"]
        if change["entity"] == "product"
    }
    assert names == {"Cafe"}
