from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class StoreUpdateDTO(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    allow_percentage_discount: bool | None = None
    max_percentage_discount: Decimal | None = Field(default=None, ge=0, le=100)
    allow_manual_discount: bool | None = None
    max_manual_discount_amount: Decimal | None = Field(default=None, ge=0)
    allow_cashier_discount_override: bool | None = None


class StoreResponseDTO(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    phone: str | None = None
    is_active: bool
    allow_percentage_discount: bool = False
    max_percentage_discount: Decimal = Decimal(0)
    allow_manual_discount: bool = False
    max_manual_discount_amount: Decimal = Decimal(0)
    allow_cashier_discount_override: bool = False

    model_config = {"from_attributes": True}
