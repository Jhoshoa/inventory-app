from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from src.domain.value_objects.phone import normalize_phone



class CreateStorefrontRequestDTO(BaseModel):
    customer_name: str = Field(min_length=2, max_length=150)
    customer_phone: str = Field(min_length=7, max_length=30)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("El nombre es requerido")
        return normalized

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


MAX_ORDER_LINES = 30
MAX_LINE_QUANTITY = 999


class StorefrontOrderLineInputDTO(BaseModel):
    product_id: UUID
    quantity: int = Field(ge=1, le=MAX_LINE_QUANTITY)


class CreateStorefrontOrderDTO(CreateStorefrontRequestDTO):
    """Boleta del catalogo: varios productos en un solo pedido. Solo viajan
    ids y cantidades; nombres y precios los pone el backend."""

    items: list[StorefrontOrderLineInputDTO] = Field(min_length=1, max_length=MAX_ORDER_LINES)
    delivery_method: Literal["pickup", "delivery"] | None = None


class StorefrontRequestItemDTO(BaseModel):
    product_id: UUID | None
    product_name: str
    unit: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class StorefrontOrderResponseDTO(BaseModel):
    """Lo que ve el cliente al enviar su boleta: el detalle con precios reales."""

    id: UUID
    items: list[StorefrontRequestItemDTO]
    total: Decimal
    delivery_method: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class StorefrontRequestResponseDTO(BaseModel):
    id: UUID
    product_id: UUID | None
    product_name: str
    customer_name: str
    customer_phone: str
    note: str | None
    status: str
    payment_confirmed: bool
    created_at: datetime
    items: list[StorefrontRequestItemDTO] = Field(default_factory=list)
    total: Decimal | None = None
    delivery_method: str | None = None

    model_config = {"from_attributes": True}


class StorefrontRequestListResponseDTO(BaseModel):
    items: list[StorefrontRequestResponseDTO]
    total: int
    pending_count: int
    limit: int
    offset: int


class UpdateStorefrontRequestStatusDTO(BaseModel):
    status: Literal["contacted", "closed", "pending"]


class UpdateStorefrontRequestPaymentDTO(BaseModel):
    payment_confirmed: bool
