from uuid import uuid4

from sqlalchemy import select

from src.infrastructure.database.models import StoreModel, UserModel
from src.main import app
from src.presentation import dependencies


async def test_register_creates_store_and_owner_user(client, db_session):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@example.com",
            "password": "Password1!",
            "full_name": "Owner User",
            "store_name": "Owner Store",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert "creada" in data["message"]

    result = await db_session.execute(
        select(UserModel).where(UserModel.email == "owner@example.com")
    )
    user = result.scalar_one_or_none()
    assert user is not None
    assert user.email == "owner@example.com"
    assert user.role == "owner"
    store = await db_session.get(StoreModel, user.store_id)
    assert store.name == "Owner Store"


async def test_login_rejects_unregistered_user(client, db_session):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@example.com", "password": "Password1!"},
    )

    assert response.status_code == 401


async def test_login_rejects_wrong_password_for_registered_user(client, db_session):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@login-test.com",
            "password": "Correct1!",
            "full_name": "Owner",
            "store_name": "Login Test Store",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@login-test.com", "password": "Wrong1!"},
    )

    assert response.status_code == 401


async def test_login_succeeds_with_correct_password(client, db_session):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner@login-ok.com",
            "password": "Secret1!",
            "full_name": "Owner",
            "store_name": "Login Ok Store",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "owner@login-ok.com", "password": "Secret1!"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] is not None
    assert data["user"]["email"] == "owner@login-ok.com"
    assert data["user"]["role"] == "owner"


async def test_dev_login_can_return_cashier_context(client):
    response = await client.post("/api/v1/auth/dev-login", params={"role": "cashier"})

    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == dependencies.DEV_CASHIER_ACCESS_TOKEN
    assert data["user"]["role"] == "cashier"

    app.dependency_overrides.pop(dependencies.get_current_user)
    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )

    assert me.status_code == 200
    assert me.json()["id"] == str(dependencies.DEV_CASHIER_USER_ID)
    assert me.json()["role"] == "cashier"


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


async def test_cashier_cannot_delete_product(client, db_session):
    create_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 1})
    assert create_response.status_code == 201

    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    delete_response = await client.delete(f"/api/v1/products/{create_response.json()['id']}")

    assert delete_response.status_code == 403


async def test_cashier_can_list_products_and_create_sale(client, db_session):
    create_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 3})
    assert create_response.status_code == 201
    open_response = await client.post("/api/v1/store-day/open", json={"opening_note": "Inicio"})
    assert open_response.status_code == 201

    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    products_response = await client.get("/api/v1/products")
    assert products_response.status_code == 200
    assert products_response.json()["total"] == 1

    sale_response = await client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": create_response.json()["id"], "quantity": 1}],
            "payment_method": "efectivo",
        },
    )
    assert sale_response.status_code == 201


async def test_cashier_cannot_create_product(client, db_session):
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 1})

    assert response.status_code == 403


async def test_cashier_cannot_update_product_or_adjust_stock(client, db_session):
    create_response = await client.post("/api/v1/products", json={"name": "Cafe", "price": "10.00", "stock": 1})
    assert create_response.status_code == 201

    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    product_id = create_response.json()["id"]
    update_response = await client.patch(f"/api/v1/products/{product_id}", json={"name": "Cafe Especial"})
    stock_response = await client.patch(f"/api/v1/products/{product_id}/stock", json={"quantity": 1, "reason": "test"})

    assert update_response.status_code == 403
    assert stock_response.status_code == 403


async def test_cashier_cannot_manage_users(client, db_session):
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
    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.role = "cashier"
    await db_session.commit()

    list_response = await client.get("/api/v1/users")
    role_response = await client.patch(f"/api/v1/users/{cashier_id}/role", json={"role": "owner"})
    status_response = await client.patch(f"/api/v1/users/{cashier_id}/status", json={"is_active": False})

    assert list_response.status_code == 403
    assert role_response.status_code == 403
    assert status_response.status_code == 403


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
