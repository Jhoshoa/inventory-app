from datetime import date
from uuid import UUID

from sqlalchemy import func, select
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
            opening_cash_amount=business_day.opening_cash_amount,
            expected_cash_amount=business_day.expected_cash_amount,
            counted_cash_amount=business_day.counted_cash_amount,
            cash_difference_amount=business_day.cash_difference_amount,
            closing_sales_total=business_day.closing_sales_total,
            closing_sales_count=business_day.closing_sales_count,
            closing_voided_sales_count=business_day.closing_voided_sales_count,
            closing_items_count=business_day.closing_items_count,
            closing_cash_sales_total=business_day.closing_cash_sales_total,
            closing_qr_sales_total=business_day.closing_qr_sales_total,
            closing_transfer_sales_total=business_day.closing_transfer_sales_total,
            closing_card_sales_total=business_day.closing_card_sales_total,
            closing_snapshot_at=business_day.closing_snapshot_at,
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

    async def get_by_id(self, store_id: UUID, business_day_id: UUID) -> StoreBusinessDay | None:
        result = await self._session.execute(
            select(StoreBusinessDayModel).where(
                StoreBusinessDayModel.store_id == store_id,
                StoreBusinessDayModel.id == business_day_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_date_range(
        self,
        store_id: UUID,
        from_date: date,
        to_date: date,
        limit: int,
        offset: int,
    ) -> tuple[list[StoreBusinessDay], int]:
        filters = [
            StoreBusinessDayModel.store_id == store_id,
            StoreBusinessDayModel.business_date >= from_date,
            StoreBusinessDayModel.business_date <= to_date,
        ]
        total_result = await self._session.execute(select(func.count(StoreBusinessDayModel.id)).where(*filters))
        result = await self._session.execute(
            select(StoreBusinessDayModel)
            .where(*filters)
            .order_by(StoreBusinessDayModel.business_date.desc())
            .limit(limit)
            .offset(offset)
        )
        return [self._to_entity(model) for model in result.scalars().all()], int(total_result.scalar_one() or 0)

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
        model.opening_cash_amount = business_day.opening_cash_amount
        model.expected_cash_amount = business_day.expected_cash_amount
        model.counted_cash_amount = business_day.counted_cash_amount
        model.cash_difference_amount = business_day.cash_difference_amount
        model.closing_sales_total = business_day.closing_sales_total
        model.closing_sales_count = business_day.closing_sales_count
        model.closing_voided_sales_count = business_day.closing_voided_sales_count
        model.closing_items_count = business_day.closing_items_count
        model.closing_cash_sales_total = business_day.closing_cash_sales_total
        model.closing_qr_sales_total = business_day.closing_qr_sales_total
        model.closing_transfer_sales_total = business_day.closing_transfer_sales_total
        model.closing_card_sales_total = business_day.closing_card_sales_total
        model.closing_snapshot_at = business_day.closing_snapshot_at
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
            opening_cash_amount=model.opening_cash_amount,
            expected_cash_amount=model.expected_cash_amount,
            counted_cash_amount=model.counted_cash_amount,
            cash_difference_amount=model.cash_difference_amount,
            closing_sales_total=model.closing_sales_total,
            closing_sales_count=model.closing_sales_count,
            closing_voided_sales_count=model.closing_voided_sales_count,
            closing_items_count=model.closing_items_count,
            closing_cash_sales_total=model.closing_cash_sales_total,
            closing_qr_sales_total=model.closing_qr_sales_total,
            closing_transfer_sales_total=model.closing_transfer_sales_total,
            closing_card_sales_total=model.closing_card_sales_total,
            closing_snapshot_at=model.closing_snapshot_at,
            sales_total=model.sales_total,
            sales_count=model.sales_count,
            voided_sales_count=model.voided_sales_count,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
