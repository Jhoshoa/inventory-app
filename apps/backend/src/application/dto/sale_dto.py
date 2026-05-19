from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime


class SaleItemDTO(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class CreateSaleDTO(BaseModel):
    items: list[SaleItemDTO] = Field(..., min_length=1)
    payment_method: str = "efectivo"
    device_id: str | None = Field(default=None, max_length=100)
    customer_name: str | None = Field(default=None, max_length=100)


class SaleItemResponseDTO(BaseModel):
    product_id: UUID
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class SaleResponseDTO(BaseModel):
    id: UUID
    items: list[SaleItemResponseDTO]
    total: Decimal
    payment_method: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
