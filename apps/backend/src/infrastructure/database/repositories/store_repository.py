from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
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
        trial = store.trial_expires_at
        if trial is not None and trial.tzinfo is not None:
            trial = trial.replace(tzinfo=None)
        model.trial_expires_at = trial
        await self._session.flush()
        return store

    async def get_by_id(self, store_id: UUID) -> Store | None:
        model = await self._session.get(StoreModel, store_id)
        if model is None or not model.is_active:
            return None
        return self._to_entity(model)

    async def set_first_business_date(self, store_id: UUID, first_business_date: date) -> None:
        await self._session.execute(
            update(StoreModel)
            .where(StoreModel.id == store_id, StoreModel.first_business_date.is_(None))
            .values(first_business_date=first_business_date)
        )
        await self._session.flush()

    async def list_by_expired_trial(self, cutoff: datetime) -> list[Store]:
        stmt = select(StoreModel).where(
            StoreModel.trial_expires_at.isnot(None),
            StoreModel.trial_expires_at < cutoff,
            StoreModel.is_active.is_(True),
        )
        result = await self._session.execute(stmt)
        return [self._to_entity(row) for row in result.scalars()]

    @staticmethod
    def _to_entity(model: StoreModel) -> Store:
        trial = model.trial_expires_at
        if trial is not None and trial.tzinfo is None:
            trial = trial.replace(tzinfo=timezone.utc)
        return Store(
            id=model.id,
            name=model.name,
            address=model.address,
            phone=model.phone,
            is_active=model.is_active,
            timezone=model.timezone or "America/La_Paz",
            first_business_date=model.first_business_date,
            trial_expires_at=trial,
        )
