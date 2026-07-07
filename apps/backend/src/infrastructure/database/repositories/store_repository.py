from datetime import date
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.store import Store
from src.domain.repositories.store_repository import IStoreRepository
from src.infrastructure.database.models.store_model import StoreModel


class StoreRepository(IStoreRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, store: Store) -> Store:
        model = await self._session.get(StoreModel, store.id)
        if model is None:
            model = StoreModel(id=store.id)
            self._session.add(model)
        model.name = store.name
        model.address = store.address
        model.phone = store.phone
        model.is_active = store.is_active
        model.timezone = store.timezone
        model.first_business_date = store.first_business_date
        await self._session.flush()
        return store

    async def get_by_id(self, store_id: UUID) -> Store | None:
        model = await self._session.get(StoreModel, store_id)
        if model is None or not model.is_active:
            return None
        return Store(
            id=model.id,
            name=model.name,
            address=model.address,
            phone=model.phone,
            is_active=model.is_active,
            timezone=model.timezone or "America/La_Paz",
            first_business_date=model.first_business_date,
        )

    async def set_first_business_date(self, store_id: UUID, first_business_date: date) -> None:
        await self._session.execute(
            update(StoreModel)
            .where(StoreModel.id == store_id, StoreModel.first_business_date.is_(None))
            .values(first_business_date=first_business_date)
        )
        await self._session.flush()
