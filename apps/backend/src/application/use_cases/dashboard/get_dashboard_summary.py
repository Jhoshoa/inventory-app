from datetime import UTC, datetime, time
from decimal import Decimal
from uuid import UUID

from src.application.dto.dashboard_dto import DashboardSummaryDTO
from src.domain.repositories.product_repository import IProductRepository
from src.domain.repositories.sale_repository import ISaleRepository
from src.infrastructure.database.repositories.exchange_rate_repository import ExchangeRateRepository


class GetDashboardSummaryUseCase:
    def __init__(
        self,
        product_repo: IProductRepository,
        sale_repo: ISaleRepository,
        exchange_rate_repo: ExchangeRateRepository,
    ):
        self._product_repo = product_repo
        self._sale_repo = sale_repo
        self._exchange_rate_repo = exchange_rate_repo

    async def execute(self, store_id: UUID) -> DashboardSummaryDTO:
        today = datetime.now(UTC).date()
        start = datetime.combine(today, time.min, tzinfo=UTC)
        end = datetime.combine(today, time.max, tzinfo=UTC)

        sales_summary = await self._sale_repo.sales_summary_for_range(store_id, start, end)
        latest_sales = await self._sale_repo.latest_sales(store_id, limit=5)
        low_stock_products = await self._product_repo.list_low_stock(store_id, limit=5)
        exchange_rates = await self._exchange_rate_repo.list_latest(limit=5)

        return DashboardSummaryDTO(
            sales_today_total=sales_summary.get("total_sales", Decimal("0")),
            sales_today_count=sales_summary.get("sales_count", 0),
            products_total=await self._product_repo.count_by_store(store_id),
            low_stock_count=await self._product_repo.count_low_stock(store_id),
            out_of_stock_count=await self._product_repo.count_out_of_stock(store_id),
            latest_sales=latest_sales,
            low_stock_products=low_stock_products,
            exchange_rates=exchange_rates,
        )
