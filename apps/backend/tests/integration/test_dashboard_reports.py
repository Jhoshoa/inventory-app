from datetime import UTC, datetime, timedelta
from urllib.parse import quote
from uuid import uuid4

from src.infrastructure.database.models.store_model import StoreModel
from src.main import app
from src.presentation import dependencies


async def _open_store_day(client):
    response = await client.post("/api/v1/store-day/open")
    assert response.status_code == 201
    return response.json()


async def test_dashboard_summary_returns_store_metrics(client):
    low_product = await client.post(
        "/api/v1/products",
        json={"name": "Bajo", "price": "10.00", "stock": 1, "min_stock": 5},
    )
    normal_product = await client.post(
        "/api/v1/products",
        json={"name": "Normal", "price": "20.00", "stock": 10, "min_stock": 2},
    )
    await _open_store_day(client)

    await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": normal_product.json()["id"], "quantity": 2}], "payment_method": "efectivo"},
    )

    response = await client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["sales_today_total"] in ("40.00", "40.0", 40.0)
    assert data["sales_today_count"] == 1
    assert data["products_total"] == 2
    assert data["low_stock_count"] == 1
    assert data["out_of_stock_count"] == 0
    assert data["low_stock_products"][0]["id"] == low_product.json()["id"]
    assert len(data["latest_sales"]) == 1


async def test_dashboard_month_scope_starts_at_first_business_date(client):
    product = await client.post(
        "/api/v1/products",
        json={"name": "Normal", "price": "20.00", "stock": 10, "min_stock": 2},
    )
    opened_day = await _open_store_day(client)

    await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product.json()["id"], "quantity": 1}], "payment_method": "efectivo"},
    )

    response = await client.get("/api/v1/dashboard/summary?scope=month")

    assert response.status_code == 200
    data = response.json()
    assert data["scope"] == "month"
    assert data["from_date"] == opened_day["first_business_date"]
    assert data["sales_today_count"] == 1


async def test_dashboard_summary_does_not_leak_other_store(client, db_session):
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.flush()

    await client.post("/api/v1/products", json={"name": "Local", "price": "10.00", "stock": 1, "min_stock": 5})

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user
    await client.post("/api/v1/products", json={"name": "Other", "price": "10.00", "stock": 10, "min_stock": 1})

    response = await client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["products_total"] == 1
    assert data["low_stock_count"] == 0


async def test_sales_report_by_range_groups_and_top_products(client):
    arroz = await client.post("/api/v1/products", json={"name": "Arroz", "price": "12.50", "stock": 20})
    aceite = await client.post("/api/v1/products", json={"name": "Aceite", "price": "18.00", "stock": 20})
    await _open_store_day(client)

    await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": arroz.json()["id"], "quantity": 2}], "payment_method": "efectivo"},
    )
    await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": arroz.json()["id"], "quantity": 1}, {"product_id": aceite.json()["id"], "quantity": 1}], "payment_method": "qr"},
    )

    start = quote((datetime.now(UTC) - timedelta(days=1)).isoformat())
    end = quote((datetime.now(UTC) + timedelta(days=1)).isoformat())
    response = await client.get(f"/api/v1/reports/sales?from={start}&to={end}")

    assert response.status_code == 200
    data = response.json()
    assert data["sales_count"] == 2
    assert data["items_count"] == 3
    assert data["total_sales"] in ("55.50", "55.5", 55.5)
    assert {item["payment_method"] for item in data["by_payment_method"]} == {"efectivo", "qr"}
    assert data["top_products"][0]["product_name"] == "Arroz"
    assert data["top_products"][0]["quantity"] == 3


async def test_sales_report_rejects_invalid_range(client):
    start = quote(datetime.now(UTC).isoformat())
    end = quote((datetime.now(UTC) - timedelta(days=1)).isoformat())
    response = await client.get(f"/api/v1/reports/sales?from={start}&to={end}")
    assert response.status_code == 400


async def test_sales_report_rejects_range_too_large(client):
    start = quote((datetime.now(UTC) - timedelta(days=91)).isoformat())
    end = quote(datetime.now(UTC).isoformat())
    response = await client.get(f"/api/v1/reports/sales?from={start}&to={end}")
    assert response.status_code == 400
