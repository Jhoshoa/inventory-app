from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SalesByPaymentMethodDTO(BaseModel):
    payment_method: str
    total: Decimal
    count: int


class TopProductDTO(BaseModel):
    product_id: UUID
    product_name: str
    quantity: int
    total: Decimal


class SalesReportDTO(BaseModel):
    from_date: datetime
    to_date: datetime
    total_sales: Decimal
    sales_count: int
    items_count: int
    by_payment_method: list[SalesByPaymentMethodDTO]
    top_products: list[TopProductDTO]
