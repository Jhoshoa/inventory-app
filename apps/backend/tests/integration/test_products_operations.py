from uuid import uuid4

from src.application.ports.photo_storage import IPhotoStorage
from src.infrastructure.database.models import StoreModel, UserModel
from src.main import app
from src.presentation import dependencies

_PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 32


class _FakePhotoStorage(IPhotoStorage):
    def __init__(self):
        self.uploaded: list[str] = []
        self.deleted: list[str] = []

    async def upload(self, image_bytes: bytes, public_id: str) -> str:
        self.uploaded.append(public_id)
        return f"https://res.cloudinary.com/demo/image/upload/{public_id}.png"

    async def delete(self, public_id: str) -> None:
        self.deleted.append(public_id)


async def test_products_search_filters_and_pagination(client):
    await client.post("/api/v1/products", json={"name": "Arroz 1kg", "price": "12.50", "stock": 10, "category": "Abarrotes", "sku": "ARR-1"})
    await client.post("/api/v1/products", json={"name": "Aceite 1l", "price": "18.00", "stock": 5, "category": "Abarrotes", "sku": "ACE-1"})
    await client.post("/api/v1/products", json={"name": "Leche", "price": "9.00", "stock": 3, "category": "Lacteos", "sku": "LEC-1"})

    search_response = await client.get("/api/v1/products?q=arr")
    assert search_response.status_code == 200
    assert search_response.json()["total"] == 1
    assert search_response.json()["items"][0]["name"] == "Arroz 1kg"

    category_response = await client.get("/api/v1/products?category=Abarrotes&limit=1&offset=1")
    assert category_response.status_code == 200
    assert category_response.json()["total"] == 2
    assert len(category_response.json()["items"]) == 1


async def test_products_search_matches_name_sku_and_qr_code(client):
    await client.post(
        "/api/v1/products",
        json={"name": "Cafe", "price": "20.00", "stock": 2, "sku": "MATCH-001", "qr_code": "MATCH-QR"},
    )
    await client.post(
        "/api/v1/products",
        json={"name": "Matcha", "price": "30.00", "stock": 2, "sku": "TEA-001", "qr_code": "TEA-QR"},
    )

    name_response = await client.get("/api/v1/products?q=mat")
    sku_response = await client.get("/api/v1/products?q=MATCH-001")
    qr_response = await client.get("/api/v1/products?q=TEA-QR")

    assert name_response.status_code == 200
    assert name_response.json()["total"] == 2
    assert {item["name"] for item in name_response.json()["items"]} == {"Cafe", "Matcha"}
    assert sku_response.status_code == 200
    assert sku_response.json()["items"][0]["name"] == "Cafe"
    assert qr_response.status_code == 200
    assert qr_response.json()["items"][0]["name"] == "Matcha"


async def test_products_search_rejects_short_query(client):
    response = await client.get("/api/v1/products?q=ar")
    assert response.status_code == 422

    pos_response = await client.get("/api/v1/products/pos?q=ar")
    assert pos_response.status_code == 422


async def test_products_stock_filters(client):
    await client.post("/api/v1/products", json={"name": "Disponible", "price": "10.00", "stock": 10, "min_stock": 2})
    await client.post("/api/v1/products", json={"name": "Bajo", "price": "10.00", "stock": 2, "min_stock": 5})
    await client.post("/api/v1/products", json={"name": "Cero", "price": "10.00", "stock": 0, "min_stock": 5})

    available = await client.get("/api/v1/products?stock=available")
    assert available.json()["total"] == 2

    low = await client.get("/api/v1/products?stock=low")
    assert {item["name"] for item in low.json()["items"]} == {"Bajo", "Cero"}

    out = await client.get("/api/v1/products?stock=out")
    assert {item["name"] for item in out.json()["items"]} == {"Cero"}


async def test_product_qr_is_generated_and_lookup_works(client):
    create_response = await client.post("/api/v1/products", json={"name": "Fideo", "price": "8.50", "stock": 4})
    product = create_response.json()

    assert product["qr_code"].startswith("P-")

    qr_response = await client.get(f"/api/v1/products/qr/{product['qr_code']}")
    assert qr_response.status_code == 200
    assert qr_response.json()["id"] == product["id"]


async def test_product_qr_lookup_is_store_scoped(client, db_session):
    create_response = await client.post(
        "/api/v1/products",
        json={"name": "Cafe", "price": "20.00", "stock": 2, "qr_code": "QR-STORE-A"},
    )
    assert create_response.status_code == 201

    other_store_id = uuid4()
    other_user_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    db_session.add(
        UserModel(
            id=other_user_id,
            email="other@local.dev",
            store_id=other_store_id,
            full_name="Other User",
            role="owner",
            is_active=True,
        )
    )
    await db_session.commit()

    async def other_store_user():
        return {"id": other_user_id, "email": "other@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    qr_response = await client.get("/api/v1/products/qr/QR-STORE-A")
    assert qr_response.status_code == 404


async def test_product_qr_collision_rejected(client):
    first_response = await client.post(
        "/api/v1/products",
        json={"name": "Azucar", "price": "10.00", "stock": 2, "qr_code": "QR-DUP"},
    )
    assert first_response.status_code == 201

    second_response = await client.post(
        "/api/v1/products",
        json={"name": "Sal", "price": "4.00", "stock": 2, "qr_code": "QR-DUP"},
    )
    assert second_response.status_code == 409


async def test_product_category_generates_sequential_skus(client):
    category_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Comida", "sku_prefix": "com"},
    )
    assert category_response.status_code == 201
    category = category_response.json()
    assert category["sku_prefix"] == "COM"

    first_response = await client.post(
        "/api/v1/products",
        json={"name": "Pan", "price": "2.00", "stock": 10, "category_id": category["id"]},
    )
    second_response = await client.post(
        "/api/v1/products",
        json={"name": "Galleta", "price": "3.00", "stock": 10, "category_id": category["id"]},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.json()["sku"] == "COM000001"
    assert second_response.json()["sku"] == "COM000002"
    assert first_response.json()["category"] == "Comida"
    assert first_response.json()["category_id"] == category["id"]


async def test_product_category_skips_existing_sku_when_counter_is_stale(client):
    category_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Cemento", "sku_prefix": "CEM"},
    )
    assert category_response.status_code == 201
    category = category_response.json()

    manual_response = await client.post(
        "/api/v1/products",
        json={"name": "Cemento manual", "price": "45.00", "stock": 3, "sku": "CEM000001"},
    )
    auto_response = await client.post(
        "/api/v1/products",
        json={"name": "Cemento automatico", "price": "48.00", "stock": 5, "category_id": category["id"]},
    )

    assert manual_response.status_code == 201
    assert auto_response.status_code == 201
    assert auto_response.json()["sku"] == "CEM000002"


async def test_products_search_filters_by_category_id(client):
    comida_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Comida", "sku_prefix": "COM"},
    )
    bebida_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Bebida", "sku_prefix": "BEB"},
    )
    comida = comida_response.json()
    bebida = bebida_response.json()

    await client.post(
        "/api/v1/products",
        json={"name": "Pan", "price": "2.00", "stock": 10, "category_id": comida["id"]},
    )
    await client.post(
        "/api/v1/products",
        json={"name": "Jugo", "price": "3.00", "stock": 10, "category_id": bebida["id"]},
    )

    response = await client.get(f"/api/v1/products?category_id={comida['id']}")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["name"] == "Pan"


async def test_product_category_prefix_is_unique_by_store(client):
    first_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Comida", "sku_prefix": "COM"},
    )
    second_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Comestibles", "sku_prefix": "COM"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409


async def test_cashier_cannot_manage_product_categories(client, db_session):
    cashier_id = uuid4()
    db_session.add(
        UserModel(
            id=cashier_id,
            email="cashier-categories@local.dev",
            store_id=dependencies.DEV_STORE_ID,
            full_name="Cashier Categories",
            role="cashier",
            is_active=True,
        )
    )
    await db_session.commit()

    async def cashier_user():
        return {"id": cashier_id, "email": "cashier-categories@local.dev", "store_id": dependencies.DEV_STORE_ID}

    app.dependency_overrides[dependencies.get_current_user] = cashier_user

    list_response = await client.get("/api/v1/product-categories")
    create_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Bebidas", "sku_prefix": "BEB"},
    )

    assert list_response.status_code == 403
    assert create_response.status_code == 403


async def test_product_category_is_store_scoped(client, db_session):
    category_response = await client.post(
        "/api/v1/product-categories",
        json={"name": "Comida", "sku_prefix": "COM"},
    )
    assert category_response.status_code == 201
    category = category_response.json()

    other_store_id = uuid4()
    other_user_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    db_session.add(
        UserModel(
            id=other_user_id,
            email="other-categories@local.dev",
            store_id=other_store_id,
            full_name="Other Categories",
            role="owner",
            is_active=True,
        )
    )
    await db_session.commit()

    async def other_store_user():
        return {"id": other_user_id, "email": "other-categories@local.dev", "store_id": other_store_id}

    app.dependency_overrides[dependencies.get_current_user] = other_store_user

    list_response = await client.get("/api/v1/product-categories")
    product_response = await client.post(
        "/api/v1/products",
        json={"name": "Pan otra tienda", "price": "2.00", "stock": 10, "category_id": category["id"]},
    )

    assert list_response.status_code == 200
    assert list_response.json()["items"] == []
    assert product_response.status_code == 404


async def test_product_sku_collision_rejected(client):
    first_response = await client.post(
        "/api/v1/products",
        json={"name": "Azucar", "price": "10.00", "stock": 2, "sku": "ABAR000001"},
    )
    second_response = await client.post(
        "/api/v1/products",
        json={"name": "Sal", "price": "4.00", "stock": 2, "sku": "ABAR000001"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409


async def test_low_stock_endpoint_returns_ordered_products(client):
    await client.post("/api/v1/products", json={"name": "Tres", "price": "10.00", "stock": 3, "min_stock": 5})
    await client.post("/api/v1/products", json={"name": "Cero", "price": "10.00", "stock": 0, "min_stock": 5})
    await client.post("/api/v1/products", json={"name": "Alto", "price": "10.00", "stock": 10, "min_stock": 5})

    response = await client.get("/api/v1/products/low-stock")
    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["Cero", "Tres"]


async def test_photo_upload_does_not_delete_another_stores_cloudinary_asset(client):
    """Regresion de seguridad: photo_url es texto libre (se puede fijar via
    PATCH o import CSV) y no necesariamente fue subido por esta tienda. Al
    reemplazar la foto no debe borrarse en Cloudinary un public_id que no le
    pertenece a esta tienda."""
    fake_storage = _FakePhotoStorage()
    app.dependency_overrides[dependencies.get_photo_storage] = lambda: fake_storage
    try:
        create = await client.post(
            "/api/v1/products", json={"name": "Fideo", "price": "8.00", "stock": 5}
        )
        product_id = create.json()["id"]

        foreign_public_id = "products/00000000-0000-0000-0000-0000000000ff/foreign-product_123"
        patch = await client.patch(
            f"/api/v1/products/{product_id}",
            json={"photo_url": f"https://res.cloudinary.com/demo/image/upload/{foreign_public_id}.png"},
        )
        assert patch.status_code == 200

        upload = await client.post(
            f"/api/v1/products/{product_id}/photo",
            files={"file": ("new.png", _PNG_BYTES, "image/png")},
        )

        assert upload.status_code == 200
        assert foreign_public_id not in fake_storage.deleted
    finally:
        app.dependency_overrides.pop(dependencies.get_photo_storage, None)


async def test_photo_delete_does_not_delete_another_stores_cloudinary_asset(client):
    fake_storage = _FakePhotoStorage()
    app.dependency_overrides[dependencies.get_photo_storage] = lambda: fake_storage
    try:
        create = await client.post(
            "/api/v1/products", json={"name": "Aceite", "price": "18.00", "stock": 5}
        )
        product_id = create.json()["id"]

        foreign_public_id = "products/00000000-0000-0000-0000-0000000000ff/foreign-product_456"
        await client.patch(
            f"/api/v1/products/{product_id}",
            json={"photo_url": f"https://res.cloudinary.com/demo/image/upload/{foreign_public_id}.png"},
        )

        delete = await client.delete(f"/api/v1/products/{product_id}/photo")

        assert delete.status_code == 200
        assert delete.json()["photo_url"] is None
        assert foreign_public_id not in fake_storage.deleted
    finally:
        app.dependency_overrides.pop(dependencies.get_photo_storage, None)
