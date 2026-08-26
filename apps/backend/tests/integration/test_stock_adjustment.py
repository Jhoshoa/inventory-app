async def _create_product(client, stock: int = 5) -> str:
    response = await client.post(
        "/api/v1/products",
        json={"name": "Arroz 1kg", "price": "12.50", "stock": stock},
    )
    assert response.status_code == 201
    return response.json()["id"]


async def test_adjust_stock_increments_and_returns_updated_product(client):
    product_id = await _create_product(client, stock=5)

    response = await client.patch(f"/api/v1/products/{product_id}/stock", json={"quantity": 3})

    assert response.status_code == 200
    assert response.json()["stock"] == 8


async def test_adjust_stock_rejects_zero_quantity(client):
    product_id = await _create_product(client, stock=5)

    response = await client.patch(f"/api/v1/products/{product_id}/stock", json={"quantity": 0})

    assert response.status_code == 422


async def test_adjust_stock_rejects_quantity_over_the_max_bound(client):
    product_id = await _create_product(client, stock=5)

    response = await client.patch(
        f"/api/v1/products/{product_id}/stock", json={"quantity": 1_000_001}
    )

    assert response.status_code == 422


async def test_adjust_stock_insufficient_returns_typed_conflict(client):
    """Regresion: antes esto devolvia 400 generico (ValueError). Debe ser un
    409 con la misma forma estructurada que usa la venta (StockConflictError)."""
    product_id = await _create_product(client, stock=2)

    response = await client.patch(
        f"/api/v1/products/{product_id}/stock",
        json={"quantity": -5, "reason": "conteo"},
    )

    assert response.status_code == 409
    body = response.json()
    assert body["error"] == "stock_conflict"
    conflict = body["stock_conflicts"][0]
    assert conflict["product_id"] == product_id
    assert conflict["available_stock"] == 2
    assert conflict["requested_quantity"] == 5


async def test_adjust_stock_allows_exact_depletion_to_zero(client):
    product_id = await _create_product(client, stock=5)

    response = await client.patch(f"/api/v1/products/{product_id}/stock", json={"quantity": -5})

    assert response.status_code == 200
    assert response.json()["stock"] == 0
