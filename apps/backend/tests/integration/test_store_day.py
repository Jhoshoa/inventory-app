from decimal import Decimal

from src.infrastructure.database.models import StoreBusinessDayModel, UserModel
from src.presentation import dependencies


async def test_get_current_store_day_returns_closed_when_no_open_day(client):
    response = await client.get("/api/v1/store-day/current")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "closed"
    assert data["opened_at"] is None
    assert data["timezone"] == "America/La_Paz"


async def test_owner_can_open_store_day(client, db_session):
    response = await client.post("/api/v1/store-day/open", json={"opening_note": "Apertura normal"})

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "open"
    assert data["opening_note"] == "Apertura normal"
    assert data["opened_by_user_id"] == str(dependencies.DEV_USER_ID)

    business_day = await db_session.get(StoreBusinessDayModel, data["id"])
    assert business_day.store_id == dependencies.DEV_STORE_ID


async def test_cashier_cannot_open_or_close_store_day(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    open_response = await client.post("/api/v1/store-day/open")
    close_response = await client.post("/api/v1/store-day/close")

    assert open_response.status_code == 403
    assert close_response.status_code == 403


async def test_cannot_open_second_store_day_when_one_is_open(client):
    first_response = await client.post("/api/v1/store-day/open")
    second_response = await client.post("/api/v1/store-day/open")

    assert first_response.status_code == 201
    assert second_response.status_code == 409


async def test_owner_can_close_open_store_day_with_sales_snapshot(client):
    product_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 3})
    assert product_response.status_code == 201
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    sale_response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 2}],
            "payment_method": "efectivo",
        },
    )
    assert sale_response.status_code == 201

    close_response = await client.post("/api/v1/store-day/close", json={"closing_note": "Cierre ok"})

    assert close_response.status_code == 200
    data = close_response.json()
    assert data["status"] == "closed"
    assert data["closing_note"] == "Cierre ok"
    assert data["sales_total"] == "20.00"
    assert data["sales_count"] == 1
    assert data["voided_sales_count"] == 0


async def test_cannot_close_without_open_store_day(client):
    response = await client.post("/api/v1/store-day/close")

    assert response.status_code == 409


async def test_create_sale_requires_open_store_day(client):
    product_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 3})
    assert product_response.status_code == 201

    sale_response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 1}],
            "payment_method": "efectivo",
        },
    )

    assert sale_response.status_code == 409
    assert sale_response.json()["detail"] == "La tienda esta cerrada. Un owner debe abrir la jornada para vender."


async def test_create_sale_assigns_business_day_fields(client):
    product_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 3})
    assert product_response.status_code == 201
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    sale_response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 1}],
            "payment_method": "efectivo",
        },
    )

    assert sale_response.status_code == 201
    data = sale_response.json()
    assert data["business_day_id"] == open_response.json()["id"]
    assert data["business_date"] == open_response.json()["business_date"]
    assert data["created_by_user_id"] == str(dependencies.DEV_USER_ID)
    assert Decimal(data["total"]) == Decimal("10.00")
