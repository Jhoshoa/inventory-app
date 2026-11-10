import pytest

from src.application.dto.storefront_settings_dto import StorefrontSettingsDTO

OPEN_WEEKDAYS = [
    *[{"is_open": True, "opens_at": "08:00", "closes_at": "21:00"} for _ in range(6)],
    {"is_open": False},
]


async def _enable_storefront(client, **overrides) -> dict:
    payload = {"storefront_slug": "ferreteria-lopez", "storefront_enabled": True, **overrides}
    response = await client.patch("/api/v1/store", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


async def _save_settings(client, **settings):
    return await client.patch("/api/v1/store", json={"storefront_settings": settings})


async def _create_product(client, **overrides) -> str:
    payload = {"name": "Arroz 1kg", "price": "12.50", "stock": 5, **overrides}
    response = await client.post("/api/v1/products", json=payload)
    assert response.status_code == 201
    return response.json()["id"]


async def test_store_without_saved_settings_returns_defaults(client):
    body = await _enable_storefront(client)

    settings = body["storefront_settings"]
    assert settings["show_featured"] is True
    assert settings["pickup_enabled"] is True
    assert settings["delivery_enabled"] is False
    assert settings["default_sort"] == "name"
    assert settings["hours"] is None


async def test_settings_are_saved_and_exposed_in_the_public_storefront(client):
    await _enable_storefront(client)

    response = await _save_settings(
        client,
        announcement_enabled=True,
        announcement_text="  Envios gratis los sabados  ",
        delivery_enabled=True,
        address="Calle Sucre 123, zona Central",
        maps_url="maps.app.goo.gl/abc123",
        instagram="@ferre.lopez",
        tiktok="https://www.tiktok.com/@ferrelopez",
        facebook="https://www.facebook.com/ferreterialopez/",
        hours=OPEN_WEEKDAYS,
    )

    assert response.status_code == 200, response.text
    public = (await client.get("/api/v1/public/storefront/ferreteria-lopez")).json()
    settings = public["settings"]
    assert settings["announcement_text"] == "Envios gratis los sabados"
    assert settings["maps_url"] == "https://maps.app.goo.gl/abc123"
    assert settings["instagram"] == "ferre.lopez"
    assert settings["tiktok"] == "ferrelopez"
    assert settings["facebook"] == "ferreterialopez"
    assert settings["hours"][0] == {"is_open": True, "opens_at": "08:00", "closes_at": "21:00"}
    assert settings["hours"][6] == {"is_open": False, "opens_at": None, "closes_at": None}
    assert public["timezone"] == "America/La_Paz"


async def test_saving_other_store_fields_keeps_the_settings(client):
    await _enable_storefront(client)
    await _save_settings(client, delivery_enabled=True)

    response = await client.patch("/api/v1/store", json={"storefront_description": "Nueva"})

    assert response.json()["storefront_settings"]["delivery_enabled"] is True


@pytest.mark.parametrize(
    "settings",
    [
        {"maps_url": "https://evil.example.com/maps"},
        {"maps_url": "javascript:alert(1)"},
        {"instagram": "https://evil.example.com/x"},
        {"tiktok": "con espacios"},
        {"facebook": "https://twitter.com/tienda"},
        {"announcement_enabled": True, "announcement_text": "   "},
        {"hours": OPEN_WEEKDAYS[:3]},
        {"hours": [{"is_open": True, "opens_at": "08:00"}, *OPEN_WEEKDAYS[1:]]},
        {"hours": [{"is_open": True, "opens_at": "25:00", "closes_at": "26:00"}, *OPEN_WEEKDAYS[1:]]},
        {"stock_display": "exact"},
        {"default_sort": "random"},
    ],
)
async def test_invalid_settings_are_rejected(client, settings):
    await _enable_storefront(client)

    response = await _save_settings(client, **settings)

    assert response.status_code == 422, response.text


def test_facebook_profile_links_keep_the_profile_id():
    settings = StorefrontSettingsDTO(facebook="https://www.facebook.com/profile.php?id=100012345678")

    assert settings.facebook == "profile.php?id=100012345678"


def test_hours_all_closed_means_no_schedule():
    settings = StorefrontSettingsDTO(hours=[{"is_open": False}] * 7)

    assert settings.hours is None


async def test_hide_out_of_stock_removes_them_from_listing_and_category_counts(client):
    await _enable_storefront(client)
    category_id = (
        await client.post("/api/v1/product-categories", json={"name": "Herramientas", "sku_prefix": "HER"})
    ).json()["id"]
    in_stock = await _create_product(client, name="Martillo", stock=4, category_id=category_id)
    sold_out = await _create_product(client, name="Serrucho", stock=0, category_id=category_id)
    await _save_settings(client, hide_out_of_stock=True)

    products = (await client.get("/api/v1/public/storefront/ferreteria-lopez/products")).json()
    categories = (await client.get("/api/v1/public/storefront/ferreteria-lopez/categories")).json()
    direct = await client.get(f"/api/v1/public/storefront/ferreteria-lopez/products/{sold_out}")

    ids = [item["id"] for item in products["items"]]
    assert ids == [in_stock]
    assert products["total"] == 1
    assert categories[0]["product_count"] == 1
    # El link directo sigue abriendo (pudo haberse compartido), como agotado.
    assert direct.status_code == 200
    assert direct.json()["available"] is False


async def test_stock_display_out_of_stock_only_never_sends_the_low_stock_hint(client):
    await _enable_storefront(client)
    low_id = await _create_product(client, name="Casi agotado", stock=2)
    await _save_settings(client, stock_display="out_of_stock")

    listing = (await client.get("/api/v1/public/storefront/ferreteria-lopez/products")).json()
    detail = (await client.get(f"/api/v1/public/storefront/ferreteria-lopez/products/{low_id}")).json()

    assert listing["items"][0]["low_stock"] is False
    assert detail["low_stock"] is False
    assert detail["available"] is True


async def test_featured_falls_back_to_products_on_sale(client):
    await _enable_storefront(client)
    await client.patch("/api/v1/store", json={"allow_manual_discount": True, "max_manual_discount_amount": "50.00"})
    on_sale = await _create_product(client, name="En oferta", discount_type="fixed", discount_value="2.00")
    await _create_product(client, name="Precio normal")

    body = (await client.get("/api/v1/public/storefront/ferreteria-lopez/featured")).json()

    assert body["source"] == "on_sale"
    assert [item["id"] for item in body["items"]] == [on_sale]


async def test_featured_shows_the_chosen_products_in_the_chosen_order(client):
    await _enable_storefront(client)
    first = await _create_product(client, name="Zapallo")
    second = await _create_product(client, name="Arroz")
    deleted = await _create_product(client, name="Borrado")
    await client.delete(f"/api/v1/products/{deleted}")
    response = await _save_settings(client, featured_product_ids=[first, deleted, second, first])
    assert response.status_code == 200, response.text
    # Los repetidos se guardan una sola vez.
    assert response.json()["storefront_settings"]["featured_product_ids"] == [first, deleted, second]

    body = (await client.get("/api/v1/public/storefront/ferreteria-lopez/featured")).json()

    assert body["source"] == "manual"
    assert [item["id"] for item in body["items"]] == [first, second]


async def test_featured_hides_sold_out_choices_when_the_store_hides_them(client):
    await _enable_storefront(client)
    sold_out = await _create_product(client, name="Agotado", stock=0)
    in_stock = await _create_product(client, name="Con stock", stock=3)
    await _save_settings(client, featured_product_ids=[sold_out, in_stock], hide_out_of_stock=True)

    body = (await client.get("/api/v1/public/storefront/ferreteria-lopez/featured")).json()

    assert [item["id"] for item in body["items"]] == [in_stock]


async def test_featured_ignores_products_from_another_store(client, db_session):
    from uuid import uuid4

    await _enable_storefront(client)
    await _save_settings(client, featured_product_ids=[str(uuid4())])

    body = (await client.get("/api/v1/public/storefront/ferreteria-lopez/featured")).json()

    # Ninguno elegido existe en esta tienda: se vuelve a las ofertas.
    assert body["source"] == "on_sale"
    assert body["items"] == []


async def test_featured_allows_at_most_ten_products(client):
    from uuid import uuid4

    await _enable_storefront(client)

    response = await _save_settings(client, featured_product_ids=[str(uuid4()) for _ in range(11)])

    assert response.status_code == 422
