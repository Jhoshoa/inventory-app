from decimal import Decimal
from pydantic import BaseModel, Field
from datetime import datetime


class SaleItemDTO(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)


class CreateSaleDTO(BaseModel):
    items: list[SaleItemDTO]
    payment_method: str = "efectivo"


class SaleItemResponseDTO(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float


class SaleResponseDTO(BaseModel):
    id: str
    items: list[SaleItemResponseDTO]
    total: float
    payment_method: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
