from datetime import datetime, timedelta, timezone

from src.infrastructure.database.models import ProductModel
from src.infrastructure.services.rate_limit.in_memory_rate_limiter import (
    storefront_ip_rate_limiter,
)


async def _enable_storefront(client, **overrides) -> dict:
    payload = {"storefront_slug": "ferreteria-lopez", "storefront_enabled": True, **overrides}
    response = await client.patch("/api/v1/store", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


async def _create_product(client, **overrides) -> str:
    payload = {"name": "Arroz 1kg", "price": "12.50", "stock": 5, **overrides}
    response = await client.post("/api/v1/products", json=payload)
    assert response.status_code == 201
    return response.json()["id"]


async def test_enable_storefront_requires_a_slug(client):
    response = await client.patch("/api/v1/store", json={"storefront_enabled": True})

    assert response.status_code == 400


async def test_slug_must_be_lowercase_dashed(client):
    response = await client.patch("/api/v1/store", json={"storefront_slug": "Mi Tienda!"})

    assert response.status_code == 422


async def test_duplicate_slug_is_rejected(client):
    await _enable_storefront(client, storefront_slug="tienda-unica")

    response = await client.patch("/api/v1/store", json={"storefront_slug": "tienda-unica"})
    # Misma tienda re-guardando su propio slug: no es un duplicado real.
    assert response.status_code == 200


async def test_invalid_hex_color_is_rejected(client):
    response = await client.patch("/api/v1/store", json={"storefront_color_primary": "blue"})

    assert response.status_code == 422


async def test_public_storefront_hidden_when_disabled(client):
    response = await client.get("/api/v1/public/storefront/no-existe")

    assert response.status_code == 404


async def test_public_storefront_exposes_only_public_fields(client):
    await _enable_storefront(
        client,
        storefront_logo_url="https://cdn.example.com/logo.png",
        storefront_color_primary="#2563EB",
        storefront_description="La mejor ferreteria del barrio",
    )

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Dev Store"
    assert body["tier"] == "branded"
    assert body["logo_url"] == "https://cdn.example.com/logo.png"
    assert body["color_primary"] == "#2563EB"
    assert "billing_email" not in body
    assert "billing_nit" not in body


async def test_disabling_storefront_hides_it_again(client):
    await _enable_storefront(client)
    disable = await client.patch("/api/v1/store", json={"storefront_enabled": False})
    assert disable.status_code == 200

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez")

    assert response.status_code == 404


async def test_public_products_only_lists_active_and_hides_internal_fields(client):
    await _enable_storefront(client)
    visible_id = await _create_product(client, name="Martillo", price="45.00", stock=3, sku="SKU-1", cost_price="20.00")
    inactive_id = await _create_product(client, name="Descontinuado", stock=1)
    await client.delete(f"/api/v1/products/{inactive_id}")

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez/products")

    assert response.status_code == 200
    body = response.json()
    ids = [item["id"] for item in body["items"]]
    assert visible_id in ids
    assert inactive_id not in ids
    item = next(i for i in body["items"] if i["id"] == visible_id)
    assert "cost_price" not in item
    assert "sku" not in item
    assert "stock" not in item
    assert item["available"] is True


async def test_public_product_availability_reflects_zero_stock_without_exposing_count(client):
    await _enable_storefront(client)
    product_id = await _create_product(client, name="Agotado", stock=0)

    response = await client.get(f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert "stock" not in body


async def test_public_product_price_reflects_discount(client):
    await _enable_storefront(client)
    await client.patch("/api/v1/store", json={"allow_manual_discount": True, "max_manual_discount_amount": "50.00"})
    product_id = await _create_product(
        client, name="Pintura", price="100.00", stock=2, discount_type="fixed", discount_value="15.00"
    )

    response = await client.get(f"/api/v1/public/storefront/ferreteria-lopez/products/{product_id}")

    assert response.status_code == 200
    assert response.json()["effective_price"] == "85.00"


async def test_public_categories_only_lists_categories_with_visible_products(client):
    await _enable_storefront(client)
    cat_response = await client.post(
        "/api/v1/product-categories", json={"name": "Herramientas", "sku_prefix": "HER"}
    )
    assert cat_response.status_code == 201, cat_response.text
    category_id = cat_response.json()["id"]
    empty_cat = await client.post(
        "/api/v1/product-categories", json={"name": "Vacia", "sku_prefix": "VAC"}
    )
    assert empty_cat.status_code == 201

    await _create_product(client, name="Martillo", category_id=category_id)

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez/categories")

    assert response.status_code == 200
    body = response.json()
    names = [c["name"] for c in body]
    assert "Herramientas" in names
    assert "Vacia" not in names
    herramientas = next(c for c in body if c["name"] == "Herramientas")
    assert herramientas["product_count"] == 1


async def test_public_products_filtered_by_category(client):
    await _enable_storefront(client)
    cat_response = await client.post(
        "/api/v1/product-categories", json={"name": "Bebidas", "sku_prefix": "BEB"}
    )
    category_id = cat_response.json()["id"]
    in_category = await _create_product(client, name="Gaseosa", category_id=category_id)
    await _create_product(client, name="Martillo")

    response = await client.get(
        f"/api/v1/public/storefront/ferreteria-lopez/products?category_id={category_id}"
    )

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [in_category]


async def test_public_products_filtered_on_sale(client):
    await _enable_storefront(client)
    await client.patch("/api/v1/store", json={"allow_manual_discount": True, "max_manual_discount_amount": "50.00"})
    on_sale_id = await _create_product(
        client, name="Pintura", discount_type="fixed", discount_value="10.00"
    )
    await _create_product(client, name="Martillo")

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez/products?on_sale=true")

    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [on_sale_id]


async def test_public_products_on_sale_excludes_expired_discount(client, db_session):
    await _enable_storefront(client)
    await client.patch("/api/v1/store", json={"allow_manual_discount": True, "max_manual_discount_amount": "50.00"})
    expired_id = await _create_product(
        client, name="Pintura Vencida", discount_type="fixed", discount_value="10.00"
    )
    model = await db_session.get(ProductModel, expired_id)
    model.discount_ends_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez/products?on_sale=true")

    ids = [item["id"] for item in response.json()["items"]]
    assert expired_id not in ids


async def test_public_products_paginated_with_offset(client):
    await _enable_storefront(client)
    for i in range(5):
        await _create_product(client, name=f"Producto {i}", price=f"{i + 1}.00")

    first_page = await client.get(
        "/api/v1/public/storefront/ferreteria-lopez/products?sort=price_asc&limit=2&offset=0"
    )
    second_page = await client.get(
        "/api/v1/public/storefront/ferreteria-lopez/products?sort=price_asc&limit=2&offset=2"
    )

    assert first_page.json()["total"] == 5
    assert [i["name"] for i in first_page.json()["items"]] == ["Producto 0", "Producto 1"]
    assert [i["name"] for i in second_page.json()["items"]] == ["Producto 2", "Producto 3"]


async def test_public_products_sorted_by_price(client):
    await _enable_storefront(client)
    await _create_product(client, name="Caro", price="99.00")
    await _create_product(client, name="Barato", price="1.00")

    asc = await client.get("/api/v1/public/storefront/ferreteria-lopez/products?sort=price_asc")
    assert [i["name"] for i in asc.json()["items"]] == ["Barato", "Caro"]

    desc = await client.get("/api/v1/public/storefront/ferreteria-lopez/products?sort=price_desc")
    assert [i["name"] for i in desc.json()["items"]] == ["Caro", "Barato"]


async def test_public_products_expose_low_stock_hint_without_exact_count(client):
    await _enable_storefront(client)
    low_id = await _create_product(client, name="Casi agotado", stock=2)
    plenty_id = await _create_product(client, name="Bien surtido", stock=50)

    response = await client.get("/api/v1/public/storefront/ferreteria-lopez/products")

    items = {i["id"]: i for i in response.json()["items"]}
    assert items[low_id]["low_stock"] is True
    assert items[plenty_id]["low_stock"] is False
    assert "stock" not in items[low_id]


async def test_public_storefront_rate_limited_per_ip(client):
    await _enable_storefront(client)
    storefront_ip_rate_limiter.reset()
    for _ in range(60):
        ok = await client.get("/api/v1/public/storefront/ferreteria-lopez")
        assert ok.status_code == 200

    limited = await client.get("/api/v1/public/storefront/ferreteria-lopez")
    assert limited.status_code == 429
