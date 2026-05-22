from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from src.application.dto.exchange_rate_dto import ExchangeRateResponseDTO
from src.application.dto.product_dto import ProductResponseDTO
from src.application.dto.sale_dto import SaleResponseDTO


class DashboardSummaryDTO(BaseModel):
    sales_today_total: Decimal
    sales_today_count: int
    products_total: int
    low_stock_count: int
    out_of_stock_count: int
    latest_sales: list[SaleResponseDTO]
    low_stock_products: list[ProductResponseDTO]
    exchange_rates: list[ExchangeRateResponseDTO]
    scope: str = "today"
    from_date: date | None = None
    to_date: date | None = None
    timezone: str | None = None
    first_business_date: date | None = None
