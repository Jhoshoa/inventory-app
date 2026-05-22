from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.store_business_day import StoreBusinessDay
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.infrastructure.database.models.store_business_day_model import StoreBusinessDayModel


class StoreBusinessDayRepository(IStoreBusinessDayRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, business_day: StoreBusinessDay) -> StoreBusinessDay:
        model = StoreBusinessDayModel(
            id=business_day.id,
            store_id=business_day.store_id,
            business_date=business_day.business_date,
            status=business_day.status,
            opened_at=business_day.opened_at,
            closed_at=business_day.closed_at,
            opened_by_user_id=business_day.opened_by_user_id,
            closed_by_user_id=business_day.closed_by_user_id,
            opening_note=business_day.opening_note,
            closing_note=business_day.closing_note,
            sales_total=business_day.sales_total,
            sales_count=business_day.sales_count,
            voided_sales_count=business_day.voided_sales_count,
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def get_open_by_store(self, store_id: UUID) -> StoreBusinessDay | None:
        result = await self._session.execute(
            select(StoreBusinessDayModel).where(
                StoreBusinessDayModel.store_id == store_id,
                StoreBusinessDayModel.status == "open",
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_business_date(self, store_id: UUID, business_date: date) -> StoreBusinessDay | None:
        result = await self._session.execute(
            select(StoreBusinessDayModel).where(
                StoreBusinessDayModel.store_id == store_id,
                StoreBusinessDayModel.business_date == business_date,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def close(self, business_day: StoreBusinessDay) -> StoreBusinessDay:
        return await self._update_existing(business_day)

    async def reopen(self, business_day: StoreBusinessDay) -> StoreBusinessDay:
        return await self._update_existing(business_day)

    async def _update_existing(self, business_day: StoreBusinessDay) -> StoreBusinessDay:
        model = await self._session.get(StoreBusinessDayModel, business_day.id)
        if model is None:
            raise ValueError("Jornada no encontrada")
        model.status = business_day.status
        model.opened_at = business_day.opened_at
        model.opened_by_user_id = business_day.opened_by_user_id
        model.closed_at = business_day.closed_at
        model.closed_by_user_id = business_day.closed_by_user_id
        model.opening_note = business_day.opening_note
        model.closing_note = business_day.closing_note
        model.sales_total = business_day.sales_total
        model.sales_count = business_day.sales_count
        model.voided_sales_count = business_day.voided_sales_count
        await self._session.flush()
        return self._to_entity(model)

    def _to_entity(self, model: StoreBusinessDayModel) -> StoreBusinessDay:
        return StoreBusinessDay(
            id=model.id,
            store_id=model.store_id,
            business_date=model.business_date,
            status=model.status,
            opened_at=model.opened_at,
            closed_at=model.closed_at,
            opened_by_user_id=model.opened_by_user_id,
            closed_by_user_id=model.closed_by_user_id,
            opening_note=model.opening_note,
            closing_note=model.closing_note,
            sales_total=model.sales_total,
            sales_count=model.sales_count,
            voided_sales_count=model.voided_sales_count,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
