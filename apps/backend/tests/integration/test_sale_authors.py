from uuid import uuid4

from src.infrastructure.database.models import UserModel
from src.main import app
from src.presentation import dependencies


async def _sale(client) -> dict:
    product = await client.post("/api/v1/products", json={"name": "Pan", "price": "0.50", "stock": 20})
    assert product.status_code == 201
    current = await client.get("/api/v1/store-day/current")
    if current.json()["status"] != "open":
        assert (await client.post("/api/v1/store-day/open")).status_code == 201
    sale = await client.post(
        "/api/v1/sales", json={"items": [{"product_id": product.json()["id"], "quantity": 2}]}
    )
    assert sale.status_code == 201, sale.text
    return sale.json()


async def test_sale_shows_who_sold_it(client, db_session):
    owner = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    owner.full_name = "Rosa Quispe"
    await db_session.commit()

    sale = await _sale(client)

    assert sale["created_by_name"] == "Rosa Quispe"
    assert sale["voided_by_name"] is None
    detail = (await client.get(f"/api/v1/sales/{sale['id']}")).json()
    assert detail["created_by_name"] == "Rosa Quispe"
    listed = (await client.get("/api/v1/sales")).json()["items"][0]
    assert listed["created_by_name"] == "Rosa Quispe"


async def test_sale_author_falls_back_to_email_name(client, db_session):
    owner = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    owner.full_name = None
    await db_session.commit()

    sale = await _sale(client)

    assert sale["created_by_name"] == "dev"


async def test_void_records_who_voided_the_sale(client, db_session):
    sale = await _sale(client)
    other_owner_id = uuid4()
    db_session.add(
        UserModel(
            id=other_owner_id,
            email="luis@example.com",
            full_name="Luis Mamani",
            store_id=dependencies.DEV_STORE_ID,
            role="owner",
            is_active=True,
        )
    )
    await db_session.commit()

    async def other_owner():
        return {"id": other_owner_id, "email": "luis@example.com", "store_id": dependencies.DEV_STORE_ID}

    app.dependency_overrides[dependencies.get_current_user] = other_owner

    voided = await client.post(f"/api/v1/sales/{sale['id']}/void", json={"reason": "Cobro duplicado"})

    assert voided.status_code == 200, voided.text
    body = voided.json()
    assert body["status"] == "voided"
    assert body["voided_by_user_id"] == str(other_owner_id)
    assert body["voided_by_name"] == "Luis Mamani"
    assert body["created_by_name"] != "Luis Mamani"
    detail = (await client.get(f"/api/v1/sales/{sale['id']}")).json()
    assert detail["voided_by_name"] == "Luis Mamani"


async def test_sale_shows_customer_and_device(client):
    product = await client.post("/api/v1/products", json={"name": "Leche", "price": "6.00", "stock": 5})
    current = await client.get("/api/v1/store-day/current")
    if current.json()["status"] != "open":
        assert (await client.post("/api/v1/store-day/open")).status_code == 201
    sale = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": product.json()["id"], "quantity": 1}],
            "customer_name": "Ana",
            "device_id": "web-pos",
        },
    )
    assert sale.status_code == 201, sale.text

    detail = (await client.get(f"/api/v1/sales/{sale.json()['id']}")).json()
    assert detail["customer_name"] == "Ana"
    assert detail["device_id"] == "web-pos"
