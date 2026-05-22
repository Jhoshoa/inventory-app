from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select

from src.infrastructure.database.models import UserModel
from src.infrastructure.database.models.stock_movement_model import StockMovementModel
from src.infrastructure.database.models.store_model import StoreModel
from src.presentation import dependencies
from src.main import app


async def _open_store_day(client):
    response = await client.post("/api/v1/store-day/open")
    assert response.status_code == 201
    return response.json()


async def test_products_crud_and_stock_adjustment(client):
    create_response = await client.post(
        "/api/v1/products",
        json={"name": "arroz 1kg", "price": "12.50", "stock": 10, "category": "Abarrotes"},
    )
    assert create_response.status_code == 201
    product = create_response.json()
    assert product["name"] == "Arroz 1kg"
    assert product["stock"] == 10

    product_id = product["id"]
    list_response = await client.get("/api/v1/products")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert len(list_response.json()["items"]) == 1

    update_response = await client.patch(
        f"/api/v1/products/{product_id}",
        json={"name": "arroz premium", "price": "13.00", "min_stock": 3},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Arroz Premium"

    stock_response = await client.patch(
        f"/api/v1/products/{product_id}/stock",
        json={"quantity": -2, "reason": "venta manual"},
    )
    assert stock_response.status_code == 200
    assert stock_response.json()["stock"] == 8

    delete_response = await client.delete(f"/api/v1/products/{product_id}")
    assert delete_response.status_code == 204

    missing_response = await client.get(f"/api/v1/products/{product_id}")
    assert missing_response.status_code == 404


async def test_sales_create_list_and_get_reduce_stock(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "aceite", "price": "18.00", "stock": 5},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 2}], "payment_method": "qr"},
    )
    assert sale_response.status_code == 201
    sale = sale_response.json()
    assert sale["total"] in ("36.00", 36.0, "36")
    assert sale["items"][0]["product_name"] == "Aceite"

    product_after_sale = await client.get(f"/api/v1/products/{product_id}")
    assert product_after_sale.json()["stock"] == 3

    list_response = await client.get("/api/v1/sales")
    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1

    get_response = await client.get(f"/api/v1/sales/{sale['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == sale["id"]


async def test_sale_and_manual_adjustment_create_stock_movements(client, db_session):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "azucar", "price": "10.00", "stock": 6},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 2}], "payment_method": "efectivo"},
    )
    assert sale_response.status_code == 201

    adjustment_response = await client.patch(
        f"/api/v1/products/{product_id}/stock",
        json={"quantity": 3, "reason": "reposicion"},
    )
    assert adjustment_response.status_code == 200
    assert adjustment_response.json()["stock"] == 7

    result = await db_session.execute(
        select(StockMovementModel)
        .where(StockMovementModel.product_id == UUID(product_id))
        .order_by(StockMovementModel.created_at.asc())
    )
    movements = result.scalars().all()
    movements_by_type = {m.movement_type: m for m in movements}
    assert movements_by_type["sale"].quantity_delta == -2
    assert movements_by_type["sale"].stock_after == 4
    assert movements_by_type["manual_adjustment"].quantity_delta == 3
    assert movements_by_type["manual_adjustment"].stock_after == 7


async def test_failed_sale_does_not_create_partial_sale_or_stock_movement(client, db_session):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "leche evaporada", "price": "9.00", "stock": 1},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 2}]},
    )
    assert sale_response.status_code == 409

    sales_response = await client.get("/api/v1/sales")
    assert sales_response.status_code == 200
    assert sales_response.json()["items"] == []

    product_after_failure = await client.get(f"/api/v1/products/{product_id}")
    assert product_after_failure.json()["stock"] == 1

    result = await db_session.execute(select(StockMovementModel))
    assert result.scalars().all() == []


async def test_sale_rejects_invalid_payment_method(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "galleta", "price": "5.00", "stock": 2},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 1}], "payment_method": "crypto"},
    )

    assert response.status_code == 422


async def test_sale_rejects_duplicate_products(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "yerba", "price": "12.00", "stock": 5},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [
                {"product_id": product_id, "quantity": 1},
                {"product_id": product_id, "quantity": 1},
            ],
            "payment_method": "efectivo",
        },
    )

    assert response.status_code == 400


async def test_product_and_sale_access_is_isolated_by_store(client, db_session):
    other_store_id = uuid4()
    other_user_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    db_session.add(
        UserModel(
            id=other_user_id,
            email="other@local.dev",
            store_id=other_store_id,
            role="owner",
            is_active=True,
        )
    )
    await db_session.flush()

    product_response = await client.post(
        "/api/v1/products",
        json={"name": "cafe", "price": "20.00", "stock": 3},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 1}]},
    )
    sale_id = sale_response.json()["id"]

    async def other_store_user():
        return {
            "id": other_user_id,
            "email": "other@local.dev",
            "store_id": other_store_id,
        }

    app.dependency_overrides[dependencies.get_current_user] = other_store_user
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    assert (await client.get(f"/api/v1/products/{product_id}")).status_code == 404
    assert (await client.patch(f"/api/v1/products/{product_id}/stock", json={"quantity": 1})).status_code == 404
    assert (await client.delete(f"/api/v1/products/{product_id}")).status_code == 404
    assert (await client.get(f"/api/v1/sales/{sale_id}")).status_code == 404
    assert (
        await client.post(
            "/api/v1/sales",
            json={"items": [{"product_id": product_id, "quantity": 1}]},
        )
    ).status_code == 404


async def test_sale_rejects_insufficient_stock(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "leche", "price": "9.00", "stock": 1},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 2}]},
    )
    assert sale_response.status_code == 409
    data = sale_response.json()
    assert data["error"] == "stock_conflict"
    assert data["stock_conflicts"] == [
        {
            "product_id": product_id,
            "product_name": "Leche",
            "available_stock": 1,
            "requested_quantity": 2,
        }
    ]


async def test_sale_rejects_stale_cart_after_concurrent_stock_change(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "aceite", "price": "18.00", "stock": 10},
    )
    product_id = product_response.json()["id"]
    await _open_store_day(client)

    first_sale = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 1}]},
    )
    assert first_sale.status_code == 201

    stale_cart_sale = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 10}]},
    )

    assert stale_cart_sale.status_code == 409
    data = stale_cart_sale.json()
    assert data["error"] == "stock_conflict"
    assert data["stock_conflicts"][0]["available_stock"] == 9
    assert data["stock_conflicts"][0]["requested_quantity"] == 10

    sales_response = await client.get("/api/v1/sales")
    assert len(sales_response.json()["items"]) == 1

    product_after_failure = await client.get(f"/api/v1/products/{product_id}")
    assert product_after_failure.json()["stock"] == 9


async def test_store_get_and_update(client):
    get_response = await client.get("/api/v1/store")
    assert get_response.status_code == 200
    assert get_response.json()["name"] == "Dev Store"

    update_response = await client.patch(
        "/api/v1/store",
        json={"name": "Mi Tienda", "address": "Calle 1", "phone": "77777777"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Mi Tienda"


async def test_exchange_rates_upsert_and_list(client):
    create_response = await client.post(
        "/api/v1/exchange-rates",
        json={"date": "2026-05-12", "source": "bcb", "buy_price": "6.96", "sell_price": "6.96"},
    )
    assert create_response.status_code == 201

    list_response = await client.get("/api/v1/exchange-rates")
    assert list_response.status_code == 200
    assert list_response.json()[0]["source"] == "bcb"


async def test_photos_upload_and_ocr_fallback(client):
    upload_response = await client.post(
        "/api/v1/photos/upload",
        files={"file": ("product.txt", b"arroz 12bs 10", "text/plain")},
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["size"] == 13

    ocr_response = await client.post(
        "/api/v1/photos/ocr",
        files={"file": ("product.txt", b"arroz 12bs 10", "text/plain")},
    )
    assert ocr_response.status_code == 200
    assert ocr_response.json()["status"] in {"processed", "queued"}


async def test_sync_push_and_pull_products(client):
    product_id = str(uuid4())
    push_response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "test-device",
            "changes": [
                {
                    "client_change_id": "change-product-1",
                    "entity": "product",
                    "operation": "upsert",
                    "entity_id": product_id,
                    "client_created_at": datetime.now(UTC).isoformat(),
                    "payload": {"name": "Fideo", "price": "8.50", "stock": 7},
                }
            ]
        },
    )
    assert push_response.status_code == 200
    assert push_response.json()["results"][0]["status"] == "accepted"

    pull_response = await client.post(
        "/api/v1/sync/pull",
        json={"device_id": "test-device", "since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )
    assert pull_response.status_code == 200
    changes = pull_response.json()["changes"]
    assert any(change["entity"] == "product" and change["entity_id"] == product_id for change in changes)
