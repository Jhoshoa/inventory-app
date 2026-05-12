from uuid import UUID
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.settings import settings
from src.infrastructure.database.session import get_session
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.sync_repository import SyncRepository
from src.infrastructure.database.repositories.store_repository import StoreRepository
from src.infrastructure.database.repositories.exchange_rate_repository import ExchangeRateRepository
from src.infrastructure.auth.supabase_auth import verify_jwt

security_scheme = HTTPBearer(auto_error=False)
DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
DEV_STORE_ID = UUID("00000000-0000-0000-0000-000000000101")


async def get_current_user(token: str = Depends(security_scheme)) -> dict:
    if settings.DEBUG and token is None:
        return {"id": DEV_USER_ID, "email": "dev@local.dev", "store_id": DEV_STORE_ID}
    if token is None:
        raise HTTPException(status_code=401, detail="Token requerido")
    try:
        payload = verify_jwt(token.credentials)
        if payload.get("store_id") is not None:
            payload["store_id"] = UUID(str(payload["store_id"]))
        if payload.get("id") is not None:
            payload["id"] = UUID(str(payload["id"]))
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


async def get_db_session():
    async with get_session() as session:
        yield session


def get_product_repo(session: AsyncSession = Depends(get_db_session)) -> ProductRepository:
    return ProductRepository(session)


def get_sale_repo(session: AsyncSession = Depends(get_db_session)) -> SaleRepository:
    return SaleRepository(session)


def get_sync_repo(session: AsyncSession = Depends(get_db_session)) -> SyncRepository:
    return SyncRepository(session)


def get_store_repo(session: AsyncSession = Depends(get_db_session)) -> StoreRepository:
    return StoreRepository(session)


def get_exchange_rate_repo(session: AsyncSession = Depends(get_db_session)) -> ExchangeRateRepository:
    return ExchangeRateRepository(session)
