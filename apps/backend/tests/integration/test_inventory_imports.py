from uuid import uuid4

from src.application.ports.ocr_service import OCRResult
from src.infrastructure.database.models.inventory_import_model import InventoryImportModel
from src.infrastructure.database.models.stock_movement_model import StockMovementModel
from src.main import app
from src.presentation import dependencies


class FakeOCRService:
    async def extract_from_bytes(self, image_bytes: bytes) -> OCRResult:
        return OCRResult(
            raw_text="Arroz 1kg 12.50 20\nAceite 1l 18.00 5",
            structured=None,
        )


async def _create_import(client):
    app.dependency_overrides[dependencies.get_ocr_service] = lambda: FakeOCRService()
    response = await client.post(
        "/api/v1/inventory-imports/from-photo",
        files={"file": ("inventory.jpg", b"fake-image", "image/jpeg")},
    )
    assert response.status_code == 201
    return response.json()


async def test_create_import_from_photo_persists_needs_review(client):
    data = await _create_import(client)

    assert data["status"] == "needs_review"
    assert data["items_count"] == 2
    assert data["raw_text"] == "Arroz 1kg 12.50 20\nAceite 1l 18.00 5"
    assert [item["name"] for item in data["items"]] == ["Arroz 1kg", "Aceite 1l"]

    list_response = await client.get("/api/v1/inventory-imports")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1


async def test_get_import_is_store_scoped(client):
    data = await _create_import(client)

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": uuid4()}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    response = await client.get(f"/api/v1/inventory-imports/{data['id']}")
    assert response.status_code == 404


async def test_update_import_item_validates_fields(client):
    data = await _create_import(client)
    item_id = data["items"][0]["id"]

    invalid = await client.patch(
        f"/api/v1/inventory-imports/{data['id']}/items/{item_id}",
        json={"price": "-1.00"},
    )
    assert invalid.status_code == 422

    valid = await client.patch(
        f"/api/v1/inventory-imports/{data['id']}/items/{item_id}",
        json={"status": "approved", "name": "Arroz Premium 1kg", "price": "13.00", "stock": 25},
    )
    assert valid.status_code == 200
    assert valid.json()["items"][0]["status"] == "approved"
    assert valid.json()["items"][0]["name"] == "Arroz Premium 1kg"


async def test_confirm_import_creates_products_and_stock_movements(client, db_session):
    data = await _create_import(client)
    for item in data["items"]:
        response = await client.patch(
            f"/api/v1/inventory-imports/{data['id']}/items/{item['id']}",
            json={"status": "approved"},
        )
        assert response.status_code == 200

    confirm = await client.post(f"/api/v1/inventory-imports/{data['id']}/confirm")
    assert confirm.status_code == 200
    assert confirm.json()["created_products"] == 2

    products = await client.get("/api/v1/products")
    assert products.json()["total"] == 2
    assert {product["stock"] for product in products.json()["items"]} == {20, 5}

    movements = (await db_session.execute(StockMovementModel.__table__.select())).all()
    assert len(movements) == 2
    assert {movement.movement_type for movement in movements} == {"import"}


async def test_confirm_import_ignores_rejected_items(client):
    data = await _create_import(client)
    approved, rejected = data["items"]
    await client.patch(
        f"/api/v1/inventory-imports/{data['id']}/items/{approved['id']}",
        json={"status": "approved"},
    )
    await client.patch(
        f"/api/v1/inventory-imports/{data['id']}/items/{rejected['id']}",
        json={"status": "rejected"},
    )

    confirm = await client.post(f"/api/v1/inventory-imports/{data['id']}/confirm")
    assert confirm.status_code == 200
    assert confirm.json()["created_products"] == 1

    products = await client.get("/api/v1/products")
    assert products.json()["total"] == 1


async def test_confirm_import_is_idempotency_guarded(client):
    data = await _create_import(client)
    item_id = data["items"][0]["id"]
    await client.patch(
        f"/api/v1/inventory-imports/{data['id']}/items/{item_id}",
        json={"status": "approved"},
    )

    first = await client.post(f"/api/v1/inventory-imports/{data['id']}/confirm")
    assert first.status_code == 200

    second = await client.post(f"/api/v1/inventory-imports/{data['id']}/confirm")
    assert second.status_code == 409

    products = await client.get("/api/v1/products")
    assert products.json()["total"] == 1


async def test_cancel_confirmed_import_is_rejected(client):
    data = await _create_import(client)
    item_id = data["items"][0]["id"]
    await client.patch(
        f"/api/v1/inventory-imports/{data['id']}/items/{item_id}",
        json={"status": "approved"},
    )
    await client.post(f"/api/v1/inventory-imports/{data['id']}/confirm")

    cancel = await client.post(f"/api/v1/inventory-imports/{data['id']}/cancel")
    assert cancel.status_code == 409


async def test_ocr_failure_is_persisted_as_failed(client, db_session):
    class FailingOCRService:
        async def extract_from_bytes(self, image_bytes: bytes) -> OCRResult:
            raise RuntimeError("ocr unavailable")

    app.dependency_overrides[dependencies.get_ocr_service] = lambda: FailingOCRService()

    response = await client.post(
        "/api/v1/inventory-imports/from-photo",
        files={"file": ("inventory.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 201
    assert response.json()["status"] == "failed"
    assert response.json()["error_message"] == "ocr unavailable"

    imports = (await db_session.execute(InventoryImportModel.__table__.select())).all()
    assert len(imports) == 1


async def test_missing_ocr_service_is_persisted_as_failed(client):
    app.dependency_overrides[dependencies.get_ocr_service] = lambda: None

    response = await client.post(
        "/api/v1/inventory-imports/from-photo",
        files={"file": ("inventory.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "failed"
    assert data["items_count"] == 0
    assert "OCR no esta disponible" in data["error_message"]
