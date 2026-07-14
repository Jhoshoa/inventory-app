import csv
from io import StringIO

from src.infrastructure.database.models import UserModel
from src.presentation import dependencies


def _csv_rows(response):
    return list(csv.DictReader(StringIO(response.text)))


async def test_owner_creates_cash_movement_for_open_day(client):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "expense", "amount": "25.00", "note": "Bolsas"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["business_day_id"] == open_response.json()["id"]
    assert data["movement_type"] == "expense"
    assert data["direction"] == "out"
    assert data["amount"] == "25.00"
    assert data["note"] == "Bolsas"


async def test_cashier_cannot_create_or_list_cash_movements(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    create_response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "cash_in", "amount": "10.00"},
    )
    list_response = await client.get("/api/v1/cash-movements")

    assert create_response.status_code == 403
    assert list_response.status_code == 403


async def test_cashier_cannot_export_cash_movements(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    response = await client.get("/api/v1/exports/cash-movements.csv")

    assert response.status_code == 403


async def test_cannot_create_cash_movement_without_open_day(client):
    response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "cash_in", "amount": "10.00"},
    )

    assert response.status_code == 409


async def test_cash_movement_rejects_invalid_amount_and_type(client):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    zero_response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "cash_in", "amount": "0.00"},
    )
    invalid_type_response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "invalid", "amount": "10.00"},
    )
    too_many_decimals_response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "cash_in", "amount": "10.999"},
    )

    assert zero_response.status_code == 422
    assert invalid_type_response.status_code == 422
    assert too_many_decimals_response.status_code == 422


async def test_closing_preview_and_close_include_cash_movements(client):
    product_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 10})
    assert product_response.status_code == 201
    open_response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "100.00"})
    assert open_response.status_code == 201

    sale_response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 3}],
            "payment_method": "efectivo",
        },
    )
    assert sale_response.status_code == 201
    await client.post("/api/v1/cash-movements", json={"movement_type": "cash_in", "amount": "20.00"})
    await client.post("/api/v1/cash-movements", json={"movement_type": "expense", "amount": "15.00"})

    preview_response = await client.get("/api/v1/store-day/current/closing-preview")
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["cash_movements_in_total"] == "20.00"
    assert preview["cash_movements_out_total"] == "15.00"
    assert preview["cash_movements_count"] == 2
    assert preview["expected_cash_amount"] == "135.00"

    close_response = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "130.00"})
    assert close_response.status_code == 200
    closed = close_response.json()
    assert closed["expected_cash_amount"] == "135.00"
    assert closed["cash_difference_amount"] == "-5.00"
    assert closed["closing_cash_movements_in_total"] == "20.00"
    assert closed["closing_cash_movements_out_total"] == "15.00"
    assert closed["closing_cash_movements_count"] == 2


async def test_voided_cash_movement_excluded_from_closing_preview(client):
    open_response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "100.00"})
    assert open_response.status_code == 201
    movement_response = await client.post(
        "/api/v1/cash-movements",
        json={"movement_type": "cash_in", "amount": "20.00"},
    )
    assert movement_response.status_code == 201

    void_response = await client.post(
        f"/api/v1/cash-movements/{movement_response.json()['id']}/void",
        json={"void_reason": "Duplicado"},
    )
    assert void_response.status_code == 200

    preview_response = await client.get("/api/v1/store-day/current/closing-preview")
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["cash_movements_in_total"] == "0"
    assert preview["cash_movements_count"] == 0
    assert preview["expected_cash_amount"] == "100.00"


async def test_export_cash_movements_csv_returns_expected_rows(client):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201
    await client.post("/api/v1/cash-movements", json={"movement_type": "cash_in", "amount": "20.00", "note": "Cambio"})
    await client.post("/api/v1/cash-movements", json={"movement_type": "expense", "amount": "15.00", "note": "Bolsas"})

    response = await client.get("/api/v1/exports/cash-movements.csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.text.splitlines()[0] == (
        "id,occurred_at,business_day_id,movement_type,direction,amount,note,"
        "created_by_user_id,voided_at,voided_by_user_id,void_reason"
    )
    rows = _csv_rows(response)
    assert {row["movement_type"] for row in rows} == {"cash_in", "expense"}
    assert {row["direction"] for row in rows} == {"in", "out"}


async def test_export_cash_movements_csv_filters_by_type(client):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201
    await client.post("/api/v1/cash-movements", json={"movement_type": "cash_in", "amount": "20.00"})
    await client.post("/api/v1/cash-movements", json={"movement_type": "expense", "amount": "15.00"})

    response = await client.get("/api/v1/exports/cash-movements.csv", params={"type": "expense"})

    assert response.status_code == 200
    rows = _csv_rows(response)
    assert [row["movement_type"] for row in rows] == ["expense"]
