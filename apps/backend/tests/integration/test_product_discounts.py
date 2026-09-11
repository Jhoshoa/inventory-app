from datetime import datetime, timedelta, timezone

from src.infrastructure.database.models import ProductModel, StoreModel
from src.presentation import dependencies


async def _enable_manual_discount(db_session, max_amount="50.00"):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.allow_manual_discount = True
    store.max_manual_discount_amount = max_amount
    await db_session.commit()


async def _enable_percentage_discount(db_session, max_percentage="50.00"):
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.allow_percentage_discount = True
    store.max_percentage_discount = max_percentage
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


async def test_owner_can_set_percentage_discount_on_product(client, db_session):
    await _enable_percentage_discount(db_session)
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


async def test_product_percentage_discount_rejected_above_store_policy_max(client, db_session):
    """Regresion: un descuento fijado directamente en el producto (no por el
    cajero al cobrar) no debe poder saltearse la politica de la tienda. Antes
    de este fix, esto se guardaba sin ningun chequeo."""
    await _enable_percentage_discount(db_session, max_percentage="15.00")

    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Sobre El Limite",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "25",
        },
    )

    assert response.status_code == 403
    assert "15" in response.json()["detail"]


async def test_product_percentage_discount_rejected_when_store_disallows_it(client):
    """Por defecto la politica no tiene el descuento por porcentaje
    habilitado — un producto no deberia poder tener uno igual."""
    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Sin Politica",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "5",
        },
    )

    assert response.status_code == 403


async def test_product_fixed_discount_rejected_above_store_policy_max(client, db_session):
    await _enable_manual_discount(db_session, max_amount="10.00")

    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Oferta Muy Grande",
            "price": "60.00",
            "stock": 10,
            "discount_type": "fixed",
            "discount_value": "15.00",
        },
    )

    assert response.status_code == 403


async def test_update_product_discount_rejected_above_store_policy_max(client, db_session):
    await _enable_percentage_discount(db_session, max_percentage="15.00")
    product = (
        await client.post(
            "/api/v1/products",
            json={"name": "Producto Base", "price": "100.00", "stock": 10},
        )
    ).json()

    response = await client.patch(
        f"/api/v1/products/{product['id']}",
        json={"discount_type": "percentage", "discount_value": "25"},
    )

    assert response.status_code == 403


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


async def test_owner_can_remove_product_discount(client, db_session):
    await _enable_manual_discount(db_session)
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


async def test_sale_applies_product_discount_automatically_when_no_manual_requested(client, db_session):
    await _open_store_day(client)
    await _enable_manual_discount(db_session)
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


async def test_cashier_cannot_override_discount_source_when_store_forbids_it(client, db_session):
    await _open_store_day(client)
    await _enable_manual_discount(db_session)
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
    await _enable_manual_discount(db_session)
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


async def test_product_discount_ends_at_must_be_in_the_future(client, db_session):
    await _enable_percentage_discount(db_session)
    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Vencimiento Invalido",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "10",
            "discount_ends_at": past,
        },
    )

    assert response.status_code == 422


async def test_product_discount_ends_at_requires_a_discount(client):
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Producto Sin Descuento",
            "price": "100.00",
            "stock": 10,
            "discount_ends_at": future,
        },
    )

    assert response.status_code == 422


async def test_product_discount_with_future_expiration_still_applies(client, db_session):
    await _enable_percentage_discount(db_session)
    future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    response = await client.post(
        "/api/v1/products",
        json={
            "name": "Oferta Con Vencimiento",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "10",
            "discount_ends_at": future,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["discount_type"] == "percentage"
    assert data["effective_price"] == "90.00"


async def test_expired_product_discount_no_longer_applies_to_price(client, db_session):
    await _enable_percentage_discount(db_session)
    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Oferta Por Vencer",
            "price": "100.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "10",
        },
    )
    product_id = create.json()["id"]

    # Simula el paso del tiempo escribiendo directo el vencimiento ya pasado
    # (la API no permite fijar un vencimiento en el pasado al crear/editar).
    model = await db_session.get(ProductModel, product_id)
    model.discount_ends_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    response = await client.get(f"/api/v1/products/{product_id}")

    assert response.status_code == 200
    data = response.json()
    # El tipo/valor configurado sigue visible (el owner lo definio), pero
    # el precio efectivo ya no refleja el descuento vencido.
    assert data["discount_type"] == "percentage"
    assert data["effective_price"] == "100.00"


async def test_expired_product_discount_not_applied_at_sale_time(client, db_session):
    await _open_store_day(client)
    await _enable_percentage_discount(db_session)
    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Oferta Vencida Venta",
            "price": "40.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "10",
        },
    )
    product_id = create.json()["id"]
    model = await db_session.get(ProductModel, product_id)
    model.discount_ends_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": 1}]},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["discount_type"] is None
    assert data["total"] == "40.00"


async def test_owner_can_update_discount_expiration_alone(client, db_session):
    await _enable_percentage_discount(db_session)
    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Oferta Editable",
            "price": "50.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "10",
        },
    )
    product_id = create.json()["id"]
    future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    response = await client.patch(f"/api/v1/products/{product_id}", json={"discount_ends_at": future})

    assert response.status_code == 200
    assert response.json()["discount_ends_at"] is not None


async def test_owner_can_clear_discount_expiration_alone(client, db_session):
    await _enable_percentage_discount(db_session)
    future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    create = await client.post(
        "/api/v1/products",
        json={
            "name": "Oferta Con Vencimiento Editable",
            "price": "50.00",
            "stock": 10,
            "discount_type": "percentage",
            "discount_value": "10",
            "discount_ends_at": future,
        },
    )
    product_id = create.json()["id"]

    response = await client.patch(
        f"/api/v1/products/{product_id}", json={"clear_discount_ends_at": True}
    )

    assert response.status_code == 200
    assert response.json()["discount_ends_at"] is None
