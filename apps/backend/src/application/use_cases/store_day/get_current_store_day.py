from dataclasses import dataclass
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayResponseDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.store_day._business_date import local_business_date
from src.domain.entities.store_business_day import StoreBusinessDay
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class GetCurrentStoreDayInput:
    store_id: UUID


class GetCurrentStoreDayUseCase:
    def __init__(self, store_repo: IStoreRepository, business_day_repo: IStoreBusinessDayRepository):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo

    async def execute(self, input: GetCurrentStoreDayInput) -> StoreDayResponseDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        today = local_business_date(store.timezone)
        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            business_day = await self._business_day_repo.get_by_business_date(input.store_id, today)
        if business_day is None:
            return StoreDayResponseDTO(
                status="closed",
                business_date=today,
                timezone=store.timezone,
                first_business_date=store.first_business_date,
            )
        return _to_response(business_day, timezone=store.timezone, first_business_date=store.first_business_date)


def _to_response(
    business_day: StoreBusinessDay,
    *,
    timezone: str,
    first_business_date,
) -> StoreDayResponseDTO:
    return StoreDayResponseDTO(
        id=business_day.id,
        status=business_day.status,
        business_date=business_day.business_date,
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
        timezone=timezone,
        first_business_date=first_business_date,
    )
