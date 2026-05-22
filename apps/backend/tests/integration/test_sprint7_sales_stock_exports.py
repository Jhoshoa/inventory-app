import csv
from datetime import UTC, datetime, timedelta
from io import StringIO
from uuid import uuid4

from src.infrastructure.database.models import StoreModel, UserModel
from src.main import app
from src.presentation import dependencies


async def _create_product_and_sale(client, name: str = "Arroz"):
    product_response = await client.post("/api/v1/products", json={"name": name, "price": "10.00", "stock": 10})
    assert product_response.status_code == 201
    product = product_response.json()
    current_store_day = await client.get("/api/v1/store-day/current")
    assert current_store_day.status_code == 200
    if current_store_day.json()["status"] != "open":
        open_response = await client.post("/api/v1/store-day/open")
        assert open_response.status_code == 201
    sale_response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product["id"], "quantity": 3}], "payment_method": "efectivo"},
    )
    assert sale_response.status_code == 201
    return product, sale_response.json()


def _csv_rows(response):
    return list(csv.DictReader(StringIO(response.text)))


async def test_void_sale_returns_stock_and_marks_sale_voided(client):
    product, sale = await _create_product_and_sale(client)

    response = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "cliente cancelo"})

    assert response.status_code == 200
    assert response.json()["status"] == "voided"
    assert response.json()["void_reason"] == "cliente cancelo"
    product_response = await client.get(f"/api/v1/products/{product['id']}")
    assert product_response.json()["stock"] == 10


async def test_void_sale_creates_sale_void_stock_movements(client):
    product, sale = await _create_product_and_sale(client)

    response = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "error de caja"})
    assert response.status_code == 200

    movements = await client.get(f"/api/v1/products/{product['id']}/stock-movements")
    assert movements.status_code == 200
    by_type = {movement["movement_type"]: movement for movement in movements.json()["items"]}
    assert by_type["sale"]["quantity_delta"] == -3
    assert by_type["sale_void"]["quantity_delta"] == 3
    assert by_type["sale_void"]["reason"] == "error de caja"


async def test_void_sale_is_rejected_when_already_voided(client):
    _product, sale = await _create_product_and_sale(client)

    first = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "duplicado"})
    second = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "duplicado"})

    assert first.status_code == 200
    assert second.status_code == 409


async def test_cashier_cannot_void_sale(client, db_session):
    _product, sale = await _create_product_and_sale(client)
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    response = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "no permitido"})

    assert response.status_code == 403


async def test_void_sale_does_not_cross_store(client, db_session):
    _product, sale = await _create_product_and_sale(client)
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.commit()

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    response = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "otra tienda"})

    assert response.status_code == 404


async def test_product_stock_movements_returns_product_history(client):
    product, sale = await _create_product_and_sale(client)
    await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "historial"})

    response = await client.get(f"/api/v1/products/{product['id']}/stock-movements")

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert {item["movement_type"] for item in response.json()["items"]} == {"sale", "sale_void"}


async def test_product_stock_movements_is_store_scoped(client, db_session):
    product, _sale = await _create_product_and_sale(client)
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.commit()

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    response = await client.get(f"/api/v1/products/{product['id']}/stock-movements")

    assert response.status_code == 404


async def test_stock_movements_filters_by_type_and_range(client):
    _product, sale = await _create_product_and_sale(client)
    await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "filtro"})
    start = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    end = (datetime.now(UTC) + timedelta(days=1)).isoformat()

    response = await client.get("/api/v1/stock-movements", params={"type": "sale_void", "from": start, "to": end})

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["movement_type"] == "sale_void"


async def test_export_products_csv_returns_expected_columns(client):
    await client.post("/api/v1/products", json={"name": "Cafe", "price": "20.00", "stock": 4})

    response = await client.get("/api/v1/exports/products.csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.text.splitlines()[0] == "id,name,category,sku,unit,price,cost_price,stock,min_stock,qr_code,is_active"
    assert _csv_rows(response)[0]["name"] == "Cafe"


async def test_export_sales_csv_includes_voided_and_completed(client):
    _product_a, sale_a = await _create_product_and_sale(client, "Azucar")
    await client.post(f"/api/v1/sales/{sale_a['id']}/void", json={"reason": "export"})
    await _create_product_and_sale(client, "Leche")

    response = await client.get("/api/v1/exports/sales.csv")

    assert response.status_code == 200
    rows = _csv_rows(response)
    assert {row["status"] for row in rows} == {"completed", "voided"}


async def test_export_stock_movements_csv_returns_expected_rows(client):
    _product, sale = await _create_product_and_sale(client)
    await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "export movements"})

    response = await client.get("/api/v1/exports/stock-movements.csv")

    assert response.status_code == 200
    rows = _csv_rows(response)
    assert {row["movement_type"] for row in rows} == {"sale", "sale_void"}


async def test_cashier_cannot_export_csv(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    response = await client.get("/api/v1/exports/products.csv")

    assert response.status_code == 403


async def test_exports_do_not_leak_other_store(client, db_session):
    await client.post("/api/v1/products", json={"name": "Local", "price": "10.00", "stock": 1})
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    await db_session.commit()

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user
    await client.post("/api/v1/products", json={"name": "Other", "price": "10.00", "stock": 1})
    app.dependency_overrides.pop(dependencies.get_current_user)

    response = await client.get("/api/v1/exports/products.csv")

    assert response.status_code == 200
    rows = _csv_rows(response)
    assert [row["name"] for row in rows] == ["Local"]


async def test_export_sales_rejects_range_over_90_days(client):
    start = (datetime.now(UTC) - timedelta(days=91)).isoformat()
    end = datetime.now(UTC).isoformat()

    response = await client.get("/api/v1/exports/sales.csv", params={"from": start, "to": end})

    assert response.status_code == 400


async def test_stock_movements_rejects_invalid_date_range(client):
    start = datetime.now(UTC).isoformat()
    end = (datetime.now(UTC) - timedelta(days=1)).isoformat()

    response = await client.get("/api/v1/stock-movements", params={"from": start, "to": end})

    assert response.status_code == 400
