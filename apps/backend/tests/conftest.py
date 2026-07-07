from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.config.settings import settings
from src.infrastructure.database import models as _models
from src.infrastructure.database.models import StoreModel, UserModel
from src.infrastructure.database.models.product_model import Base
from src.main import app
from src.presentation import dependencies

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
_ = _models


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        session.add(
            StoreModel(
                id=dependencies.DEV_STORE_ID,
                name="Dev Store",
                address="Av. Siempre Viva",
                phone="70000000",
            )
        )
        session.add(
            UserModel(
                id=dependencies.DEV_USER_ID,
                email="dev@local.dev",
                store_id=dependencies.DEV_STORE_ID,
                full_name="Dev User",
                role="owner",
                is_active=True,
            )
        )
        await session.commit()
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    original_debug = settings.DEBUG
    original_environment = settings.ENVIRONMENT
    settings.DEBUG = True
    settings.ENVIRONMENT = "test"

    async def override_db_session():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    async def override_current_user():
        return {
            "id": dependencies.DEV_USER_ID,
            "email": "dev@local.dev",
            "store_id": dependencies.DEV_STORE_ID,
        }

    app.dependency_overrides[dependencies.get_db_session] = override_db_session
    app.dependency_overrides[dependencies.get_current_user] = override_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client

    app.dependency_overrides.clear()
    settings.DEBUG = original_debug
    settings.ENVIRONMENT = original_environment
