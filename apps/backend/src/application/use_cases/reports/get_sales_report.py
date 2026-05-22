from dataclasses import dataclass
from datetime import UTC, date, datetime
from uuid import UUID

from src.application.dto.report_dto import SalesReportDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.date_ranges import BusinessDateRangeService
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.store_repository import IStoreRepository


@dataclass
class GetSalesReportInput:
    store_id: UUID
    from_date: date | None = None
    to_date: date | None = None
    legacy_from: datetime | None = None
    legacy_to: datetime | None = None


class GetSalesReportUseCase:
    def __init__(
        self,
        sale_repo: ISaleRepository,
        store_repo: IStoreRepository,
        date_ranges: BusinessDateRangeService | None = None,
    ):
        self._sale_repo = sale_repo
        self._store_repo = store_repo
        self._date_ranges = date_ranges or BusinessDateRangeService()

    async def execute(self, input: GetSalesReportInput) -> SalesReportDTO:
        store = await self._store_repo.get_by_id(input.store_id)
        if store is None:
            raise NotFoundError("Tienda no encontrada")

        if input.from_date or input.to_date:
            from_date = input.from_date or input.to_date
            to_date = input.to_date or input.from_date
            if from_date is None or to_date is None:
                raise ValueError("Rango de fechas invalido")
            date_range = self._date_ranges.custom(
                from_date,
                to_date,
                store.timezone,
                first_business_date=store.first_business_date,
                clamp_to_first_business_date=True,
            )
            start_at = date_range.start_at_utc
            end_at = date_range.end_at_utc
            response_from = date_range.from_date
            response_to = date_range.to_date
        elif input.legacy_from or input.legacy_to:
            start_at = self._ensure_aware(input.legacy_from) if input.legacy_from else datetime.now(UTC)
            end_at = self._ensure_aware(input.legacy_to) if input.legacy_to else datetime.now(UTC)
            date_range = self._date_ranges.custom(start_at.date(), end_at.date(), store.timezone)
            if start_at > end_at:
                raise ValueError("La fecha inicial no puede ser posterior a la fecha final")
            if (end_at - start_at).days > self._date_ranges.MAX_RANGE_DAYS:
                raise ValueError("El rango maximo del reporte es 90 dias")
            response_from = start_at
            response_to = end_at
        else:
            date_range = self._date_ranges.month(store.timezone, first_business_date=store.first_business_date)
            start_at = date_range.start_at_utc
            end_at = date_range.end_at_utc
            response_from = date_range.from_date
            response_to = date_range.to_date

        summary = await self._sale_repo.sales_summary_for_range(input.store_id, start_at, end_at)
        by_payment_method = await self._sale_repo.totals_by_payment_method(input.store_id, start_at, end_at)
        top_products = await self._sale_repo.top_products(input.store_id, start_at, end_at, limit=10)

        return SalesReportDTO(
            from_date=response_from,
            to_date=response_to,
            total_sales=summary["total_sales"],
            sales_count=summary["sales_count"],
            items_count=summary["items_count"],
            by_payment_method=by_payment_method,
            top_products=top_products,
        )

    def _ensure_aware(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value
