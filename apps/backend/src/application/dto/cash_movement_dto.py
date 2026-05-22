from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CreateCashMovementDTO(BaseModel):
    movement_type: str = Field(max_length=30)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    note: str | None = Field(default=None, max_length=255)


class VoidCashMovementDTO(BaseModel):
    void_reason: str = Field(min_length=1, max_length=255)


class CashMovementResponseDTO(BaseModel):
    id: UUID
    store_id: UUID
    business_day_id: UUID
    movement_type: str
    direction: str
    amount: Decimal
    note: str | None = None
    created_by_user_id: UUID
    occurred_at: datetime
    created_at: datetime
    voided_at: datetime | None = None
    voided_by_user_id: UUID | None = None
    void_reason: str | None = None


class CashMovementListResponseDTO(BaseModel):
    items: list[CashMovementResponseDTO]
    total: int
    limit: int
    offset: int
    from_date: date | None = None
    to_date: date | None = None
