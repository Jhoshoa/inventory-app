from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID

from src.application.dto.dashboard_dto import DashboardSummaryDTO
from src.application.exceptions import NotFoundError
from src.application.use_cases.date_ranges import BusinessDateRangeService
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.sale_repository import ISaleRepository
from src.domain.repositories.store_repository import IStoreRepository
from src.infrastructure.database.repositories.exchange_rate_repository import ExchangeRateRepository


@dataclass
class GetDashboardSummaryInput:
    store_id: UUID
    scope: str = "today"
    from_date: date | None = None
    to_date: date | None = None


class GetDashboardSummaryUseCase:
    def __init__(
        self,
        product_repo: IProductRepository,
        sale_repo: ISaleRepository,
        exchange_rate_repo: ExchangeRateRepository,
        store_repo: IStoreRepository,
        date_ranges: BusinessDateRangeService | None = None,
    ):
        self._product_repo = product_repo
        self._sale_repo = sale_repo
        self._exchange_rate_repo = exchange_rate_repo
        self._store_repo = store_repo
        self._date_ranges = date_ranges or BusinessDateRangeService()

    async def execute(self, input: GetDashboardSummaryInput) -> DashboardSummaryDTO:
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
            )
            scope = "custom"
        elif input.scope == "month":
            date_range = self._date_ranges.month(store.timezone, first_business_date=store.first_business_date)
            scope = "month"
        elif input.scope == "today":
            date_range = self._date_ranges.today(store.timezone, first_business_date=store.first_business_date)
            scope = "today"
        else:
            raise ValueError("Scope de dashboard invalido")

        sales_summary = await self._sale_repo.sales_summary_for_range(
            input.store_id,
            date_range.start_at_utc,
            date_range.end_at_utc,
        )
        latest_sales = await self._sale_repo.latest_sales_for_range(
            input.store_id,
            date_range.start_at_utc,
            date_range.end_at_utc,
            limit=5,
        )
        low_stock_products = await self._product_repo.list_low_stock(input.store_id, limit=5)
        exchange_rates = await self._exchange_rate_repo.list_latest(limit=5)

        return DashboardSummaryDTO(
            sales_today_total=sales_summary.get("total_sales", Decimal("0")),
            sales_today_count=sales_summary.get("sales_count", 0),
            products_total=await self._product_repo.count_by_store(input.store_id),
            low_stock_count=await self._product_repo.count_low_stock(input.store_id),
            out_of_stock_count=await self._product_repo.count_out_of_stock(input.store_id),
            latest_sales=latest_sales,
            low_stock_products=low_stock_products,
            exchange_rates=exchange_rates,
            scope=scope,
            from_date=date_range.from_date,
            to_date=date_range.to_date,
            timezone=date_range.timezone,
            first_business_date=store.first_business_date,
        )
