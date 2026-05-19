from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from src.application.dto.report_dto import SalesReportDTO
from src.domain.repositories.sale_repository import ISaleRepository


@dataclass
class GetSalesReportInput:
    store_id: UUID
    from_date: datetime | None = None
    to_date: datetime | None = None


class GetSalesReportUseCase:
    MAX_RANGE_DAYS = 90

    def __init__(self, sale_repo: ISaleRepository):
        self._sale_repo = sale_repo

    async def execute(self, input: GetSalesReportInput) -> SalesReportDTO:
        now = datetime.now(UTC)
        to_date = self._ensure_aware(input.to_date) if input.to_date else now
        from_date = self._ensure_aware(input.from_date) if input.from_date else to_date - timedelta(days=7)

        if from_date > to_date:
            raise ValueError("La fecha inicial no puede ser posterior a la fecha final")
        if to_date - from_date > timedelta(days=self.MAX_RANGE_DAYS):
            raise ValueError("El rango maximo del reporte es 90 dias")

        summary = await self._sale_repo.sales_summary_for_range(input.store_id, from_date, to_date)
        by_payment_method = await self._sale_repo.totals_by_payment_method(input.store_id, from_date, to_date)
        top_products = await self._sale_repo.top_products(input.store_id, from_date, to_date, limit=10)

        return SalesReportDTO(
            from_date=from_date,
            to_date=to_date,
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
