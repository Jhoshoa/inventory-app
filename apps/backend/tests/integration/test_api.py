from datetime import UTC, datetime
from uuid import uuid4


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
    assert len(list_response.json()) == 1

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
    assert len(list_response.json()) == 1

    get_response = await client.get(f"/api/v1/sales/{sale['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == sale["id"]


async def test_sale_rejects_insufficient_stock(client):
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "leche", "price": "9.00", "stock": 1},
    )
    product_id = product_response.json()["id"]

    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 2}]},
    )
    assert sale_response.status_code == 400


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
            "changes": [
                {
                    "entity": "product",
                    "operation": "upsert",
                    "data": {
                        "id": product_id,
                        "name": "Fideo",
                        "price": "8.50",
                        "stock": 7,
                    },
                }
            ]
        },
    )
    assert push_response.status_code == 200

    pull_response = await client.post(
        "/api/v1/sync/pull",
        json={"since": datetime(2020, 1, 1, tzinfo=UTC).isoformat()},
    )
    assert pull_response.status_code == 200
    updates = pull_response.json()["updates"]
    assert any(update["entity"] == "product" and update["id"] == product_id for update in updates)
