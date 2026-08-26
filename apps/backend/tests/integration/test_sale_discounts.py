from src.infrastructure.database.models import StoreModel
from src.presentation import dependencies


async def _enable_percentage_discount(db_session, max_percent="15.00"):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.allow_percentage_discount = True
    store.max_percentage_discount = max_percent
    await db_session.commit()


async def _enable_manual_discount(db_session, max_amount="20.00"):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.allow_manual_discount = True
    store.max_manual_discount_amount = max_amount
    await db_session.commit()


async def _open_store_and_create_product(client, price="10.00", stock=10):
    product_response = await client.post(
        "/api/v1/products", json={"name": "Arroz", "price": price, "stock": stock}
    )
    assert product_response.status_code == 201
    product = product_response.json()

    current_store_day = await client.get("/api/v1/store-day/current")
    if current_store_day.json()["status"] != "open":
        open_response = await client.post("/api/v1/store-day/open")
        assert open_response.status_code == 201

    return product


async def test_sale_without_discount_has_zero_discount_amount(client):
    product = await _open_store_and_create_product(client)

    response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product["id"], "quantity": 2}]},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["subtotal"] == "20.00"
    assert float(data["discount_amount"]) == 0
    assert data["total"] == "20.00"


async def test_percentage_discount_applies_correctly(client, db_session):
    await _enable_percentage_discount(db_session, "15.00")
    product = await _open_store_and_create_product(client, price="100.00")

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "percentage",
            "discount_value": "10",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["subtotal"] == "100.00"
    assert data["discount_type"] == "percentage"
    assert float(data["discount_value"]) == 10
    assert data["discount_amount"] == "10.00"
    assert data["total"] == "90.00"


async def test_percentage_discount_rejected_when_store_does_not_allow_it(client):
    product = await _open_store_and_create_product(client, price="100.00")

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "percentage",
            "discount_value": "10",
        },
    )

    assert response.status_code == 403


async def test_percentage_discount_rejected_above_store_max(client, db_session):
    await _enable_percentage_discount(db_session, "10.00")
    product = await _open_store_and_create_product(client, price="100.00")

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "percentage",
            "discount_value": "20",
        },
    )

    assert response.status_code == 403


async def test_manual_discount_applies_and_never_makes_total_negative(client, db_session):
    await _enable_manual_discount(db_session, "50.00")
    product = await _open_store_and_create_product(client, price="10.00")

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "fixed",
            "discount_value": "50",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["subtotal"] == "10.00"
    # La rebaja se limita al subtotal aunque el owner permita hasta 50.
    assert data["discount_amount"] == "10.00"
    assert data["total"] == "0.00"


async def test_manual_discount_rejected_when_store_does_not_allow_it(client):
    product = await _open_store_and_create_product(client, price="10.00")

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "fixed",
            "discount_value": "5",
        },
    )

    assert response.status_code == 403


async def test_owner_can_configure_discount_policy(client):
    response = await client.patch(
        "/api/v1/store",
        json={
            "allow_percentage_discount": True,
            "max_percentage_discount": "12.50",
            "allow_manual_discount": True,
            "max_manual_discount_amount": "30.00",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["allow_percentage_discount"] is True
    assert data["max_percentage_discount"] == "12.50"
    assert data["allow_manual_discount"] is True
    assert data["max_manual_discount_amount"] == "30.00"


async def test_cannot_enable_percentage_discount_without_positive_max(client):
    response = await client.patch(
        "/api/v1/store",
        json={"allow_percentage_discount": True, "max_percentage_discount": "0"},
    )

    assert response.status_code == 400
