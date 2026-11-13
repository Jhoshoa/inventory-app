"""Codigo para escanear y SKU: unicos por tienda, formato A-Z 0-9 y guion, y sin 500.

Antes el codigo era unico entre todas las tiendas: "QR-LAC000001" (armado desde el
SKU) chocaba con el de otra tienda y la importacion terminaba en un error 500.
"""

from uuid import uuid4

from src.infrastructure.database.models import StoreModel, UserModel
from src.main import app
from src.presentation import dependencies


async def _use_other_store(db_session):
    store_id, user_id = uuid4(), uuid4()
    db_session.add(StoreModel(id=store_id, name="Otra tienda"))
    db_session.add(
        UserModel(id=user_id, email="otra@local.dev", store_id=store_id, full_name="Otra", role="owner", is_active=True)
    )
    await db_session.commit()

    async def other_user():
        return {"id": user_id, "email": "otra@local.dev", "store_id": store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_user


async def _category(client, name="Lacteos", prefix="lac"):
    response = await client.post("/api/v1/product-categories", json={"name": name, "sku_prefix": prefix})
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def _import(client, content: str):
    response = await client.post("/api/v1/products/import", files={"file": ("productos.csv", content, "text/csv")})
    assert response.status_code in (201, 200, 422), response.text
    return response.json()


async def test_same_barcode_and_automatic_code_in_two_stores(client, db_session):
    category_id = await _category(client)
    first = await client.post(
        "/api/v1/products", json={"name": "Leche Pil 1l", "price": "7.50", "stock": 5, "category_id": category_id}
    )
    coke = await client.post("/api/v1/products", json={"name": "Coca Cola 2l", "price": "14", "stock": 5, "qr_code": "7751234000123"})
    assert first.status_code == 201 and coke.status_code == 201
    assert first.json()["qr_code"] == "QR-LAC000001"

    await _use_other_store(db_session)
    other_category = await _category(client, "Lácteos", "LAC")
    second = await client.post(
        "/api/v1/products", json={"name": "Leche Pil 1l", "price": "7.50", "stock": 5, "category_id": other_category}
    )
    other_coke = await client.post(
        "/api/v1/products", json={"name": "Coca Cola 2l", "price": "14", "stock": 5, "qr_code": "7751234000123"}
    )

    # Cada tienda tiene su QR-LAC000001 y el mismo codigo de barras real.
    assert second.status_code == 201, second.text
    assert second.json()["qr_code"] == "QR-LAC000001"
    assert other_coke.status_code == 201, other_coke.text
    found = await client.get("/api/v1/products/qr/7751234000123")
    assert found.json()["id"] == other_coke.json()["id"]


async def test_code_stays_unique_inside_a_store(client):
    await client.post("/api/v1/products", json={"name": "Azucar", "price": "10", "stock": 2, "qr_code": "ABC-1"})
    duplicate = await client.post("/api/v1/products", json={"name": "Sal", "price": "4", "stock": 2, "qr_code": "abc-1"})
    assert duplicate.status_code == 409


async def test_automatic_code_skips_one_typed_by_hand(client):
    category_id = await _category(client)
    await client.post("/api/v1/products", json={"name": "Queso", "price": "20", "stock": 1, "qr_code": "QR-LAC000001"})
    milk = await client.post(
        "/api/v1/products", json={"name": "Leche", "price": "7", "stock": 1, "category_id": category_id}
    )
    assert milk.status_code == 201, milk.text
    assert milk.json()["sku"] == "LAC000001"
    assert milk.json()["qr_code"] == "QR-LAC000001-2"


async def test_codes_are_uppercased_and_checked(client):
    created = await client.post(
        "/api/v1/products", json={"name": "Pan", "price": "0.5", "stock": 1, "qr_code": "  pan-01 ", "sku": "pan-a"}
    )
    assert created.status_code == 201, created.text
    assert created.json()["qr_code"] == "PAN-01"
    assert created.json()["sku"] == "PAN-A"
    # Escrito en minusculas igual lo encuentra.
    assert (await client.get("/api/v1/products/qr/pan-01")).status_code == 200

    for body in ({"qr_code": "PAN 02"}, {"qr_code": "PAN_02"}, {"qr_code": "Ñ1"}, {"qr_code": "A" * 51}, {"sku": "SKU#1"}):
        response = await client.post("/api/v1/products", json={"name": f"X{uuid4().hex[:6]}", "price": "1", "stock": 1, **body})
        assert response.status_code == 400, (body, response.text)
        assert "letras A-Z, numeros y guion" in response.json()["detail"]


async def test_editing_keeps_an_old_code_and_clearing_makes_a_new_one(client, db_session):
    from src.infrastructure.database.models import ProductModel

    created = await client.post("/api/v1/products", json={"name": "Te", "price": "3", "stock": 1, "qr_code": "TE-1"})
    product_id = created.json()["id"]
    # Un codigo de antes de esta regla (con minuscula) no impide editar otros datos.
    model = await db_session.get(ProductModel, product_id)
    model.qr_code = "viejo codigo"
    await db_session.commit()

    unchanged = await client.patch(f"/api/v1/products/{product_id}", json={"price": "4", "qr_code": "viejo codigo"})
    assert unchanged.status_code == 200, unchanged.text

    cleared = await client.patch(f"/api/v1/products/{product_id}", json={"qr_code": ""})
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["qr_code"].startswith("P-")


async def test_deleted_product_name_sku_and_code_can_be_reused(client):
    body = {"name": "Galleta", "price": "2", "stock": 1, "sku": "GAL-1", "qr_code": "GAL-QR"}
    first = await client.post("/api/v1/products", json=body)
    assert (await client.delete(f"/api/v1/products/{first.json()['id']}")).status_code in (200, 204)

    again = await client.post("/api/v1/products", json=body)

    assert again.status_code == 201, again.text


async def test_import_uses_free_codes_per_store(client, db_session):
    category_id = await _category(client)
    await client.post("/api/v1/products", json={"name": "Leche Pil 1l", "price": "7.50", "stock": 5, "category_id": category_id})

    await _use_other_store(db_session)
    await _category(client, "Lácteos", "LAC")
    job = await _import(
        client,
        "name,price,stock,category,sku,unit,min_stock,cost_price,qr_code,photo_url,vence,aviso_dias\n"
        "Leche Pil 1l,7.50,24,Lácteos,,unidad,5,5.20,,,,\n"
        "Yogur,6.00,10,Lácteos,,unidad,2,,qr-lac000002,,,\n",
    )

    # Antes: 500 por el QR-LAC000001 de la otra tienda. La fila 2 ya trae QR-LAC000002, asi
    # que el automatico de la fila 1 no puede ser ese.
    assert job["imported_count"] == 2, job
    codes = {p["name"].lower(): p["qr_code"] for p in (await client.get("/api/v1/products")).json()["items"]}
    assert codes == {"leche pil 1l": "QR-LAC000001", "yogur": "QR-LAC000002"}


async def test_import_reports_bad_codes_by_row(client):
    job = await _import(client, "name,price,stock,qr_code,sku\nA,1,1,COD 1,\nB,1,1,,sku/2\n")

    assert job["imported_count"] == 0
    fields = {(error["row"], error["field"]) for error in job["errors"]}
    assert fields == {(1, "qr_code"), (2, "sku")}


async def test_sync_conflict_on_code_does_not_fail_the_push(client):
    await client.post("/api/v1/products", json={"name": "Azucar", "price": "10", "stock": 2, "qr_code": "SYNC-1"})
    response = await client.post(
        "/api/v1/sync/push",
        json={
            "device_id": "tablet-1",
            "changes": [
                {
                    "client_change_id": str(uuid4()),
                    "entity": "product",
                    "entity_id": str(uuid4()),
                    "operation": "upsert",
                    "client_created_at": "2026-11-12T12:00:00Z",
                    "payload": {"name": "Sal", "price": "4.00", "stock": 1, "unit": "unidad", "qr_code": "SYNC-1"},
                }
            ],
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["results"][0]["status"] == "conflict"
