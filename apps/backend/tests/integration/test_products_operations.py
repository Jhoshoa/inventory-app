from uuid import uuid4

from src.main import app
from src.presentation import dependencies


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


async def test_products_search_matches_name_only(client):
    await client.post(
        "/api/v1/products",
        json={"name": "Cafe", "price": "20.00", "stock": 2, "sku": "MATCH-001", "qr_code": "MATCH-QR"},
    )
    await client.post(
        "/api/v1/products",
        json={"name": "Matcha", "price": "30.00", "stock": 2, "sku": "TEA-001", "qr_code": "TEA-QR"},
    )

    response = await client.get("/api/v1/products?q=mat")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["name"] == "Matcha"


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


async def test_product_qr_lookup_is_store_scoped(client):
    create_response = await client.post(
        "/api/v1/products",
        json={"name": "Cafe", "price": "20.00", "stock": 2, "qr_code": "QR-STORE-A"},
    )
    assert create_response.status_code == 201

    async def other_store_user():
        return {"id": uuid4(), "email": "other@local.dev", "store_id": uuid4()}

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


async def test_low_stock_endpoint_returns_ordered_products(client):
    await client.post("/api/v1/products", json={"name": "Tres", "price": "10.00", "stock": 3, "min_stock": 5})
    await client.post("/api/v1/products", json={"name": "Cero", "price": "10.00", "stock": 0, "min_stock": 5})
    await client.post("/api/v1/products", json={"name": "Alto", "price": "10.00", "stock": 10, "min_stock": 5})

    response = await client.get("/api/v1/products/low-stock")
    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["Cero", "Tres"]
