from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from sqlalchemy import func, select

from src.application.use_cases.store_day._business_date import local_business_date
from src.infrastructure.database.models import (
    ProductBatchModel,
    ProductModel,
    StoreModel,
    UserModel,
)
from src.main import app
from src.presentation import dependencies


def _today() -> date:
    # El conftest crea la tienda con la zona horaria por defecto.
    return local_business_date(None)


def _in(days: int) -> str:
    return (_today() + timedelta(days=days)).isoformat()


async def _product(client, *, name="Yogur", stock=0, **extra) -> dict:
    response = await client.post("/api/v1/products", json={"name": name, "price": "5.00", "stock": stock, **extra})
    assert response.status_code == 201, response.text
    return response.json()


async def _add(client, product_id: str, quantity: int, **extra):
    return await client.patch(f"/api/v1/products/{product_id}/stock", json={"quantity": quantity, **extra})


async def _batches(client, product_id: str) -> dict:
    response = await client.get(f"/api/v1/products/{product_id}/batches")
    assert response.status_code == 200, response.text
    return response.json()


async def _open_day(client) -> None:
    current = await client.get("/api/v1/store-day/current")
    if current.json()["status"] != "open":
        assert (await client.post("/api/v1/store-day/open")).status_code == 201


async def _sell(client, product_id: str, quantity: int) -> dict:
    await _open_day(client)
    response = await client.post(
        "/api/v1/sales",
        json={"items": [{"product_id": product_id, "quantity": quantity}], "payment_method": "efectivo"},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _as_cashier(db_session) -> None:
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()


async def _remaining_sum(db_session, product_id: str) -> int:
    return int(
        await db_session.scalar(
            select(func.coalesce(func.sum(ProductBatchModel.quantity_remaining), 0)).where(
                ProductBatchModel.product_id == product_id
            )
        )
    )


# --- Ubicaciones -----------------------------------------------------------


async def test_store_locations_crud_and_labels(client):
    created = await client.post(
        "/api/v1/store-locations", json={"zone": "  Pasillo  2 ", "shelf": "Estante B", "level": "3"}
    )
    assert created.status_code == 201
    body = created.json()
    assert body["zone"] == "Pasillo 2"
    assert body["label"] == "Pasillo 2 · Estante B · 3"

    duplicate = await client.post(
        "/api/v1/store-locations", json={"zone": "pasillo 2", "shelf": "ESTANTE B", "level": "3"}
    )
    assert duplicate.status_code == 409

    level_without_shelf = await client.post("/api/v1/store-locations", json={"zone": "Deposito", "level": "1"})
    assert level_without_shelf.status_code == 400

    renamed = await client.patch(f"/api/v1/store-locations/{body['id']}", json={"zone": "Pasillo 3"})
    assert renamed.status_code == 200
    assert renamed.json()["label"] == "Pasillo 3"

    listed = await client.get("/api/v1/store-locations")
    assert [item["label"] for item in listed.json()["items"]] == ["Pasillo 3"]

    deleted = await client.delete(f"/api/v1/store-locations/{body['id']}")
    assert deleted.status_code == 204
    assert (await client.get("/api/v1/store-locations")).json()["items"] == []
    assert (await client.delete(f"/api/v1/store-locations/{body['id']}")).status_code == 404


async def test_product_locations_are_visible_to_cashiers_everywhere(client, db_session):
    product = await _product(client, name="Leche", stock=4)
    display = (await client.post("/api/v1/store-locations", json={"zone": "Pasillo 1", "shelf": "Heladera"})).json()
    storage = (await client.post("/api/v1/store-locations", json={"zone": "Deposito"})).json()

    assigned = await client.put(
        f"/api/v1/products/{product['id']}/locations",
        json={
            "items": [
                {"location_id": display["id"], "kind": "display"},
                {"location_id": storage["id"], "kind": "storage"},
                {"location_id": display["id"], "kind": "storage"},
            ]
        },
    )
    assert assigned.status_code == 200
    assert [(item["label"], item["kind"]) for item in assigned.json()] == [
        ("Pasillo 1 · Heladera", "display"),
        ("Deposito", "storage"),
    ]

    await _as_cashier(db_session)

    detail = (await client.get(f"/api/v1/products/{product['id']}")).json()
    assert [item["label"] for item in detail["locations"]] == ["Pasillo 1 · Heladera", "Deposito"]

    pos = (await client.get("/api/v1/products/pos", params={"q": "Leche"})).json()
    assert pos["items"][0]["locations"][0]["label"] == "Pasillo 1 · Heladera"

    by_qr = (await client.get(f"/api/v1/products/qr/{product['qr_code']}")).json()
    assert len(by_qr["locations"]) == 2

    listed = (await client.get("/api/v1/products")).json()
    assert listed["items"][0]["locations"][1]["kind"] == "storage"

    locations = await client.get("/api/v1/store-locations")
    assert locations.status_code == 200
    assert {item["label"]: item["product_count"] for item in locations.json()["items"]} == {
        "Deposito": 1,
        "Pasillo 1 · Heladera": 1,
    }

    # Los cajeros ven, pero no cambian ubicaciones.
    assert (await client.post("/api/v1/store-locations", json={"zone": "X"})).status_code == 403
    assert (
        await client.put(f"/api/v1/products/{product['id']}/locations", json={"items": []})
    ).status_code == 403
    assert (await client.delete(f"/api/v1/store-locations/{storage['id']}")).status_code == 403


async def test_product_locations_reject_other_store_locations(client, db_session):
    product = await _product(client, name="Pan")
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Otra", address="x", phone="1"))
    await db_session.commit()

    from src.infrastructure.database.models import StoreLocationModel

    foreign = StoreLocationModel(id=uuid4(), store_id=other_store_id, zone="Ajena")
    db_session.add(foreign)
    await db_session.commit()

    response = await client.put(
        f"/api/v1/products/{product['id']}/locations",
        json={"items": [{"location_id": str(foreign.id), "kind": "display"}]},
    )
    assert response.status_code == 404


async def test_sync_pull_carries_locations_and_renames_bump_products(client, db_session):
    product = await _product(client, name="Queso", stock=2)
    location = (await client.post("/api/v1/store-locations", json={"zone": "Pasillo 4"})).json()
    await client.put(
        f"/api/v1/products/{product['id']}/locations",
        json={"items": [{"location_id": location["id"], "kind": "display"}]},
    )

    since = datetime(2020, 1, 1, tzinfo=UTC).isoformat()
    pull = await client.post("/api/v1/sync/pull", json={"device_id": "pos-1", "since": since})
    change = next(c for c in pull.json()["changes"] if c["entity"] == "product" and c["entity_id"] == product["id"])
    assert change["payload"]["locations"] == [{"label": "Pasillo 4", "kind": "display"}]

    model = await db_session.get(ProductModel, product["id"])
    before = model.updated_at
    await client.patch(f"/api/v1/store-locations/{location['id']}", json={"zone": "Pasillo 5"})
    await db_session.refresh(model)
    assert model.updated_at > before

    pull = await client.post("/api/v1/sync/pull", json={"device_id": "pos-1", "since": since})
    change = next(c for c in pull.json()["changes"] if c["entity"] == "product" and c["entity_id"] == product["id"])
    assert change["payload"]["locations"] == [{"label": "Pasillo 5", "kind": "display"}]


# --- Lotes con vencimiento ---------------------------------------------------


async def test_create_product_with_expiry_starts_a_batch(client):
    product = await _product(client, stock=6, expires_on=_in(30), alert_days=7)

    batches = await _batches(client, product["id"])
    assert batches["untracked_quantity"] == 0
    [batch] = batches["items"]
    assert batch["quantity_remaining"] == 6
    assert batch["alert_days"] == 7
    assert batch["days_left"] == 30
    assert batch["status"] == "ok"


async def test_create_product_with_expiry_requires_stock(client):
    response = await client.post(
        "/api/v1/products", json={"name": "Sin stock", "price": "1.00", "stock": 0, "expires_on": _in(5)}
    )
    assert response.status_code == 422


async def test_sales_consume_batches_fefo_and_void_restores_the_same_batches(client, db_session):
    product = await _product(client, stock=2)  # 2 sin lote
    late = await _add(client, product["id"], 5, expires_on=_in(40))
    early = await _add(client, product["id"], 3, expires_on=_in(10))
    assert late.status_code == early.status_code == 200
    assert early.json()["stock"] == 10

    sale = await _sell(client, product["id"], 4)

    batches = await _batches(client, product["id"])
    by_expiry = {b["expires_on"]: b["quantity_remaining"] for b in batches["items"]}
    # Sale primero el que vence antes (3), despues el siguiente lote (1).
    assert by_expiry == {_in(40): 4}
    assert batches["untracked_quantity"] == 2

    void = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "error"})
    assert void.status_code == 200

    batches = await _batches(client, product["id"])
    assert {b["expires_on"]: b["quantity_remaining"] for b in batches["items"]} == {_in(10): 3, _in(40): 5}
    assert batches["untracked_quantity"] == 2
    assert await _remaining_sum(db_session, product["id"]) == 8


async def test_sales_leave_expired_batches_for_manual_removal(client, db_session):
    product = await _product(client, stock=3)  # 3 sin lote
    expired = await _add(client, product["id"], 2, expires_on=_in(-2))
    assert expired.status_code == 200

    await _sell(client, product["id"], 3)
    batches = await _batches(client, product["id"])
    [batch] = batches["items"]
    # La venta salio del stock sin lote; el vencido sigue a la vista.
    assert batch["status"] == "expired"
    assert batch["quantity_remaining"] == 2
    assert batches["untracked_quantity"] == 0

    too_many = await _add(client, product["id"], -3, batch_id=batch["id"])
    assert too_many.status_code == 409

    removed = await _add(client, product["id"], -2, batch_id=batch["id"], reason="vencido")
    assert removed.status_code == 200
    assert removed.json()["stock"] == 0
    assert (await _batches(client, product["id"]))["items"] == []


async def test_expired_batches_are_used_when_nothing_else_is_left(client, db_session):
    product = await _product(client)
    await _add(client, product["id"], 2, expires_on=_in(-1))

    await _sell(client, product["id"], 1)

    assert await _remaining_sum(db_session, product["id"]) == 1


async def test_stock_adjustment_batch_validation(client, db_session):
    product = await _product(client, stock=2)
    other = await _product(client, name="Otro", stock=2, expires_on=_in(9))
    other_batch = (await _batches(client, other["id"]))["items"][0]

    assert (await _add(client, product["id"], -1, expires_on=_in(3))).status_code == 422
    assert (await _add(client, product["id"], 1, batch_id=other_batch["id"])).status_code == 422
    assert (await _add(client, product["id"], 1, expires_on=_in(3), alert_days=400)).status_code == 422
    assert (await _add(client, product["id"], 1, expires_on="2400-01-01")).status_code == 400
    # El lote de otro producto no sirve para descontar este.
    assert (await _add(client, product["id"], -1, batch_id=other_batch["id"])).status_code == 404


async def test_manual_deduction_without_batch_goes_fefo(client, db_session):
    product = await _product(client, stock=1)
    await _add(client, product["id"], 2, expires_on=_in(15))
    await _add(client, product["id"], 2, expires_on=_in(3))

    await _add(client, product["id"], -3, reason="rotura")

    batches = await _batches(client, product["id"])
    assert {b["expires_on"]: b["quantity_remaining"] for b in batches["items"]} == {_in(15): 1}
    assert batches["untracked_quantity"] == 1


async def test_product_update_lowering_stock_trims_batches(client, db_session):
    product = await _product(client, stock=4, expires_on=_in(8))

    response = await client.patch(f"/api/v1/products/{product['id']}", json={"stock": 1})
    assert response.status_code == 200

    assert await _remaining_sum(db_session, product["id"]) == 1


async def test_dashboard_shows_expiring_and_expired_batches(client, db_session):
    soon = await _product(client, name="Yogur", stock=3, expires_on=_in(2))  # aviso 5 dias
    later = await _product(client, name="Arroz", stock=3, expires_on=_in(60))
    gone = await _product(client, name="Pan", stock=1, expires_on=_in(-1))
    deleted = await _product(client, name="Borrado", stock=1, expires_on=_in(1))
    await client.delete(f"/api/v1/products/{deleted['id']}")
    _ = later

    await _as_cashier(db_session)
    summary = await client.get("/api/v1/dashboard/summary")
    assert summary.status_code == 200
    body = summary.json()
    assert body["expiring_batches_count"] == 1
    assert body["expired_batches_count"] == 1
    assert [(a["product_name"], a["status"]) for a in body["expiry_alerts"]] == [
        ("Pan", "expired"),
        ("Yogur", "expiring"),
    ]
    assert body["expiry_alerts"][1]["product_id"] == soon["id"]
    assert body["expiry_alerts"][0]["product_id"] == gone["id"]


async def test_batches_are_store_scoped(client, db_session):
    product = await _product(client, stock=2, expires_on=_in(4))
    other_store_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Otra", address="x", phone="1"))
    await db_session.commit()

    async def other_store_user():
        return {"id": dependencies.DEV_USER_ID, "email": "dev@local.dev", "store_id": other_store_id}

    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.store_id = other_store_id
    await db_session.commit()
    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    assert (await client.get(f"/api/v1/products/{product['id']}/batches")).status_code == 404
    summary = (await client.get("/api/v1/dashboard/summary")).json()
    assert summary["expiry_alerts"] == []


# --- Sync ------------------------------------------------------------------


def _change(entity: str, operation: str, entity_id: str, payload: dict) -> dict:
    return {
        "client_change_id": f"{entity}-{uuid4()}",
        "entity": entity,
        "operation": operation,
        "entity_id": entity_id,
        "client_created_at": datetime.now(UTC).isoformat(),
        "payload": payload,
    }


async def test_sync_stock_movement_consumes_batches(client, db_session):
    product = await _product(client, stock=1)
    await _add(client, product["id"], 3, expires_on=_in(6))

    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "pos-2",
            "changes": [
                _change(
                    "stock_movement",
                    "create",
                    product["id"],
                    {"product_id": product["id"], "quantity_delta": -2, "reason": "conteo"},
                )
            ],
        },
    )
    assert response.json()["results"][0]["status"] == "accepted", response.text

    batches = await _batches(client, product["id"])
    assert batches["items"][0]["quantity_remaining"] == 1
    assert batches["untracked_quantity"] == 1


async def test_sync_product_upsert_lowering_stock_keeps_batches_within_stock(client, db_session):
    product = await _product(client, stock=5, expires_on=_in(6))

    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "pos-3",
            "changes": [
                _change("product", "upsert", product["id"], {"name": "Yogur", "price": "5.00", "stock": 2})
            ],
        },
    )
    assert response.json()["results"][0]["status"] == "accepted", response.text

    assert await _remaining_sum(db_session, product["id"]) == 2


async def test_sync_sale_consumes_batches(client, db_session):
    product = await _product(client, stock=4, expires_on=_in(6))
    await _open_day(client)

    sale_id = str(uuid4())
    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "pos-4",
            "changes": [
                _change(
                    "sale",
                    "create",
                    sale_id,
                    {"items": [{"product_id": product["id"], "quantity": 3}], "payment_method": "efectivo"},
                )
            ],
        },
    )
    assert response.json()["results"][0]["status"] == "accepted", response.text
    assert await _remaining_sum(db_session, product["id"]) == 1


# --- CSV ---------------------------------------------------------------------


async def test_csv_import_with_expiry_columns(client):
    expiry = _today() + timedelta(days=12)
    content = (
        "name,price,stock,vence,aviso_dias\n"
        f"Yogur frutilla,6.50,8,{expiry.isoformat()},3\n"
        f"Yogur durazno,6.50,4,{expiry.strftime('%d/%m/%Y')},\n"
        "Fideos,4.00,10,,\n"
    )
    response = await client.post(
        "/api/v1/products/import", files={"file": ("productos.csv", content, "text/csv")}
    )
    assert response.status_code == 201, response.text
    assert response.json()["imported_count"] == 3, response.json()

    # Los nombres se normalizan al importar: se buscan sin mayusculas.
    products = {p["name"].lower(): p for p in (await client.get("/api/v1/products")).json()["items"]}
    strawberry = (await _batches(client, products["yogur frutilla"]["id"]))["items"]
    peach = (await _batches(client, products["yogur durazno"]["id"]))["items"]
    noodles = await _batches(client, products["fideos"]["id"])
    assert [(b["quantity_remaining"], b["alert_days"]) for b in strawberry] == [(8, 3)]
    assert [(b["expires_on"], b["alert_days"]) for b in peach] == [(expiry.isoformat(), 5)]
    assert noodles == {"items": [], "untracked_quantity": 10, "today": _today().isoformat()}


async def test_csv_import_rejects_bad_expiry_values(client):
    content = (
        "name,price,stock,vence,aviso_dias\n"
        "A,1,5,31-12-2026,\n"
        "B,1,0,2026-12-31,\n"
        "C,1,5,,4\n"
        "D,1,5,2026-12-31,dos\n"
    )
    response = await client.post(
        "/api/v1/products/import", files={"file": ("productos.csv", content, "text/csv")}
    )
    body = response.json()
    assert body["imported_count"] == 0
    assert sorted((e["row"], e["field"]) for e in body["errors"]) == [
        (1, "vence"),
        (2, "vence"),
        (3, "aviso_dias"),
        (4, "aviso_dias"),
    ]
