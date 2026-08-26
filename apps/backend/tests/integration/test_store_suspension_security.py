from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

from src.application.exceptions import UnauthorizedError
from src.application.use_cases.auth.get_current_user_context import (
    GetCurrentUserContextUseCase,
)
from src.infrastructure.database.models import StoreModel, UserModel
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.presentation import dependencies


async def test_store_get_by_id_returns_suspended_store_instead_of_none(db_session):
    """Regresion del bug conocido: get_by_id filtraba por is_active y una
    tienda suspendida (is_active=False) se trataba como 'no encontrada' en
    vez de dejar que el llamador decida el bloqueo explicitamente."""
    store_repo = StoreRepository(db_session)
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "suspended")

    store = await store_repo.get_by_id(dependencies.DEV_STORE_ID)

    assert store is not None
    assert store.is_active is False
    assert store.access_status == "suspended"
    assert store.suspended_at is not None


async def test_update_access_status_to_active_clears_suspended_at(db_session):
    store_repo = StoreRepository(db_session)
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "suspended")
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "active")

    store = await store_repo.get_by_id(dependencies.DEV_STORE_ID)

    assert store.is_active is True
    assert store.access_status == "active"
    assert store.suspended_at is None


async def test_get_current_user_context_rejects_suspended_store_even_if_user_is_active(db_session):
    store_repo = StoreRepository(db_session)
    user_repo = UserRepository(db_session)
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "suspended")

    use_case = GetCurrentUserContextUseCase(user_repo, store_repo)
    try:
        await use_case.execute({"id": str(dependencies.DEV_USER_ID)})
        assert False, "deberia haber lanzado UnauthorizedError"
    except UnauthorizedError as exc:
        assert "suspendida" in exc.detail


async def test_get_current_user_context_rejects_store_with_is_active_false_but_access_status_active(db_session):
    """Caso de desincronizacion: si algo dejara access_status='active' pero
    is_active=False, igual debe bloquear (no confiar en un solo campo)."""
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.is_active = False
    store.access_status = "active"
    await db_session.commit()

    store_repo = StoreRepository(db_session)
    user_repo = UserRepository(db_session)
    use_case = GetCurrentUserContextUseCase(user_repo, store_repo)

    try:
        await use_case.execute({"id": str(dependencies.DEV_USER_ID)})
        assert False, "deberia haber lanzado UnauthorizedError"
    except UnauthorizedError:
        pass


async def test_get_current_user_context_allows_active_store(db_session):
    store_repo = StoreRepository(db_session)
    user_repo = UserRepository(db_session)
    use_case = GetCurrentUserContextUseCase(user_repo, store_repo)

    context = await use_case.execute({"id": str(dependencies.DEV_USER_ID)})

    assert context.id == dependencies.DEV_USER_ID


async def test_login_rejects_suspended_store_even_via_supabase_path(client, db_session, monkeypatch):
    """Prueba end-to-end del bug: antes, get_by_id devolvia None para una
    tienda con is_active=False, lo cual saltaba por completo el bloqueo de
    suspension en el endpoint de login de produccion."""
    from src.presentation.api.v1 import auth as auth_module

    store_repo = StoreRepository(db_session)
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "suspended")

    user = await db_session.get(UserModel, dependencies.DEV_USER_ID)
    user.email = "suspended-owner@example.com"
    await db_session.commit()

    fake_session = SimpleNamespace(access_token="tok-123", refresh_token="ref-123")
    fake_user = SimpleNamespace(
        id=str(dependencies.DEV_USER_ID),
        email="suspended-owner@example.com",
        user_metadata={
            "store_id": str(dependencies.DEV_STORE_ID),
            "store_name": "Dev Store",
            "full_name": "Dev User",
            "role": "owner",
        },
    )
    fake_response = SimpleNamespace(session=fake_session, user=fake_user)

    class FakeAuth:
        def sign_in_with_password(self, _payload):
            return fake_response

    class FakeSupabaseClient:
        auth = FakeAuth()

    monkeypatch.setattr(auth_module, "get_supabase_client", lambda: FakeSupabaseClient())
    monkeypatch.setattr(auth_module.settings, "DEBUG", False)

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "suspended-owner@example.com", "password": "whatever-123"},
    )

    assert response.status_code == 401
    assert "suspendida" in response.json()["detail"]


async def test_refresh_token_rejects_suspended_store(client, db_session, monkeypatch):
    from src.presentation.api.v1 import auth as auth_module

    store_repo = StoreRepository(db_session)
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "suspended")

    fake_session = SimpleNamespace(access_token="tok-456", refresh_token="ref-456")
    fake_user = SimpleNamespace(
        id=str(dependencies.DEV_USER_ID),
        email="dev@local.dev",
        user_metadata={
            "store_id": str(dependencies.DEV_STORE_ID),
            "store_name": "Dev Store",
            "full_name": "Dev User",
            "role": "owner",
        },
    )
    fake_response = SimpleNamespace(session=fake_session, user=fake_user)

    class FakeAuth:
        def refresh_session(self, _refresh_token):
            return fake_response

    class FakeSupabaseClient:
        auth = FakeAuth()

    monkeypatch.setattr(auth_module, "get_supabase_client", lambda: FakeSupabaseClient())
    monkeypatch.setattr(auth_module.settings, "DEBUG", False)

    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "some-refresh-token"},
    )

    assert response.status_code == 401
    assert "suspendida" in response.json()["detail"]


async def test_archive_stores_moves_long_suspended_stores_to_archived(db_session):
    from src.application.use_cases.trials.archive_stores import ArchiveStoresUseCase

    store_repo = StoreRepository(db_session)
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.access_status = "suspended"
    store.is_active = False
    store.suspended_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=120)
    await db_session.commit()

    count = await ArchiveStoresUseCase(store_repo).execute()

    assert count == 1
    archived = await store_repo.get_by_id(dependencies.DEV_STORE_ID)
    assert archived.access_status == "archived"
    assert archived.archived_at is not None


async def test_archive_stores_ignores_recently_suspended_stores(db_session):
    from src.application.use_cases.trials.archive_stores import ArchiveStoresUseCase

    store_repo = StoreRepository(db_session)
    await store_repo.update_access_status(dependencies.DEV_STORE_ID, "suspended")

    count = await ArchiveStoresUseCase(store_repo).execute()

    assert count == 0
    store = await store_repo.get_by_id(dependencies.DEV_STORE_ID)
    assert store.access_status == "suspended"


async def test_archived_store_data_is_not_deleted(db_session):
    """El archivado nunca borra datos: solo cambia access_status."""
    from src.application.use_cases.trials.archive_stores import ArchiveStoresUseCase

    product_id = uuid4()
    from src.infrastructure.database.models import ProductModel

    db_session.add(
        ProductModel(
            id=product_id,
            store_id=dependencies.DEV_STORE_ID,
            name="Producto historico",
            price="10.00",
            stock=5,
        )
    )
    store_repo = StoreRepository(db_session)
    store = await db_session.get(StoreModel, dependencies.DEV_STORE_ID)
    store.access_status = "suspended"
    store.is_active = False
    store.suspended_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=120)
    await db_session.commit()

    await ArchiveStoresUseCase(store_repo).execute()

    product = await db_session.get(ProductModel, product_id)
    assert product is not None
    assert product.name == "Producto historico"
