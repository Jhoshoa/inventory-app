from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.exceptions import ForbiddenError, UnauthorizedError
from src.application.use_cases.auth.ensure_local_user import (
    EnsureLocalUserInput,
    EnsureLocalUserUseCase,
)
from src.application.use_cases.auth.get_current_user_context import (
    CurrentUserContext,
    GetCurrentUserContextUseCase,
)
from src.config.settings import settings
from src.domain.entities.store import Store
from src.infrastructure.auth.supabase_auth import verify_jwt
from src.infrastructure.database.repositories.cash_movement_repository import (
    CashMovementRepository,
)
from src.infrastructure.database.repositories.exchange_rate_repository import (
    ExchangeRateRepository,
)
from src.infrastructure.database.repositories.import_job_repository import (
    ImportJobRepository,
)
from src.infrastructure.database.repositories.product_category_repository import (
    ProductCategoryRepository,
)
from src.infrastructure.database.repositories.product_repository import (
    ProductRepository,
)
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.stock_movement_repository import (
    StockMovementRepository,
)
from src.infrastructure.database.repositories.store_business_day_event_repository import (
    StoreBusinessDayEventRepository,
)
from src.infrastructure.database.repositories.store_business_day_repository import (
    StoreBusinessDayRepository,
)
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.sync_repository import SyncRepository
from src.infrastructure.database.repositories.user_repository import UserRepository
from src.infrastructure.database.session import get_session

security_scheme = HTTPBearer(auto_error=False)
DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEV_CASHIER_USER_ID = UUID("00000000-0000-0000-0000-000000000002")
DEV_STORE_ID = UUID("00000000-0000-0000-0000-000000000101")
DEV_ACCESS_TOKEN = "dev-token-123"
DEV_CASHIER_ACCESS_TOKEN = "dev-cashier-token-123"


async def get_db_session():
    async with get_session() as session:
        yield session


def get_user_repo(session: AsyncSession = Depends(get_db_session)) -> UserRepository:
    return UserRepository(session)


async def get_current_user(
    token: str = Depends(security_scheme),
    user_repo: UserRepository = Depends(get_user_repo),
) -> dict:
    if settings.DEBUG and token is None:
        return {
            "id": DEV_USER_ID,
            "email": "dev@local.dev",
            "store_id": DEV_STORE_ID,
            "full_name": "Dev User",
            "role": "owner",
        }
    if token is None:
        raise HTTPException(status_code=401, detail="Token requerido")
    if settings.DEBUG and token.credentials == DEV_ACCESS_TOKEN:
        return {
            "id": DEV_USER_ID,
            "email": "dev@local.dev",
            "store_id": DEV_STORE_ID,
            "full_name": "Dev User",
            "role": "owner",
        }
    if settings.DEBUG and token.credentials == DEV_CASHIER_ACCESS_TOKEN:
        return {
            "id": DEV_CASHIER_USER_ID,
            "email": "cashier@local.dev",
            "store_id": DEV_STORE_ID,
            "full_name": "Demo Cashier",
            "role": "cashier",
        }
    try:
        payload = verify_jwt(token.credentials)
        if payload.get("store_id") is not None:
            payload["store_id"] = UUID(str(payload["store_id"]))
        elif payload.get("id") is not None:
            user = await user_repo.get_by_id(UUID(str(payload["id"])))
            if user is not None and user.store_id is not None:
                payload["store_id"] = user.store_id
        if payload.get("id") is not None:
            payload["id"] = UUID(str(payload["id"]))
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


def get_product_repo(session: AsyncSession = Depends(get_db_session)) -> ProductRepository:
    return ProductRepository(session)


def get_product_category_repo(session: AsyncSession = Depends(get_db_session)) -> ProductCategoryRepository:
    return ProductCategoryRepository(session)


def get_sale_repo(session: AsyncSession = Depends(get_db_session)) -> SaleRepository:
    return SaleRepository(session)


def get_sync_repo(session: AsyncSession = Depends(get_db_session)) -> SyncRepository:
    return SyncRepository(session)


def get_store_repo(session: AsyncSession = Depends(get_db_session)) -> StoreRepository:
    return StoreRepository(session)


def get_store_business_day_repo(session: AsyncSession = Depends(get_db_session)) -> StoreBusinessDayRepository:
    return StoreBusinessDayRepository(session)


def get_store_business_day_event_repo(session: AsyncSession = Depends(get_db_session)) -> StoreBusinessDayEventRepository:
    return StoreBusinessDayEventRepository(session)


def get_exchange_rate_repo(session: AsyncSession = Depends(get_db_session)) -> ExchangeRateRepository:
    return ExchangeRateRepository(session)


def get_import_job_repo(session: AsyncSession = Depends(get_db_session)) -> ImportJobRepository:
    return ImportJobRepository(session)


def get_stock_movement_repo(session: AsyncSession = Depends(get_db_session)) -> StockMovementRepository:
    return StockMovementRepository(session)


def get_cash_movement_repo(session: AsyncSession = Depends(get_db_session)) -> CashMovementRepository:
    return CashMovementRepository(session)


async def get_current_user_context(
    raw_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repo),
    store_repo: StoreRepository = Depends(get_store_repo),
) -> CurrentUserContext:
    try:
        use_case = GetCurrentUserContextUseCase(
            user_repo,
            store_repo if not settings.DEBUG else None,
        )
        return await use_case.execute(raw_user)
    except UnauthorizedError as exc:
        if not settings.DEBUG or exc.detail != "Usuario local no encontrado":
            raise
        user_id = UUID(str(raw_user["id"]))
        user = await user_repo.get_by_id(user_id)
        if user is not None:
            return CurrentUserContext(
                id=user.id,
                email=user.email,
                store_id=user.store_id,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
            )
        store_id = raw_user.get("store_id")
        if store_id is None:
            store_id = DEV_STORE_ID
        store = await store_repo.get_by_id(UUID(str(store_id)))
        if store is None:
            await store_repo.save(Store(id=UUID(str(store_id)), name="Dev Store"))
        user = await EnsureLocalUserUseCase(user_repo, store_repo).execute(
            EnsureLocalUserInput(
                user_id=user_id,
                email=str(raw_user.get("email") or "dev@local.dev"),
                store_id=UUID(str(store_id)),
                full_name=raw_user.get("full_name"),
                role=str(raw_user.get("role") or "owner"),
            )
        )
        return CurrentUserContext(
            id=user.id,
            email=user.email,
            store_id=user.store_id,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
        )


async def require_active_user(user: CurrentUserContext = Depends(get_current_user_context)) -> CurrentUserContext:
    if not user.is_active:
        raise UnauthorizedError("Usuario inactivo")
    return user


async def require_owner(user: CurrentUserContext = Depends(require_active_user)) -> CurrentUserContext:
    if user.role != "owner":
        raise ForbiddenError("Permiso requerido: owner")
    return user
