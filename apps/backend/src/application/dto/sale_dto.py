from decimal import Decimal
from enum import StrEnum
from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime


class PaymentMethodDTO(StrEnum):
    EFECTIVO = "efectivo"
    QR = "qr"
    TRANSFERENCIA = "transferencia"
    TARJETA = "tarjeta"


class SaleItemDTO(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0)


class CreateSaleDTO(BaseModel):
    items: list[SaleItemDTO] = Field(..., min_length=1)
    payment_method: PaymentMethodDTO = PaymentMethodDTO.EFECTIVO
    device_id: str | None = Field(default=None, max_length=100)
    customer_name: str | None = Field(default=None, max_length=100)


class VoidSaleDTO(BaseModel):
    reason: str = Field(..., min_length=1, max_length=200)


class SaleItemResponseDTO(BaseModel):
    product_id: UUID
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = {"from_attributes": True}


class SaleResponseDTO(BaseModel):
    id: UUID
    items: list[SaleItemResponseDTO]
    total: Decimal
    payment_method: str
    status: str
    created_at: datetime
    voided_at: datetime | None = None
    void_reason: str | None = None

    model_config = {"from_attributes": True}
