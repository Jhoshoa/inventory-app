from src.infrastructure.database.models import StoreModel
from src.presentation import dependencies


async def _enable_manual_discount(db_session, max_amount="50.00"):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.allow_manual_discount = True
    store.max_manual_discount_amount = max_amount
    await db_session.commit()


async def _enable_override(db_session):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.allow_cashier_discount_override = True
    await db_session.commit()


async def _open_store_day(client):
    current = await client.get("/api/v1/store-day/current")
    if current.json()["status"] != "open":
        response = await client.post("/api/v1/store-day/open")
        assert response.status_code == 201


async def test_owner_can_set_percentage_discount_on_product(client):
    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Con Descuento",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "20",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["discount_type"] == "percentage"
    assert float(data["discount_value"]) == 20
    assert data["effective_price"] == "80.00"


async def test_product_discount_percentage_rejected_above_100(client):
    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Invalido",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "150",
        },
    )

    assert response.status_code == 422


async def test_owner_can_remove_product_discount(client):
    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Oferta",
            "price": "50.00",
            "stock": 5,
            "discount_type": "fixed",
            "discount_value": "5.00",
        },
    )
    product_id = create.json()["id"]

    response = await client.patch(f"/api/v1/products/{product_id}", json={"remove_discount": True})

    assert response.status_code == 200
    data = response.json()
    assert data["discount_type"] is None
    assert data["effective_price"] == "50.00"


async def test_sale_applies_product_discount_automatically_when_no_manual_requested(client):
    await _open_store_day(client)
    product = (
        await client.post(
            "/api/v1/products",
            json={
                "name": "Oferta Automatica",
                "price": "40.00",
                "stock": 10,
                "discount_type": "fixed",
                "discount_value": "8.00",
            },
        )
    ).json()

    response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product["id"], "quantity": 1}]},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["discount_type"] == "product"
    assert data["discount_amount"] == "8.00"
    assert data["total"] == "32.00"


async def test_sale_picks_the_bigger_discount_automatically(client, db_session):
    await _open_store_day(client)
    await _enable_manual_discount(db_session, max_amount="50.00")
    product = (
        await client.post(
            "/api/v1/products",
            json={
                "name": "Producto Descuento Chico",
                "price": "100.00",
                "stock": 10,
                "discount_type": "fixed",
                "discount_value": "5.00",
            },
        )
    ).json()

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "fixed",
            "discount_value": "30.00",
        },
    )

    assert response.status_code == 201
    data = response.json()
    # El manual (30) es mayor que el de producto (5): gana el manual.
    assert data["discount_type"] == "fixed"
    assert data["discount_amount"] == "30.00"
    assert data["total"] == "70.00"


async def test_cashier_cannot_override_discount_source_when_store_forbids_it(client):
    await _open_store_day(client)
    product = (
        await client.post(
            "/api/v1/products",
            json={
                "name": "Producto Forzado",
                "price": "100.00",
                "stock": 10,
                "discount_type": "fixed",
                "discount_value": "40.00",
            },
        )
    ).json()

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_source_override": "none",
        },
    )

    assert response.status_code == 201
    data = response.json()
    # override ignorado: el descuento de producto se aplica igual (auto).
    assert data["discount_type"] == "product"
    assert data["discount_amount"] == "40.00"


async def test_cashier_can_override_discount_source_when_store_allows_it(client, db_session):
    await _open_store_day(client)
    await _enable_override(db_session)
    await _enable_manual_discount(db_session, max_amount="50.00")
    product = (
        await client.post(
            "/api/v1/products",
            json={
                "name": "Producto Override",
                "price": "100.00",
                "stock": 10,
                "discount_type": "fixed",
                "discount_value": "40.00",
            },
        )
    ).json()

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_type": "fixed",
            "discount_value": "10.00",
            "discount_source_override": "manual",
        },
    )

    assert response.status_code == 201
    data = response.json()
    # Aunque el descuento de producto (40) es mayor, el cajero forzo el manual (10).
    assert data["discount_type"] == "fixed"
    assert data["discount_amount"] == "10.00"
    assert data["total"] == "90.00"


async def test_cashier_can_force_no_discount_when_override_allowed(client, db_session):
    await _open_store_day(client)
    await _enable_override(db_session)
    product = (
        await client.post(
            "/api/v1/products",
            json={
                "name": "Producto Sin Descuento Forzado",
                "price": "100.00",
                "stock": 10,
                "discount_type": "fixed",
                "discount_value": "40.00",
            },
        )
    ).json()

    response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product["id"], "quantity": 1}],
            "discount_source_override": "none",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["discount_type"] is None
    assert data["discount_amount"] == "0" or float(data["discount_amount"]) == 0
    assert data["total"] == "100.00"


async def test_non_owner_cannot_set_product_discount(client):
    from src.main import app
    from src.presentation import dependencies as deps

    async def override_cashier():
        return {
            "id": deps.DEV_CASHIER_USER_ID,
            "email": "cashier@local.dev",
            "store_id": deps.DEV_STORE_ID,
            "role": "cashier",
        }

    app.dependency_overrides[deps.get_current_user] = override_cashier
    try:
        response = await client.post(
            "/api/v1/products",
            json={
                "name": "Producto Cajero",
                "price": "10.00",
                "stock": 5,
                "discount_type": "fixed",
                "discount_value": "2.00",
            },
        )
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)

    assert response.status_code == 403
