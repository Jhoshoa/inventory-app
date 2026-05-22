from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from src.application.dto.store_day_dto import StoreDayResponseDTO
from src.application.exceptions import ConflictError, NotFoundError
from src.application.use_cases.store_day.get_current_store_day import _to_response
from src.domain.entities.store_business_day_event import StoreBusinessDayEvent
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.store_business_day_event_repository import IStoreBusinessDayEventRepository
from src.domain.repositories.store_business_day_repository import IStoreBusinessDayRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class CloseStoreDayInput:
    store_id: UUID
    closed_by_user_id: UUID
    closing_note: str | None = None
    counted_cash_amount: Decimal | None = None


class CloseStoreDayUseCase:
    def __init__(
        self,
        store_repo: IStoreRepository,
        business_day_repo: IStoreBusinessDayRepository,
        event_repo: IStoreBusinessDayEventRepository,
        sale_repo: ISaleRepository,
    ):
        self._store_repo = store_repo
        self._business_day_repo = business_day_repo
        self._event_repo = event_repo
        self._sale_repo = sale_repo

    async def execute(self, input: CloseStoreDayInput) -> StoreDayResponseDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        business_day = await self._business_day_repo.get_open_by_store(input.store_id)
        if business_day is None:
            raise ConflictError("No hay una jornada abierta para cerrar")

        summary = await self._sale_repo.sales_closing_summary_for_business_day(input.store_id, business_day.id)
        opening_cash = business_day.opening_cash_amount or Decimal("0")
        cash_sales = summary["cash_sales_total"]
        expected_cash = opening_cash + cash_sales
        counted_cash = input.counted_cash_amount
        cash_difference = counted_cash - expected_cash if counted_cash is not None else None
        business_day.close(
            closed_by_user_id=input.closed_by_user_id,
            closing_note=input.closing_note,
            sales_total=summary["total_sales"],
            sales_count=summary["sales_count"],
            voided_sales_count=summary["voided_sales_count"],
            items_count=summary["items_count"],
            cash_sales_total=summary["cash_sales_total"],
            qr_sales_total=summary["qr_sales_total"],
            transfer_sales_total=summary["transfer_sales_total"],
            card_sales_total=summary["card_sales_total"],
            expected_cash_amount=expected_cash,
            counted_cash_amount=counted_cash,
            cash_difference_amount=cash_difference,
        )
        closed = await self._business_day_repo.close(business_day)
        await self._event_repo.save(
            StoreBusinessDayEvent.create(
                business_day_id=closed.id,
                store_id=closed.store_id,
                event_type="close",
                created_by_user_id=input.closed_by_user_id,
                note=input.closing_note,
            )
        )
        return _to_response(closed, timezone=store.timezone, first_business_date=store.first_business_date)
