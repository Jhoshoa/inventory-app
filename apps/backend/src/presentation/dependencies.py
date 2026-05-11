from uuid import uuid4
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from src.config.settings import settings
from src.infrastructure.database.session import get_session
from src.infrastructure.database.repositories.product_repository import ProductRepository
from src.infrastructure.database.repositories.sale_repository import SaleRepository
from src.infrastructure.database.repositories.sync_repository import SyncRepository
from src.infrastructure.auth.supabase_auth import verify_jwt

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(token: str = Depends(security_scheme)) -> dict:
    if settings.DEBUG and token is None:
        return {"id": str(uuid4()), "email": "dev@local.dev", "store_id": str(uuid4())}
    if token is None:
        raise HTTPException(status_code=401, detail="Token requerido")
    try:
        return verify_jwt(token.credentials)
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
