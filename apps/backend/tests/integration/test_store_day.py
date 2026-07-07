from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from src.infrastructure.database.models import (
    StoreBusinessDayEventModel,
    StoreBusinessDayModel,
    StoreModel,
    UserModel,
)
from src.presentation import dependencies


async def test_get_current_store_day_returns_closed_when_no_open_day(client):
    response = await client.get("/api/v1/store-day/current")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "closed"
    assert data["opened_at"] is None
    assert data["timezone"] == "America/La_Paz"


async def test_owner_can_open_store_day(client, db_session):
    response = await client.post(
        "/api/v1/store-day/open",
        json={"opening_note": "Apertura normal", "opening_cash_amount": "100.00"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "open"
    assert data["opening_note"] == "Apertura normal"
    assert data["opening_cash_amount"] == "100.00"
    assert data["opened_by_user_id"] == str(dependencies.DEV_USER_ID)

    business_day = await db_session.get(StoreBusinessDayModel, data["id"])
    assert business_day.store_id == dependencies.DEV_STORE_ID

    events_response = await client.get("/api/v1/store-day/current/events")
    assert events_response.status_code == 200
    events = events_response.json()
    assert [event["event_type"] for event in events] == ["open"]
    assert events[0]["note"] == "Apertura normal"


async def test_cashier_cannot_open_or_close_store_day(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    open_response = await client.post("/api/v1/store-day/open")
    close_response = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "0.00"})
    reopen_response = await client.post("/api/v1/store-day/reopen")
    preview_response = await client.get("/api/v1/store-day/current/closing-preview")
    current_report_response = await client.get("/api/v1/store-day/current/close-report")
    reports_response = await client.get("/api/v1/store-day/reports")

    assert open_response.status_code == 403
    assert close_response.status_code == 403
    assert reopen_response.status_code == 403
    assert preview_response.status_code == 403
    assert current_report_response.status_code == 403
    assert reports_response.status_code == 403


async def test_open_store_day_rejects_negative_opening_cash_amount(client):
    response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "-1.00"})

    assert response.status_code == 422


async def test_open_store_day_rejects_opening_cash_with_more_than_two_decimals(client):
    response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "10.999"})

    assert response.status_code == 422


async def test_close_store_day_requires_counted_cash_amount_or_skip_intent(client):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    missing_response = await client.post("/api/v1/store-day/close", json={"closing_note": "Sin arqueo"})
    negative_response = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "-1.00"})
    too_many_decimals_response = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "1.999"})
    conflicting_response = await client.post(
        "/api/v1/store-day/close",
        json={"skip_cash_count": True, "counted_cash_amount": "0.00"},
    )

    assert missing_response.status_code == 422
    assert negative_response.status_code == 422
    assert too_many_decimals_response.status_code == 422
    assert conflicting_response.status_code == 422


async def test_close_store_day_allows_explicit_skip_cash_count(client):
    open_response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "100.00"})
    assert open_response.status_code == 201

    close_response = await client.post(
        "/api/v1/store-day/close",
        json={"closing_note": "Cierre rapido", "skip_cash_count": True},
    )

    assert close_response.status_code == 200
    data = close_response.json()
    assert data["status"] == "closed"
    assert data["expected_cash_amount"] == "100.00"
    assert data["counted_cash_amount"] is None
    assert data["cash_difference_amount"] is None


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

    close_response = await client.post(
        "/api/v1/store-day/close",
        json={"closing_note": "Cierre ok", "counted_cash_amount": "20.00"},
    )

    assert close_response.status_code == 200
    data = close_response.json()
    assert data["status"] == "closed"
    assert data["closing_note"] == "Cierre ok"
    assert data["sales_total"] == "20.00"
    assert data["sales_count"] == 1
    assert data["voided_sales_count"] == 0

    current_response = await client.get("/api/v1/store-day/current")
    assert current_response.status_code == 200
    assert current_response.json()["id"] == open_response.json()["id"]
    assert current_response.json()["status"] == "closed"

    events_response = await client.get("/api/v1/store-day/current/events")
    assert events_response.status_code == 200
    assert [event["event_type"] for event in events_response.json()] == ["open", "close"]


async def test_owner_can_preview_and_close_store_day_with_cash_count(client):
    cash_product = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 10})
    qr_product = await client.post("/api/v1/products", json={"name": "Te", "price": "15.00", "stock": 10})
    open_response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "100.00"})
    assert open_response.status_code == 201

    await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": cash_product.json()["id"], "quantity": 2}],
            "payment_method": "efectivo",
        },
    )
    await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": qr_product.json()["id"], "quantity": 1}],
            "payment_method": "qr",
        },
    )

    preview_response = await client.get("/api/v1/store-day/current/closing-preview")
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert preview["opening_cash_amount"] == "100.00"
    assert preview["sales_total"] == "35.00"
    assert preview["cash_sales_total"] == "20.00"
    assert preview["qr_sales_total"] == "15.00"
    assert preview["expected_cash_amount"] == "120.00"

    close_response = await client.post(
        "/api/v1/store-day/close",
        json={"closing_note": "Cierre con diferencia", "counted_cash_amount": "118.00"},
    )
    assert close_response.status_code == 200
    closed = close_response.json()
    assert closed["status"] == "closed"
    assert closed["expected_cash_amount"] == "120.00"
    assert closed["counted_cash_amount"] == "118.00"
    assert closed["cash_difference_amount"] == "-2.00"
    assert closed["closing_cash_sales_total"] == "20.00"
    assert closed["closing_qr_sales_total"] == "15.00"

    report_response = await client.get("/api/v1/store-day/current/close-report")
    assert report_response.status_code == 200
    report = report_response.json()
    assert report["business_day_id"] == open_response.json()["id"]
    assert report["cash_difference_amount"] == "-2.00"


async def test_current_close_report_rejects_open_day_after_reopen(client):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201
    close_response = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "0.00"})
    assert close_response.status_code == 200

    report_response = await client.get("/api/v1/store-day/current/close-report")
    assert report_response.status_code == 200

    reopen_response = await client.post("/api/v1/store-day/reopen")
    assert reopen_response.status_code == 200

    blocked_report = await client.get("/api/v1/store-day/current/close-report")
    assert blocked_report.status_code == 409
    assert blocked_report.json()["detail"] == "La jornada aun esta abierta"


async def test_owner_can_reopen_closed_store_day_and_keep_same_business_day(client):
    product_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 3})
    assert product_response.status_code == 201
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201
    close_response = await client.post(
        "/api/v1/store-day/close",
        json={"closing_note": "Pausa", "counted_cash_amount": "0.00"},
    )
    assert close_response.status_code == 200

    reopen_response = await client.post("/api/v1/store-day/reopen", json={"opening_note": "Reapertura"})

    assert reopen_response.status_code == 200
    reopened = reopen_response.json()
    assert reopened["id"] == open_response.json()["id"]
    assert reopened["status"] == "open"
    assert reopened["opening_note"] == "Reapertura"
    assert reopened["closed_at"] is None
    assert reopened["closing_note"] is None

    sale_response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 1}],
            "payment_method": "efectivo",
        },
    )
    assert sale_response.status_code == 201
    assert sale_response.json()["business_day_id"] == open_response.json()["id"]

    events_response = await client.get("/api/v1/store-day/current/events")
    assert events_response.status_code == 200
    events = events_response.json()
    assert [event["event_type"] for event in events] == ["open", "close", "reopen"]
    assert events[-1]["note"] == "Reapertura"


async def test_current_store_day_events_returns_empty_without_business_day(client):
    response = await client.get("/api/v1/store-day/current/events")

    assert response.status_code == 200
    assert response.json() == []


async def test_store_day_events_are_store_scoped(client, db_session):
    open_response = await client.post("/api/v1/store-day/open")
    assert open_response.status_code == 201

    event = StoreBusinessDayEventModel(
        business_day_id=open_response.json()["id"],
        store_id=dependencies.DEV_STORE_ID,
        event_type="open",
        created_by_user_id=dependencies.DEV_USER_ID,
        note="extra",
    )
    db_session.add(event)
    await db_session.commit()

    response = await client.get("/api/v1/store-day/current/events")

    assert response.status_code == 200
    assert {item["note"] for item in response.json()} == {None, "extra"}


async def test_cannot_close_without_open_store_day(client):
    response = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "0.00"})

    assert response.status_code == 409


async def test_close_report_rejects_closed_day_without_snapshot(client, db_session):
    business_day_id = uuid4()
    db_session.add(
        StoreBusinessDayModel(
            id=business_day_id,
            store_id=dependencies.DEV_STORE_ID,
            business_date=date(2026, 5, 20),
            status="closed",
            opened_at=datetime(2026, 5, 20, 12, 0, tzinfo=timezone.utc),
            closed_at=datetime(2026, 5, 20, 22, 0, tzinfo=timezone.utc),
            opened_by_user_id=dependencies.DEV_USER_ID,
            closed_by_user_id=dependencies.DEV_USER_ID,
        )
    )
    await db_session.commit()

    response = await client.get(f"/api/v1/store-day/reports/{business_day_id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "El cierre aun no tiene snapshot disponible"


async def test_close_reports_do_not_leak_other_store_data(client, db_session):
    other_store_id = uuid4()
    other_user_id = uuid4()
    other_business_day_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    db_session.add(
        UserModel(
            id=other_user_id,
            email="other@local.dev",
            store_id=other_store_id,
            full_name="Other Owner",
            role="owner",
            is_active=True,
        )
    )
    db_session.add(
        StoreBusinessDayModel(
            id=other_business_day_id,
            store_id=other_store_id,
            business_date=date(2026, 5, 20),
            status="closed",
            opened_at=datetime(2026, 5, 20, 12, 0, tzinfo=timezone.utc),
            closed_at=datetime(2026, 5, 20, 22, 0, tzinfo=timezone.utc),
            opened_by_user_id=other_user_id,
            closed_by_user_id=other_user_id,
            opening_cash_amount=Decimal("10.00"),
            expected_cash_amount=Decimal("30.00"),
            counted_cash_amount=Decimal("30.00"),
            cash_difference_amount=Decimal("0.00"),
            closing_sales_total=Decimal("20.00"),
            closing_sales_count=1,
            closing_voided_sales_count=0,
            closing_items_count=2,
            closing_cash_sales_total=Decimal("20.00"),
            closing_qr_sales_total=Decimal("0.00"),
            closing_transfer_sales_total=Decimal("0.00"),
            closing_card_sales_total=Decimal("0.00"),
            closing_snapshot_at=datetime(2026, 5, 20, 22, 0, tzinfo=timezone.utc),
        )
    )
    await db_session.commit()

    list_response = await client.get("/api/v1/store-day/reports?from_date=2026-05-01&to_date=2026-05-31")
    detail_response = await client.get(f"/api/v1/store-day/reports/{other_business_day_id}")

    assert list_response.status_code == 200
    assert list_response.json()["items"] == []
    assert detail_response.status_code == 404


async def test_reclose_after_reopen_recalculates_cash_snapshot(client):
    product_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 10})
    assert product_response.status_code == 201
    open_response = await client.post("/api/v1/store-day/open", json={"opening_cash_amount": "100.00"})
    assert open_response.status_code == 201

    await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 1}],
            "payment_method": "efectivo",
        },
    )
    first_close = await client.post("/api/v1/store-day/close", json={"counted_cash_amount": "110.00"})
    assert first_close.status_code == 200
    assert first_close.json()["expected_cash_amount"] == "110.00"
    assert first_close.json()["counted_cash_amount"] == "110.00"

    reopen_response = await client.post("/api/v1/store-day/reopen")
    assert reopen_response.status_code == 200
    await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product_response.json()["id"], "quantity": 2}],
            "payment_method": "efectivo",
        },
    )
    second_close = await client.post(
        "/api/v1/store-day/close",
        json={"closing_note": "Cierre final", "counted_cash_amount": "129.00"},
    )

    assert second_close.status_code == 200
    data = second_close.json()
    assert data["id"] == open_response.json()["id"]
    assert data["expected_cash_amount"] == "130.00"
    assert data["counted_cash_amount"] == "129.00"
    assert data["cash_difference_amount"] == "-1.00"
    assert data["closing_sales_total"] == "30.00"
    assert data["closing_sales_count"] == 2


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
