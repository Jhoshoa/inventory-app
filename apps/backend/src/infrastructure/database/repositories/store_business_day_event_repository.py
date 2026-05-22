from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.store_business_day_event import StoreBusinessDayEvent
from src.domain.repositories.store_business_day_event_repository import IStoreBusinessDayEventRepository
from src.infrastructure.database.models.store_business_day_event_model import StoreBusinessDayEventModel


class StoreBusinessDayEventRepository(IStoreBusinessDayEventRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, event: StoreBusinessDayEvent) -> StoreBusinessDayEvent:
        model = StoreBusinessDayEventModel(
            id=event.id,
            business_day_id=event.business_day_id,
            store_id=event.store_id,
            event_type=event.event_type,
            note=event.note,
            created_by_user_id=event.created_by_user_id,
            created_at=event.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def list_by_business_day(self, store_id: UUID, business_day_id: UUID) -> list[StoreBusinessDayEvent]:
        result = await self._session.execute(
            select(StoreBusinessDayEventModel)
            .where(
                StoreBusinessDayEventModel.store_id == store_id,
                StoreBusinessDayEventModel.business_day_id == business_day_id,
            )
            .order_by(StoreBusinessDayEventModel.created_at.asc(), StoreBusinessDayEventModel.id.asc())
        )
        return [self._to_entity(model) for model in result.scalars().all()]

    def _to_entity(self, model: StoreBusinessDayEventModel) -> StoreBusinessDayEvent:
        return StoreBusinessDayEvent(
            id=model.id,
            business_day_id=model.business_day_id,
            store_id=model.store_id,
            event_type=model.event_type,
            note=model.note,
            created_by_user_id=model.created_by_user_id,
            created_at=model.created_at,
        )
