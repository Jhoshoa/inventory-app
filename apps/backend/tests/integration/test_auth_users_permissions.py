from uuid import uuid4

from sqlalchemy import delete

from src.infrastructure.database.models import StoreModel, UserModel
from src.presentation import dependencies


async def test_register_creates_store_and_owner_user(client, db_session):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@example.com",
            "password": "password123",
            "full_name": "Owner User",
            "store_name": "Owner Store",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "owner"

    store = await db_session.get(StoreModel, data["user"]["store_id"])
    user = await db_session.get(UserModel, data["user"]["id"])
    assert store.name == "Owner Store"
    assert user.email == "owner@example.com"
    assert user.store_id == store.id
    assert user.role == "owner"


async def test_login_creates_missing_local_dev_user(client, db_session):
    await db_session.execute(delete(UserModel).where(UserModel.id == dependencies.DEV_USER_ID))
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev-login@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    assert user.email == "dev-login@example.com"
    assert user.store_id == dependencies.DEV_STORE_ID
    assert user.last_login_at is not None


async def test_auth_me_returns_local_role_and_store(client):
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(dependencies.DEV_USER_ID)
    assert data["store_id"] == str(dependencies.DEV_STORE_ID)
    assert data["role"] == "owner"
    assert data["is_active"] is True


async def test_inactive_user_cannot_get_context(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.is_active = False
    await db_session.commit()

    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401


async def test_cashier_cannot_update_store(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    response = await client.patch("/api/v1/store", json={"name": "Cashier Store"})

    assert response.status_code == 403


async def test_owner_can_update_store(client):
    response = await client.patch("/api/v1/store", json={"name": "Owner Store"})

    assert response.status_code == 200
    assert response.json()["name"] == "Owner Store"


async def test_cashier_cannot_confirm_inventory_import(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    response = await client.post(f"/api/v1/inventory-imports/{uuid4()}/confirm")

    assert response.status_code == 403


async def test_cashier_cannot_delete_product(client, db_session):
    create_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 1})
    assert create_response.status_code == 201

    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    delete_response = await client.delete(f"/api/v1/products/{create_response.json()['id']}")

    assert delete_response.status_code == 403


async def test_owner_lists_only_store_users(client, db_session):
    other_store_id = uuid4()
    other_user_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    db_session.add(
        UserModel(
            id=other_user_id,
            email="other@example.com",
            store_id=other_store_id,
            role="owner",
            is_active=True,
        )
    )
    db_session.add(
        UserModel(
            id=uuid4(),
            email="cashier@example.com",
            store_id=dependencies.DEV_STORE_ID,
            role="cashier",
            is_active=True,
        )
    )
    await db_session.commit()

    response = await client.get("/api/v1/users")

    assert response.status_code == 200
    emails = {user["email"] for user in response.json()["items"]}
    assert emails == {"dev@local.dev", "cashier@example.com"}


async def test_owner_changes_cashier_role(client, db_session):
    cashier_id = uuid4()
    db_session.add(
        UserModel(
            id=cashier_id,
            email="cashier@example.com",
            store_id=dependencies.DEV_STORE_ID,
            role="cashier",
            is_active=True,
        )
    )
    await db_session.commit()

    response = await client.patch(f"/api/v1/users/{cashier_id}/role", json={"role": "owner"})

    assert response.status_code == 200
    assert response.json()["role"] == "owner"


async def test_cannot_remove_last_active_owner(client):
    response = await client.patch(f"/api/v1/users/{dependencies.DEV_USER_ID}/role", json={"role": "cashier"})

    assert response.status_code == 409


async def test_cannot_disable_last_active_owner(client):
    response = await client.patch(f"/api/v1/users/{dependencies.DEV_USER_ID}/status", json={"is_active": False})

    assert response.status_code == 409


async def test_cannot_modify_user_from_another_store(client, db_session):
    other_store_id = uuid4()
    other_user_id = uuid4()
    db_session.add(StoreModel(id=other_store_id, name="Other Store"))
    db_session.add(
        UserModel(
            id=other_user_id,
            email="other@example.com",
            store_id=other_store_id,
            role="cashier",
            is_active=True,
        )
    )
    await db_session.commit()

    response = await client.patch(f"/api/v1/users/{other_user_id}/role", json={"role": "owner"})

    assert response.status_code == 404
