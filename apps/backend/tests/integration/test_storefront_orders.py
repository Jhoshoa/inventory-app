from uuid import uuid4

ORDERS_URL = "/api/v1/public/storefront/ferreteria-lopez/orders"
CUSTOMER = {"customer_name": "Juan Perez", "customer_phone": "70011122"}


async def _enable_storefront(client, **overrides) -> dict:
    payload = {"storefront_slug": "ferreteria-lopez", "storefront_enabled": True, **overrides}
    response = await client.patch("/api/v1/store", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


async def _create_product(client, **overrides) -> str:
    payload = {"name": "Martillo", "price": "45.00", "stock": 5, **overrides}
    response = await client.post("/api/v1/products", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def test_order_with_several_products_uses_server_prices(client):
    await _enable_storefront(client)
    await client.patch("/api/v1/store", json={"allow_manual_discount": True, "max_manual_discount_amount": "50.00"})
    hammer = await _create_product(client, name="Martillo", price="45.00")
    paint = await _create_product(
        client, name="Pintura", price="100.00", discount_type="fixed", discount_value="15.00", unit="litro"
    )

    response = await client.post(
        ORDERS_URL,
        json={
            **CUSTOMER,
            "note": "Paso a las 5",
            # El navegador no manda precios: si mandara, se ignoran.
            "items": [
                {"product_id": hammer, "quantity": 2, "unit_price": "1.00"},
                {"product_id": paint, "quantity": 1},
            ],
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["total"] == "175.00"
    assert body["delivery_method"] == "pickup"
    assert [(i["product_name"], i["quantity"], i["unit_price"], i["line_total"]) for i in body["items"]] == [
        ("Martillo", 2, "45.00", "90.00"),
        ("Pintura", 1, "85.00", "85.00"),
    ]
    assert body["items"][1]["unit"] == "litro"


async def test_owner_sees_the_order_lines_total_and_delivery(client):
    await _enable_storefront(client)
    await client.patch(
        "/api/v1/store",
        json={"storefront_settings": {"pickup_enabled": True, "delivery_enabled": True}},
    )
    hammer = await _create_product(client, name="Martillo", price="45.00")
    nails = await _create_product(client, name="Clavos", price="5.00")

    await client.post(
        ORDERS_URL,
        json={
            **CUSTOMER,
            "delivery_method": "delivery",
            "items": [{"product_id": hammer, "quantity": 1}, {"product_id": nails, "quantity": 3}],
        },
    )

    listing = (await client.get("/api/v1/storefront-requests")).json()
    order = listing["items"][0]
    assert order["product_name"] == "Martillo y 1 mas"
    assert order["total"] == "60.00"
    assert order["delivery_method"] == "delivery"
    assert [i["product_name"] for i in order["items"]] == ["Martillo", "Clavos"]
    assert listing["pending_count"] == 1

    updated = await client.patch(f"/api/v1/storefront-requests/{order['id']}/status", json={"status": "contacted"})
    assert len(updated.json()["items"]) == 2


async def test_repeated_products_become_one_line(client):
    await _enable_storefront(client)
    hammer = await _create_product(client)

    response = await client.post(
        ORDERS_URL,
        json={**CUSTOMER, "items": [{"product_id": hammer, "quantity": 1}, {"product_id": hammer, "quantity": 2}]},
    )

    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["quantity"] == 3


async def test_sold_out_or_unknown_products_are_rejected_with_their_ids(client):
    await _enable_storefront(client)
    in_stock = await _create_product(client, name="Con stock")
    sold_out = await _create_product(client, name="Agotado", stock=0)
    unknown = str(uuid4())

    response = await client.post(
        ORDERS_URL,
        json={
            **CUSTOMER,
            "items": [
                {"product_id": in_stock, "quantity": 1},
                {"product_id": sold_out, "quantity": 1},
                {"product_id": unknown, "quantity": 1},
            ],
        },
    )

    assert response.status_code == 409
    assert set(response.json()["unavailable_product_ids"]) == {sold_out, unknown}
    assert (await client.get("/api/v1/storefront-requests")).json()["total"] == 0


async def test_delivery_method_must_be_one_the_store_offers(client):
    await _enable_storefront(client)
    hammer = await _create_product(client)
    line = [{"product_id": hammer, "quantity": 1}]

    not_offered = await client.post(ORDERS_URL, json={**CUSTOMER, "items": line, "delivery_method": "delivery"})
    assert not_offered.status_code == 400

    await client.patch(
        "/api/v1/store", json={"storefront_settings": {"pickup_enabled": True, "delivery_enabled": True}}
    )
    missing_choice = await client.post(ORDERS_URL, json={**CUSTOMER, "items": line})
    assert missing_choice.status_code == 400


async def test_order_limits(client):
    await _enable_storefront(client)
    hammer = await _create_product(client)

    empty = await client.post(ORDERS_URL, json={**CUSTOMER, "items": []})
    too_many_units = await client.post(ORDERS_URL, json={**CUSTOMER, "items": [{"product_id": hammer, "quantity": 1000}]})
    too_many_lines = await client.post(
        ORDERS_URL, json={**CUSTOMER, "items": [{"product_id": str(uuid4()), "quantity": 1} for _ in range(31)]}
    )

    assert empty.status_code == 422
    assert too_many_units.status_code == 422
    assert too_many_lines.status_code == 422


async def test_order_on_disabled_storefront_returns_404(client):
    hammer = await _create_product(client)

    response = await client.post(ORDERS_URL, json={**CUSTOMER, "items": [{"product_id": hammer, "quantity": 1}]})

    assert response.status_code == 404


async def test_single_product_requests_still_work_and_have_no_lines(client):
    await _enable_storefront(client)
    hammer = await _create_product(client)

    response = await client.post(
        f"/api/v1/public/storefront/ferreteria-lopez/products/{hammer}/requests", json=CUSTOMER
    )

    assert response.status_code == 201
    body = response.json()
    assert body["items"] == []
    assert body["total"] is None
